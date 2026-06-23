import * as XLSX from 'xlsx';

export const COLUNAS_ASSOCIADOS = [
  'NRINSCRICAO_S', 'NMSOCIO_S', 'NRCELULAR_S', 'NRCPF_S', 'DTNASCIMENTO_S', 'NMEMPRESA_E',
] as const;

export const COLUNAS_DEPENDENTES = [
  'NRINSCRSOC_D', 'NRSEQUENCIADEP_D', 'NMDEPENDENTE_D', 'DTNASCIMENTO_D', 'NRCPF_D',
] as const;

export class ErroPlanilha extends Error {}

export interface LinhaPlanilha { numero: number; valores: Record<string, unknown>; }
export interface ResultadoLeitura { cabecalho: string[]; colunasFaltando: string[]; linhas: LinhaPlanilha[]; }
export interface ErroLinha { linha: number; identificador: string; motivos: string[]; }
export interface ResultadoValidacao<T> { validos: T[]; erros: ErroLinha[]; totalLinhas: number; }

export interface RegistroAssociado {
  nr_inscricao: number | null; nome: string; celular: string;
  cpf: string; data_nascimento: string | null; empresa: string;
}
export interface RegistroDependente {
  nr_inscricao_socio: number; nr_sequencia: number; nome: string;
  data_nascimento: string | null; cpf: string | null;
}

export function normalizarCpf(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '');
}
export function cpfValido(cpf: string): boolean {
  return /^\d{11}$/.test(cpf);
}

