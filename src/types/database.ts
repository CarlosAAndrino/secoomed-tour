export interface Associado {
  id: string
  nr_inscricao: number
  nome: string
  cpf: string
  celular: string | null
  data_nascimento: string | null
  empresa: string | null
  ativo: boolean
  user_id: string | null
  primeiro_acesso: boolean
}

export interface Dependente {
  id: string
  associado_id: string
  nr_sequencia: number
  nome: string
  cpf: string | null
  data_nascimento: string | null
  idade?: number | null
  eventos_futuros_inscritos?: number
}

export interface Evento {
  id: string
  destino: string
  data_evento: string
  inicio_inscricao: string
  fim_inscricao: string
  vagas_totais: number
  vagas_disponiveis: number
  aceita_dependente: boolean
  limite_convidado: number
  valor_titular: number
  valor_dependente: number | null
  valor_convidado: number | null
  created_at: string
}

export interface EventoLista extends Evento {
  percentual_ocupacao: number
  total_inscritos: number
  status_evento: 'aberto' | 'em_breve' | 'encerrado' | 'realizado'
  dias_ate_evento: number
  titular_inscrito: boolean
  pode_cancelar: boolean
  data_limite_cancelamento: string
}

export interface Inscricao {
  id: string
  evento_id: string
  associado_id: string
  dependente_id: string | null
  tipo_participante: 'titular' | 'dependente' | 'convidado'
  nome_convidado: string | null
  cpf_convidado: string | null
  status: 'confirmada' | 'cancelada'
  created_at: string
}

export interface MinhaInscricao {
  inscricao_id: string
  status: 'confirmada' | 'cancelada'
  tipo_participante: 'titular' | 'dependente' | 'convidado'
  inscrito_em: string
  dependente_id: string | null
  associado_id: string
  evento_id: string
  evento_destino: string
  data_evento: string
  inicio_inscricao: string
  fim_inscricao: string
  status_evento: 'aberto' | 'em_breve' | 'encerrado' | 'realizado'
  participante_nome: string
  participante_cpf: string | null
  valor_inscricao: number | null
  pode_cancelar: boolean
  data_limite_cancelamento: string
}

export interface InscricaoEvento {
  inscricao_id: string
  evento_id: string
  status: 'confirmada' | 'cancelada'
  tipo_participante: 'titular' | 'dependente' | 'convidado'
  inscrito_em: string
  evento_destino: string
  data_evento: string
  associado_id: string
  nr_inscricao: number
  associado_nome: string
  associado_cpf: string
  associado_celular: string | null
  associado_empresa: string | null
  participante_nome: string
  participante_cpf: string | null
  dependente_id: string | null
  valor_inscricao: number | null
}

export interface AdminDashboard {
  total_associados: number
  associados_ativos: number
  associados_inativos: number
  pendentes_primeiro_acesso: number
  total_eventos: number
  eventos_futuros: number
  eventos_com_inscricao_aberta: number
  inscricoes_confirmadas: number
  inscricoes_canceladas: number
  total_importacoes: number
  ultima_importacao_em: string | null
}

export type TipoParticipante = 'titular' | 'dependente' | 'convidado'

export interface ParticipanteInscricao {
  tipo: TipoParticipante
  dependente_id?: string
  nome?: string
  cpf?: string
}