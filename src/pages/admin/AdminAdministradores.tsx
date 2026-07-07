import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, ShieldCheck, ShieldOff, KeyRound,
  AlertCircle, CheckCircle, Crown, Shield,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AdminItem {
  user_id: string
  email: string
  nome: string
  cpf: string
  admin_role: 'master' | 'standard'
  criado_em: string
  ativo: boolean
}

type ModalTipo = 'criar' | 'tornar_master' | 'tornar_standard' | 'desativar' | 'ativar' | 'senha'

interface ModalState {
  tipo: ModalTipo
  admin?: AdminItem
}

function formatarCpf(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// ─── CardAdmin ────────────────────────────────────────────────────────────────

interface CardAdminProps {
  admin: AdminItem
  isMaster: boolean       // o usuário atual é master?
  currentUserId: string
  onAcao: (tipo: ModalTipo, admin: AdminItem) => void
}

function CardAdmin({ admin, isMaster, currentUserId, onAcao }: CardAdminProps) {
  const ehEuMesmo = admin.user_id === currentUserId

  return (
    <div className={`bg-white rounded-2xl shadow-card border border-surface-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
      !admin.ativo ? 'opacity-60' : ''
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-semibold text-gray-800 text-base">{admin.nome}</span>

          {admin.admin_role === 'master' ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              <Crown size={11} /> Master Admin
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              <Shield size={11} /> Administrador
            </span>
          )}

          {!admin.ativo && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              Inativo
            </span>
          )}

          {ehEuMesmo && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
              Você
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          <span>CPF: {formatarCpf(admin.cpf)}</span>
          <span>Login: {admin.email}</span>
          <span>Desde {formatarData(admin.criado_em)}</span>
        </div>
      </div>

      {/* Ações: apenas para master, e nunca sobre si mesmo */}
      {isMaster && !ehEuMesmo && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            title="Redefinir senha para CPF"
            onClick={() => onAcao('senha', admin)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#16a34a' }}
          >
            <KeyRound size={16} />
          </button>

          {admin.admin_role === 'standard' ? (
            <button
              title="Tornar Master Admin"
              onClick={() => onAcao('tornar_master', admin)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white bg-amber-500 hover:bg-amber-600 transition-colors"
            >
              <Crown size={16} />
            </button>
          ) : (
            <button
              title="Rebaixar para Administrador padrão"
              onClick={() => onAcao('tornar_standard', admin)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white bg-gray-400 hover:bg-gray-500 transition-colors"
            >
              <ShieldOff size={16} />
            </button>
          )}

          {admin.ativo ? (
            <button
              title="Desativar administrador"
              onClick={() => onAcao('desativar', admin)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white bg-red-500 hover:bg-red-600 transition-colors"
            >
              <ShieldOff size={16} />
            </button>
          ) : (
            <button
              title="Reativar administrador"
              onClick={() => onAcao('ativar', admin)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-colors"
              style={{ backgroundColor: '#16a34a' }}
            >
              <ShieldCheck size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Modal de confirmação ─────────────────────────────────────────────────────

interface ModalConfirmacaoProps {
  modal: ModalState
  processando: boolean
  cpfNovo: string
  setCpfNovo: (v: string) => void
  nomeNovo: string
  setNomeNovo: (v: string) => void
  onConfirmar: () => void
  onCancelar: () => void
}

function ModalConfirmacao({
  modal, processando, cpfNovo, setCpfNovo, nomeNovo, setNomeNovo, onConfirmar, onCancelar,
}: ModalConfirmacaoProps) {
  const { tipo, admin } = modal

  const config: Record<ModalTipo, { titulo: string; texto: string; corBtn: string; labelBtn: string }> = {
    criar: {
      titulo: 'Novo Administrador',
      texto: 'Preencha os dados. A senha inicial será o próprio CPF e será solicitada a troca no 1º acesso.',
      corBtn: '#16a34a', labelBtn: 'Criar Administrador',
    },
    tornar_master: {
      titulo: 'Tornar Master Admin?',
      texto: `${admin?.nome} passará a ter permissão de Master Admin, podendo gerenciar outros administradores.`,
      corBtn: '#f59e0b', labelBtn: 'Confirmar',
    },
    tornar_standard: {
      titulo: 'Rebaixar para Administrador?',
      texto: `${admin?.nome} passará a ser um Administrador padrão, sem poder alterar outros admins.`,
      corBtn: '#6b7280', labelBtn: 'Confirmar',
    },
    desativar: {
      titulo: 'Desativar administrador?',
      texto: `${admin?.nome} perderá o acesso ao sistema. Você poderá reativar a qualquer momento.`,
      corBtn: '#ef4444', labelBtn: 'Desativar',
    },
    ativar: {
      titulo: 'Reativar administrador?',
      texto: `${admin?.nome} voltará a ter acesso completo ao sistema.`,
      corBtn: '#16a34a', labelBtn: 'Reativar',
    },
    senha: {
      titulo: 'Redefinir senha?',
      texto: `A senha de ${admin?.nome} será redefinida para o CPF e será solicitada nova senha no próximo acesso.`,
      corBtn: '#16a34a', labelBtn: 'Redefinir',
    },
  }

  const c = config[tipo]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-modal p-8 max-w-sm w-full mx-4">
        <h2 className="font-display text-lg font-bold text-gray-800 mb-2 text-center">{c.titulo}</h2>
        <p className="text-gray-500 text-sm mb-6 text-center">{c.texto}</p>

        {tipo === 'criar' && (
          <div className="flex flex-col gap-3 mb-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">CPF</label>
              <input
                type="text"
                placeholder="Somente números"
                value={cpfNovo}
                onChange={e => setCpfNovo(e.target.value.replace(/\D/g, '').slice(0, 11))}
                className="field w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nome completo</label>
              <input
                type="text"
                placeholder="Nome do administrador"
                value={nomeNovo}
                onChange={e => setNomeNovo(e.target.value)}
                className="field w-full"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onCancelar} disabled={processando} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={processando || (tipo === 'criar' && (cpfNovo.length !== 11 || !nomeNovo.trim()))}
            className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm transition-colors disabled:opacity-50"
            style={{ backgroundColor: c.corBtn }}
          >
            {processando ? 'Aguarde...' : c.labelBtn}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminAdministradores() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [admins, setAdmins] = useState<AdminItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [isMaster, setIsMaster] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [processando, setProcessando] = useState(false)
  const [cpfNovo, setCpfNovo] = useState('')
  const [nomeNovo, setNomeNovo] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const currentUserId = user?.id ?? ''

  // ─── Carrega lista (qualquer admin pode chamar) ───────────────────────────
  useEffect(() => {
    let mounted = true

    const buscar = async () => {
      setCarregando(true)
      setErro('')
      const { data, error } = await supabase.rpc('listar_admins_detalhado')
      if (!mounted) return

      if (error) {
        setErro('Não foi possível carregar os administradores.')
        setCarregando(false)
        return
      }

      const lista = (data as AdminItem[]) ?? []
      setAdmins(lista)

      // Detecta se o usuário atual é master com base nos dados retornados
      const eu = lista.find(a => a.user_id === currentUserId)
      setIsMaster(eu?.admin_role === 'master')

      setCarregando(false)
    }
    buscar()

    return () => { mounted = false }
  }, [reloadKey, currentUserId])

  function mostrarFeedback(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 3500)
  }

  function abrirModal(tipo: ModalTipo, admin?: AdminItem) {
    setCpfNovo('')
    setNomeNovo('')
    setModal({ tipo, admin })
  }

  async function handleConfirmar() {
    if (!modal) return
    setProcessando(true)

    try {
      switch (modal.tipo) {
        case 'criar': {
          const { error } = await supabase.rpc('criar_admin', {
            p_cpf: cpfNovo, p_nome: nomeNovo.trim(),
          })
          if (error) { mostrarFeedback('Erro: ' + error.message); break }
          mostrarFeedback(`Administrador ${nomeNovo.trim()} criado com sucesso.`)
          setReloadKey(k => k + 1)
          break
        }
        case 'tornar_master': {
          const { error } = await supabase.rpc('alterar_role_admin', {
            p_user_id: modal.admin!.user_id, p_novo_role: 'master',
          })
          if (error) { mostrarFeedback('Erro: ' + error.message); break }
          mostrarFeedback(`${modal.admin!.nome} agora é Master Admin.`)
          setReloadKey(k => k + 1)
          break
        }
        case 'tornar_standard': {
          const { error } = await supabase.rpc('alterar_role_admin', {
            p_user_id: modal.admin!.user_id, p_novo_role: 'standard',
          })
          if (error) { mostrarFeedback('Erro: ' + error.message); break }
          mostrarFeedback(`${modal.admin!.nome} agora é Administrador padrão.`)
          setReloadKey(k => k + 1)
          break
        }
        case 'desativar': {
          const { error } = await supabase.rpc('desativar_ativar_admin', {
            p_user_id: modal.admin!.user_id, p_ativo: false,
          })
          if (error) { mostrarFeedback('Erro: ' + error.message); break }
          mostrarFeedback(`${modal.admin!.nome} foi desativado.`)
          setReloadKey(k => k + 1)
          break
        }
        case 'ativar': {
          const { error } = await supabase.rpc('desativar_ativar_admin', {
            p_user_id: modal.admin!.user_id, p_ativo: true,
          })
          if (error) { mostrarFeedback('Erro: ' + error.message); break }
          mostrarFeedback(`${modal.admin!.nome} foi reativado.`)
          setReloadKey(k => k + 1)
          break
        }
        case 'senha': {
          const { data, error } = await supabase.rpc('admin_redefinir_senha', {
            p_cpf: modal.admin!.cpf,
          })
          if (error || data !== 'Senha redefinida com sucesso') {
            mostrarFeedback('Erro ao redefinir senha.')
            break
          }
          mostrarFeedback(`Senha de ${modal.admin!.nome} redefinida para o CPF.`)
          break
        }
      }
    } finally {
      setProcessando(false)
      setModal(null)
    }
  }

  const ativos = admins.filter(a => a.ativo)
  const inativos = admins.filter(a => !a.ativo)

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />

      {feedback && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-800 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg animate-fade-in">
          <CheckCircle size={16} className="text-green-400" />
          {feedback}
        </div>
      )}

      {modal && (
        <ModalConfirmacao
          modal={modal}
          processando={processando}
          cpfNovo={cpfNovo}
          setCpfNovo={setCpfNovo}
          nomeNovo={nomeNovo}
          setNomeNovo={setNomeNovo}
          onConfirmar={handleConfirmar}
          onCancelar={() => setModal(null)}
        />
      )}

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-28 pb-12">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Voltar para eventos
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1 className="font-display text-2xl font-bold text-gray-800">Administradores</h1>

          {/* Botão de criar: só aparece para master */}
          {isMaster && (
            <button
              onClick={() => abrirModal('criar')}
              className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl transition-colors hover:opacity-90"
              style={{ backgroundColor: '#16a34a' }}
            >
              <Plus size={16} /> Novo Administrador
            </button>
          )}
        </div>

        {/* Aviso para admin padrão */}
        {!isMaster && !carregando && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-6 text-sm text-blue-700">
            Você está em modo somente leitura. Apenas o Master Admin pode criar ou gerenciar administradores.
          </div>
        )}

        {carregando && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!carregando && erro && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle size={22} className="text-red-600" />
            </div>
            <p className="text-gray-600 text-sm">{erro}</p>
            <button
              onClick={() => setReloadKey(k => k + 1)}
              className="btn-primary"
              style={{ backgroundColor: '#16a34a' }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!carregando && !erro && (
          <>
            <div className="flex flex-col gap-3">
              {ativos.length === 0 && (
                <p className="text-center text-gray-500 py-12">Nenhum administrador ativo.</p>
              )}
              {ativos.map(a => (
                <CardAdmin
                  key={a.user_id}
                  admin={a}
                  isMaster={isMaster}
                  currentUserId={currentUserId}
                  onAcao={abrirModal}
                />
              ))}
            </div>

            {inativos.length > 0 && (
              <div className="mt-10">
                <p className="text-sm font-medium text-gray-500 mb-4">
                  Administradores inativos ({inativos.length})
                </p>
                <div className="flex flex-col gap-3">
                  {inativos.map(a => (
                    <CardAdmin
                      key={a.user_id}
                      admin={a}
                      isMaster={isMaster}
                      currentUserId={currentUserId}
                      onAcao={abrirModal}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}