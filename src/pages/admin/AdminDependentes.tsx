import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import type { Associado, Dependente } from '@/types/database'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AdminDependentes() {
  const { associadoId } = useParams<{ associadoId: string }>()
  const navigate = useNavigate()
  const [associado, setAssociado] = useState<Associado | null>(null)
  const [dependentes, setDependentes] = useState<Dependente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!associadoId) return
    let mounted = true

    const buscar = async () => {
      setCarregando(true)
      const [{ data: assoc }, { data: deps }] = await Promise.all([
        supabase.from('associados').select('*').eq('id', associadoId).single(),
        supabase.from('dependentes').select('*').eq('associado_id', associadoId).order('nr_sequencia'),
      ])
      if (!mounted) return
      if (!assoc) { setErro('Associado não encontrado.') }
      else {
        setAssociado(assoc as Associado)
        setDependentes((deps as Dependente[]) ?? [])
      }
      setCarregando(false)
    }

    buscar()
    return () => { mounted = false }
  }, [associadoId])

  function formatarData(data: string) {
    return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR })
  }

  function formatarCpf(cpf: string) {
    return cpf ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—'
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-28 pb-12">
        <button
          onClick={() => navigate('/admin/associados')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Voltar para associados
        </button>

        {carregando && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!carregando && erro && (
          <div className="flex flex-col items-center gap-4 py-16">
            <AlertCircle size={22} className="text-red-600" />
            <p className="text-gray-600 text-sm">{erro}</p>
          </div>
        )}

        {!carregando && !erro && associado && (
          <>
            <div className="text-center mb-8">
              <h1 className="font-display text-2xl font-bold text-gray-800">
                Dependentes de {associado.nome.split(' ')[0]}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Matrícula #{associado.nr_inscricao} · CPF: {formatarCpf(associado.cpf)}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden">
              {dependentes.length === 0 ? (
                <p className="text-center text-gray-500 py-16">
                  Nenhum dependente cadastrado.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-200 bg-surface-50">
                        <th className="text-left px-5 py-3 font-semibold text-gray-600">#</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600">Nome</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600">CPF</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600">Nascimento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dependentes.map(dep => (
                        <tr key={dep.id} className="border-b border-surface-100 last:border-0 hover:bg-surface-50">
                          <td className="px-5 py-3 text-gray-500">{dep.nr_sequencia}</td>
                          <td className="px-5 py-3 font-medium text-gray-800">{dep.nome}</td>
                          <td className="px-5 py-3 text-gray-500">{formatarCpf(dep.cpf ?? '')}</td>
                          <td className="px-5 py-3 text-gray-500">
                            {dep.data_nascimento ? formatarData(dep.data_nascimento) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}