function pad2(n: number) { return String(n).padStart(2, '0'); }
function pad4(n: number) { return String(n).padStart(4, '0'); }
function isoLocal(d: Date) { return `${pad4(d.getFullYear())}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }

function validarISO(iso: string): { iso: string | null; erro: string | null } {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d) {
    return { iso, erro: null };
  }
  return { iso: null, erro: 'data inexistente' };
}

export function parseDataParaISO(v: unknown): { iso: string | null; erro: string | null } {
  if (v === undefined || v === null || String(v).trim() === '') return { iso: null, erro: null };
  if (v instanceof Date && !isNaN(v.getTime())) return { iso: isoLocal(v), erro: null };
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (d && d.y) return { iso: `${pad4(d.y)}-${pad2(d.m)}-${pad2(d.d)}`, erro: null };
    return { iso: null, erro: 'data inválida' };
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return validarISO(`${m[3]}-${m[2]}-${m[1]}`);
  m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return validarISO(`${m[3]}-${m[2]}-${m[1]}`);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return validarISO(s);
  return { iso: null, erro: 'formato não reconhecido (use DD/MM/AAAA)' };
}

export async function lerPlanilha(file: File, colunasEsperadas: readonly string[]): Promise<ResultadoLeitura> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    throw new ErroPlanilha('O arquivo precisa ser .xlsx (Excel). CSV e outros formatos não são aceitos.');
  }
  let wb: XLSX.WorkBook;
  try {
    const buffer = await file.arrayBuffer();
    wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  } catch {
    throw new ErroPlanilha('Não foi possível ler o arquivo. Confirme que é um .xlsx válido e não está corrompido.');
  }
  const nomeAba = wb.SheetNames[0];
  if (!nomeAba) throw new ErroPlanilha('A planilha está vazia.');
  const ws = wb.Sheets[nomeAba];
  const matriz = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, blankrows: false });
  if (matriz.length === 0) throw new ErroPlanilha('A planilha não contém dados.');

  const cabecalho = (matriz[0] as unknown[]).map((c) => String(c ?? '').trim());
  const colunasFaltando = colunasEsperadas.filter((c) => !cabecalho.includes(c));
  const indice: Record<string, number> = {};
  for (const c of colunasEsperadas) indice[c] = cabecalho.indexOf(c);

  const linhas: LinhaPlanilha[] = [];
  for (let i = 1; i < matriz.length; i++) {
    const linha = matriz[i] as unknown[];
    const vazia = colunasEsperadas.every((c) => {
      const v = indice[c] >= 0 ? linha[indice[c]] : undefined;
      return v === undefined || v === null || String(v).trim() === '';
    });
    if (vazia) continue;
    const valores: Record<string, unknown> = {};
    for (const c of colunasEsperadas) valores[c] = indice[c] >= 0 ? linha[indice[c]] : undefined;
    linhas.push({ numero: i + 1, valores });
  }
  return { cabecalho, colunasFaltando, linhas };
}

export function validarAssociados(linhas: LinhaPlanilha[]): ResultadoValidacao<RegistroAssociado> {
  const validos: RegistroAssociado[] = [];
  const erros: ErroLinha[] = [];
  const cpfsVistos = new Map<string, number>();

  for (const l of linhas) {
    const motivos: string[] = [];
    const txt = (k: string) => String(l.valores[k] ?? '').trim();

    const nome = txt('NMSOCIO_S');
    const cpf = normalizarCpf(l.valores['NRCPF_S']);
    const celular = txt('NRCELULAR_S').replace(/\D/g, '');
    const empresa = txt('NMEMPRESA_E');
    const inscDig = txt('NRINSCRICAO_S').replace(/\D/g, '');
    const nr_inscricao = inscDig === '' ? null : parseInt(inscDig, 10);
    const dataRes = parseDataParaISO(l.valores['DTNASCIMENTO_S']);

    if (!nome) motivos.push('Nome (NMSOCIO_S) vazio');
    if (nr_inscricao === null) motivos.push('Inscrição (NRINSCRICAO_S) vazia ou inválida');
    if (!cpf) motivos.push('CPF (NRCPF_S) vazio');
    else if (!cpfValido(cpf)) motivos.push('CPF (NRCPF_S) deve ter 11 dígitos');
    if (dataRes.erro) motivos.push(`Data de nascimento: ${dataRes.erro}`);

    if (cpf && cpfValido(cpf)) {
      const anterior = cpfsVistos.get(cpf);
      if (anterior) motivos.push(`CPF repetido na planilha (linha ${anterior})`);
      else cpfsVistos.set(cpf, l.numero);
    }

    if (motivos.length > 0) {
      erros.push({ linha: l.numero, identificador: nome || cpf || `linha ${l.numero}`, motivos });
      continue;
    }
    validos.push({ nr_inscricao, nome, celular, cpf, data_nascimento: dataRes.iso, empresa });
  }
  return { validos, erros, totalLinhas: linhas.length };
}

export function validarDependentes(
  linhas: LinhaPlanilha[],
  nrInscricaoExistentes: Set<number>,
): ResultadoValidacao<RegistroDependente> {
  const validos: RegistroDependente[] = [];
  const erros: ErroLinha[] = [];
  const chavesVistas = new Map<string, number>();
  const cpfsVistos = new Map<string, number>();

  for (const l of linhas) {
    const motivos: string[] = [];
    const txt = (k: string) => String(l.valores[k] ?? '').trim();

    const nome = txt('NMDEPENDENTE_D');
    const socioDig = txt('NRINSCRSOC_D').replace(/\D/g, '');
    const seqDig = txt('NRSEQUENCIADEP_D').replace(/\D/g, '');
    const socio = socioDig === '' ? null : parseInt(socioDig, 10);
    const seq = seqDig === '' ? null : parseInt(seqDig, 10);
    const cpfRaw = normalizarCpf(l.valores['NRCPF_D']);
    const cpf = cpfRaw === '' ? null : cpfRaw;
    const dataRes = parseDataParaISO(l.valores['DTNASCIMENTO_D']);

    if (!nome) motivos.push('Nome (NMDEPENDENTE_D) vazio');
    if (socio === null) motivos.push('Inscrição do titular (NRINSCRSOC_D) vazia');
    if (seq === null) motivos.push('Sequência (NRSEQUENCIADEP_D) vazia');
    if (cpf && !cpfValido(cpf)) motivos.push('CPF (NRCPF_D) deve ter 11 dígitos');
    if (dataRes.erro) motivos.push(`Data de nascimento: ${dataRes.erro}`);
    if (socio !== null && !nrInscricaoExistentes.has(socio)) {
      motivos.push(`Titular (inscrição ${socio}) não encontrado nos associados`);
    }
    if (socio !== null && seq !== null) {
      const chave = `${socio}-${seq}`;
      const anterior = chavesVistas.get(chave);
      if (anterior) motivos.push(`Dependente repetido na planilha (titular ${socio}, seq. ${seq}) — linha ${anterior}`);
      else chavesVistas.set(chave, l.numero);
    }
    if (cpf && cpfValido(cpf)) {
      const anterior = cpfsVistos.get(cpf);
      if (anterior) motivos.push(`CPF repetido na planilha (linha ${anterior})`);
      else cpfsVistos.set(cpf, l.numero);
    }

    if (motivos.length > 0) {
      erros.push({ linha: l.numero, identificador: nome || `linha ${l.numero}`, motivos });
      continue;
    }
    validos.push({
      nr_inscricao_socio: socio as number, nr_sequencia: seq as number,
      nome, data_nascimento: dataRes.iso, cpf,
    });
  }
  return { validos, erros, totalLinhas: linhas.length };
}

function baixarModelo(colunas: readonly string[], nomeAba: string, nomeArquivo: string, instrucoes: string[][]) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([colunas as string[]]), nomeAba);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instrucoes), 'Instruções');
  XLSX.writeFile(wb, nomeArquivo);
}

export function gerarModeloAssociados() {
  baixarModelo(COLUNAS_ASSOCIADOS, 'Associados', 'modelo_importacao_associados.xlsx', [
    ['Coluna', 'Descrição', 'Obrigatório', 'Exemplo'],
    ['NRINSCRICAO_S', 'Número de inscrição do associado', 'Sim', '1024'],
    ['NMSOCIO_S', 'Nome completo do associado', 'Sim', 'João da Silva'],
    ['NRCELULAR_S', 'Celular (somente números)', 'Não', '11999998888'],
    ['NRCPF_S', 'CPF com 11 dígitos', 'Sim', '12345678901'],
    ['DTNASCIMENTO_S', 'Data de nascimento (DD/MM/AAAA)', 'Não', '15/03/1985'],
    ['NMEMPRESA_E', 'Empresa do associado', 'Não', 'Secoomed'],
    [],
    ['Obs.', 'A senha inicial de cada associado é o próprio CPF; a troca é exigida no 1º acesso.'],
  ]);
}

export function gerarModeloDependentes() {
  baixarModelo(COLUNAS_DEPENDENTES, 'Dependentes', 'modelo_importacao_dependentes.xlsx', [
    ['Coluna', 'Descrição', 'Obrigatório', 'Exemplo'],
    ['NRINSCRSOC_D', 'Inscrição do TITULAR (deve existir nos associados)', 'Sim', '1024'],
    ['NRSEQUENCIADEP_D', 'Sequência do dependente dentro do titular', 'Sim', '1'],
    ['NMDEPENDENTE_D', 'Nome completo do dependente', 'Sim', 'Maria da Silva'],
    ['DTNASCIMENTO_D', 'Data de nascimento (DD/MM/AAAA)', 'Não', '20/07/2015'],
    ['NRCPF_D', 'CPF do dependente com 11 dígitos (se houver)', 'Não', '98765432100'],
    [],
    ['Obs.', 'Importe os ASSOCIADOS antes. Dependente cujo titular não exista será reportado como erro.'],
  ]);
}