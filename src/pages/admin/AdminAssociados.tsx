import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, UserCheck, UserX, KeyRound, ChevronDown, ChevronUp,
  AlertCircle, ArrowLeft, CheckCircle, Upload, Users, ShieldCheck,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import type { Associado } from '@/types/database'

interface AdminInfo {
  user_id: string
  email: string
  nome: string
  cpf: string
}

export default function AdminAssociados() {
  const navigate = useNavigate()

  const [associados, setAssociados]         = useState<Associado[]>([])
  const [admins, setAdmins]                 = useState<AdminInfo[]>([])
  const [carregando, setCarregando]         = useState(true)
  const [erro, setErro]                     = useState('')
  const [busca, setBusca]                   = useState('')
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const [mostrarAdmins, setMostrarAdmins]   = useState(false)
  const [confirmando, setConfirmando]       = useState<{
    id: string; tipo: 'inativar' | 'ativar' | 'senha'
  } | null>(null)
  const [processando, setProcessando]       = useState(false)
  const [feedback, setFeedback]             = useState('')
  const [importando, setImportando]         = useState(false)
  const [resultadoImport, setResultadoImport] = useState<{
    criados: number; atualizados: number; inativados: number; erros: unknown[]
  } | null>(null)

  const carregarDados = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const [{ data: assocData, error: assocError }, { data: adminsData }] =
        await Promise.all([
          supabase.from('associados').select('*').order('nome'),
          supabase.rpc('listar_admins'),
        ])

      if (assocError) {
        if (assocError.code === 'PGRST301' || assocError.message?.includes('JWT')) {
          window.location.href = '/entrar'
          return
        }
        setErro('Não foi possível carregar os associados.')
        return
      }

      setAssociados((assocData as Associado[]) ?? [])
      setAdmins((adminsData as AdminInfo[]) ?? [])
    } catch {
      setErro('Erro de conexão. Verifique sua internet.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void (async () => { await carregarDados() })()
  }, [carregarDados])

  // IDs dos admins para excluir da lista de associados comuns
  const adminIds = new Set(admins.map(a => a.user_id))

  const filtrados = associados.filter(a => {
    const termo = busca.toLowerCase()
    const naoEAdmin = !adminIds.has(a.user_id ?? '')
    const matchBusca =
      a.nome.toLowerCase().includes(termo) ||
      a.cpf.includes(termo.replace(/\D/g, ''))
    return naoEAdmin && matchBusca
  })

  const ativos   = filtrados.filter(a => a.ativo)
  const inativos = filtrados.filter(a => !a.ativo)

  function formatarCpf(cpf: string) {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  function mostrarFeedback(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 3000)
  }

  async function handleAtivarInativar(associado: Associado) {
    setProcessando(true)
    const { error } = await supabase
      .from('associados')
      .update({ ativo: !associado.ativo })
      .eq('id', associado.id)

    if (error) {
      mostrarFeedback('Erro ao atualizar. Tente novamente.')
    } else {
      setAssociados(prev =>
        prev.map(a => a.id === associado.id ? { ...a, ativo: !a.ativo } : a)
      )
      mostrarFeedback(
        associado.ativo
          ? `${associado.nome.split(' ')[0]} inativado.`
          : `${associado.nome.split(' ')[0]} reativado.`
      )
    }
    setProcessando(false)
    setConfirmando(null)
  }

  async function handleRedefinirSenha(associado: Associado) {
    setProcessando(true)
    const { data, error } = await supabase.rpc('admin_redefinir_senha', {
      p_cpf: associado.cpf,
    })

    if (error || data !== 'Senha redefinida com sucesso') {
      mostrarFeedback('Erro ao redefinir senha.')
    } else {
      setAssociados(prev =>
        prev.map(a => a.id === associado.id ? { ...a, primeiro_acesso: true } : a)
      )
      mostrarFeedback(`Senha de ${associado.nome.split(' ')[0]} redefinida para o CPF.`)
    }
    setProcessando(false)
    setConfirmando(null)
  }

  // Importação de base via CSV/Excel
  async function handleImportacao(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return

    setImportando(true)
    setResultadoImport(null)

    try {
      let registros: unknown[] = []

      if (arquivo.name.endsWith('.csv')) {
        const texto = await arquivo.text()
        const linhas = texto.trim().split('\n')
        const cabecalho = linhas[0].split(',').map(c => c.trim().replace(/"/g, ''))
        registros = linhas.slice(1).map(linha => {
          const valores = linha.split(',').map(v => v.trim().replace(/"/g, ''))
          return Object.fromEntries(cabecalho.map((c, i) => [c, valores[i]]))
        })
      } else {
        mostrarFeedback('Formato não suportado. Use CSV.')
        setImportando(false)
        return
      }

      const { data, error } = await supabase.rpc('importar_base_associados', {
        p_associados: registros,
        p_inativar_ausentes: true,
        p_importado_por: null,
        p_observacao: `Importação via painel — ${arquivo.name}`,
      })

      if (error) {
        mostrarFeedback('Erro na importação. Verifique o arquivo.')
      } else {
        setResultadoImport(data)
        await carregarDados()
        mostrarFeedback(`Importação concluída: ${data.criados} criados, ${data.atualizados} atualizados, ${data.inativados} inativados.`)
      }
    } catch {
      mostrarFeedback('Erro ao processar o arquivo.')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  function CardAssociado({ associado }: { associado: Associado }) {
    return (
      <div className={`bg-white rounded-2xl shadow-card border border-surface-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${!associado.ativo ? 'opacity-60' : ''}`}>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-gray-800 text-base">{associado.nome}</span>
            {associado.primeiro_acesso && (
              <span className="badge-amber">Aguardando 1º acesso</span>
            )}
            {!associado.ativo && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                Inativo
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span>ID associado #{associado.nr_inscricao}</span>
            <span>CPF: {formatarCpf(associado.cpf)}</span>
            {associado.empresa && <span>{associado.empresa}</span>}
            {associado.celular && <span>{associado.celular}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Ver dependentes */}
          <button
            title="Ver dependentes"
            onClick={() => navigate(`/admin/dependentes/${associado.id}`)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#16a34a' }}
          >
            <Users size={16} />
          </button>

          {/* Redefinir senha */}
          <button
            title="Redefinir senha para CPF"
            onClick={() => setConfirmando({ id: associado.id, tipo: 'senha' })}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#16a34a' }}
          >
            <KeyRound size={16} />
          </button>

          {/* Ativar / Inativar */}
          {associado.ativo ? (
            <button
              title="Inativar associado"
              onClick={() => setConfirmando({ id: associado.id, tipo: 'inativar' })}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white bg-red-500 hover:bg-red-600 transition-colors"
            >
              <UserX size={16} />
            </button>
          ) : (
            <button
              title="Reativar associado"
              onClick={() => setConfirmando({ id: associado.id, tipo: 'ativar' })}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#16a34a' }}
            >
              <UserCheck size={16} />
            </button>
          )}
        </div>

        {/* Modal confirmação */}
        {confirmando?.id === associado.id && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-modal p-8 max-w-sm w-full mx-4 text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmando.tipo === 'inativar' ? 'bg-red-100' : 'bg-green-100'}`}>
                {confirmando.tipo === 'senha' ? (
                  <KeyRound size={22} className="text-green-700" />
                ) : confirmando.tipo === 'inativar' ? (
                  <UserX size={22} className="text-red-600" />
                ) : (
                  <UserCheck size={22} className="text-green-700" />
                )}
              </div>
              <h2 className="font-display text-lg font-bold text-gray-800 mb-2">
                {confirmando.tipo === 'senha' ? 'Redefinir senha?' :
                 confirmando.tipo === 'inativar' ? 'Inativar associado?' : 'Reativar associado?'}
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                {confirmando.tipo === 'senha' ? (
                  <>A senha de <strong>{associado.nome.split(' ')[0]}</strong> será redefinida para o CPF e será solicitada nova senha no próximo acesso.</>
                ) : confirmando.tipo === 'inativar' ? (
                  <><strong>{associado.nome.split(' ')[0]}</strong> não poderá se inscrever em novos eventos, mas mantém acesso às suas inscrições existentes.</>
                ) : (
                  <><strong>{associado.nome.split(' ')[0]}</strong> voltará a ter acesso completo ao sistema.</>
                )}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmando(null)} disabled={processando} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button
                  disabled={processando}
                  onClick={() => confirmando.tipo === 'senha'
                    ? handleRedefinirSenha(associado)
                    : handleAtivarInativar(associado)
                  }
                  className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm transition-colors"
                  style={{ backgroundColor: confirmando.tipo === 'inativar' ? '#ef4444' : '#16a34a' }}
                >
                  {processando ? 'Aguarde...' :
                   confirmando.tipo === 'senha' ? 'Redefinir' :
                   confirmando.tipo === 'inativar' ? 'Inativar' : 'Reativar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />

      {/* Toast */}
      {feedback && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-800 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg animate-fade-in">
          <CheckCircle size={16} className="text-green-400" />
          {feedback}
        </div>
      )}

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-28 pb-12">

        {/* Voltar */}
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Voltar para eventos
        </button>

        {/* Título + ações */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="font-display text-2xl font-bold text-gray-800">Associados</h1>
          <div className="flex items-center gap-3">
            {/* Importar base */}
            <label
              className={`flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl transition-colors cursor-pointer hover:opacity-90 ${importando ? 'opacity-60 cursor-wait' : ''}`}
              style={{ backgroundColor: '#16a34a' }}
            >
              <Upload size={16} />
              {importando ? 'Importando...' : 'Importar base'}
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportacao}
                disabled={importando}
              />
            </label>
          </div>
        </div>

        {/* Resultado da importação */}
        {resultadoImport && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-6 text-sm text-green-800">
            <p className="font-semibold mb-1">Importação realizada com sucesso</p>
            <p>{resultadoImport.criados} criados · {resultadoImport.atualizados} atualizados · {resultadoImport.inativados} inativados · {resultadoImport.erros?.length ?? 0} erros</p>
          </div>
        )}

        {/* Formato esperado */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-6 text-xs text-blue-700">
          <strong>Formato CSV esperado:</strong> nr_inscricao, nome, cpf, celular, empresa, data_nascimento
          <br />Associados ausentes na nova base serão inativados automaticamente.
        </div>

        {/* Busca */}
        <div className="relative w-full sm:w-72 mb-8">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou CPF..."
            className="field pl-9 w-full"
          />
        </div>

        {/* Loading */}
        {carregando && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Erro */}
        {!carregando && erro && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle size={22} className="text-red-600" />
            </div>
            <p className="text-gray-600 text-sm">{erro}</p>
            <button onClick={carregarDados} className="btn-primary" style={{ backgroundColor: '#16a34a' }}>
              Tentar novamente
            </button>
          </div>
        )}

        {/* Associados ativos */}
        {!carregando && !erro && (
          <div className="flex flex-col gap-3">
            {ativos.length === 0 && (
              <p className="text-center text-gray-500 py-12">Nenhum associado encontrado.</p>
            )}
            {ativos.map(a => <CardAssociado key={a.id} associado={a} />)}
          </div>
        )}

        {/* Associados inativos */}
        {!carregando && !erro && inativos.length > 0 && (
          <div className="mt-10">
            <button
              onClick={() => setMostrarInativos(!mostrarInativos)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-4"
            >
              {mostrarInativos ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Associados inativos ({inativos.length})
            </button>
            {mostrarInativos && (
              <div className="flex flex-col gap-3">
                {inativos.map(a => <CardAssociado key={a.id} associado={a} />)}
              </div>
            )}
          </div>
        )}

        {/* Administradores */}
        {!carregando && !erro && (
          <div className="mt-10">
            <button
              onClick={() => setMostrarAdmins(!mostrarAdmins)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-4"
            >
              {mostrarAdmins ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              <ShieldCheck size={16} />
              Administradores ({admins.length})
            </button>
            {mostrarAdmins && (
              <div className="flex flex-col gap-3">
                {admins.map(admin => (
                  <div key={admin.user_id} className="bg-white rounded-2xl shadow-card border border-surface-200 px-6 py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800">{admin.nome}</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Admin
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>CPF: {formatarCpf(admin.cpf)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}