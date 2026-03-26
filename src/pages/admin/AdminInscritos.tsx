import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import type { InscricaoEvento, EventoLista } from '@/types/database'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AdminInscritos() {
  const { eventoId } = useParams<{ eventoId: string }>()
  const navigate = useNavigate()

  const [evento, setEvento] = useState<EventoLista | null>(null)
  const [inscritos, setInscritos] = useState<InscricaoEvento[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!eventoId) return
    let mounted = true

    const buscar = async () => {
      setCarregando(true)

      const [{ data: ev }, { data: insc }] = await Promise.all([
        supabase
          .from('vw_eventos_lista')
          .select('*')
          .eq('id', eventoId)
          .single(),
        supabase
          .from('vw_inscricoes_evento')
          .select('*')
          .eq('evento_id', eventoId)
          .eq('status', 'confirmada')
          .order('inscrito_em', { ascending: true }),
      ])

      if (!mounted) return
      setEvento(ev as EventoLista ?? null)
      setInscritos((insc as InscricaoEvento[]) ?? [])
      setCarregando(false)
    }

    buscar()
    return () => { mounted = false }
  }, [eventoId])

  function formatarData(data: string) {
    return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR })
  }

  function labelTipo(tipo: string) {
    switch (tipo) {
      case 'titular':   return 'Associado(a)'
      case 'dependente': return 'Dependente'
      case 'convidado': return 'Convidado'
      default:          return tipo
    }
  }

  const confirmados = inscritos.filter(i => i.status === 'confirmada')

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-28 pb-12">

        {/* Voltar */}
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Voltar para eventos
        </button>

        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-gray-800">
            {evento?.destino ?? 'Carregando...'}
          </h1>
          {evento && (
            <p className="text-gray-500 text-sm mt-1">
              {formatarData(evento.data_evento)} &mdash; {confirmados.length} inscrito(s)
            </p>
          )}
        </div>

        {/* Loading */}
        {carregando && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Tabela */}
        {!carregando && (
          <div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden">
            {confirmados.length === 0 ? (
              <p className="text-center text-gray-500 py-16">
                Nenhum inscrito confirmado neste evento.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-200 bg-surface-50">
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Reserva</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Nome</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Tipo</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">ID Associado</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Data da reserva</th>
                    </tr>
                  </thead>
                  <tbody>
                    {confirmados.map((inscrito, index) => (
                      <tr
                        key={inscrito.inscricao_id}
                        className="border-b border-surface-100 last:border-0 hover:bg-surface-50 transition-colors"
                      >
                        <td className="px-5 py-3 text-gray-500 font-mono">
                          #{String(index + 1).padStart(2, '0')}
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-800">
                          {inscrito.participante_nome}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {labelTipo(inscrito.tipo_participante)}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {inscrito.nr_inscricao}
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {formatarData(inscrito.inscrito_em)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
