import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'

interface FormData {
  destino: string
  data_evento: string
  inicio_inscricao: string
  fim_inscricao: string
  vagas_totais: string
  aceita_dependente: boolean
  limite_convidado: string
  valor_titular: string
  valor_dependente: string
  valor_convidado: string
}

const formInicial: FormData = {
  destino: '',
  data_evento: '',
  inicio_inscricao: '',
  fim_inscricao: '',
  vagas_totais: '',
  aceita_dependente: true,
  limite_convidado: '0',
  valor_titular: '',
  valor_dependente: '',
  valor_convidado: '',
}

// Formata ISO para datetime-local input (YYYY-MM-DDTHH:mm)
function isoParaDatetime(iso: string) {
  return iso.slice(0, 16)
}

// Data mínima agora (para bloquear passado)
function agora() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export default function AdminFormEvento() {
  const navigate     = useNavigate()
  const { eventoId } = useParams<{ eventoId: string }>()
  const isEdicao     = !!eventoId

  const [form, setForm]             = useState<FormData>(formInicial)
  const [carregando, setCarregando] = useState(isEdicao)
  const [salvando, setSalvando]     = useState(false)
  const [erro, setErro]             = useState('')

  const dataMinima = agora()

  function formatarValor(valor: number) {
    return valor.toFixed(2).replace('.', ',')
  }

  function parseMoeda(valor: string) {
    return parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0
  }

  function handleChange(campo: keyof FormData, valor: string | boolean) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  function handleMoeda(campo: keyof FormData, valor: string) {
    const soNumeros = valor.replace(/[^\d]/g, '')
    const numero    = parseInt(soNumeros || '0', 10) / 100
    setForm(f => ({ ...f, [campo]: numero.toFixed(2).replace('.', ',') }))
  }

  useEffect(() => {
    if (!isEdicao) return
    let mounted = true

    const buscar = async () => {
      const { data } = await supabase
        .from('eventos')
        .select('*')
        .eq('id', eventoId)
        .single()

      if (!mounted || !data) return

      setForm({
        destino:           data.destino,
        data_evento:       isoParaDatetime(data.data_evento),
        inicio_inscricao:  isoParaDatetime(data.inicio_inscricao),
        fim_inscricao:     isoParaDatetime(data.fim_inscricao),
        vagas_totais:      String(data.vagas_totais),
        aceita_dependente: data.aceita_dependente,
        limite_convidado:  String(data.limite_convidado),
        valor_titular:     formatarValor(data.valor_titular),
        valor_dependente:  data.valor_dependente ? formatarValor(data.valor_dependente) : '',
        valor_convidado:   data.valor_convidado  ? formatarValor(data.valor_convidado)  : '',
      })
      setCarregando(false)
    }

    buscar()
    return () => { mounted = false }
  }, [eventoId, isEdicao])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (!form.destino.trim())   return setErro('Informe o destino do evento.')
    if (!form.data_evento)      return setErro('Informe a data e hora do evento.')
    if (!form.inicio_inscricao) return setErro('Informe o inicio das inscricoes.')
    if (!form.fim_inscricao)    return setErro('Informe o fim das inscricoes.')
    if (!form.vagas_totais)     return setErro('Informe a quantidade de vagas.')
    if (!form.valor_titular)    return setErro('Informe o valor do titular.')

    if (form.data_evento <= dataMinima)
      return setErro('A data do evento nao pode ser no passado.')
    if (form.inicio_inscricao >= form.fim_inscricao)
      return setErro('O inicio das inscricoes deve ser anterior ao fim.')
    if (form.fim_inscricao >= form.data_evento)
      return setErro('O fim das inscricoes deve ser anterior a data do evento.')

    setSalvando(true)

    const payload = {
      destino:           form.destino.trim(),
      data_evento:       new Date(form.data_evento).toISOString(),
      inicio_inscricao:  new Date(form.inicio_inscricao).toISOString(),
      fim_inscricao:     new Date(form.fim_inscricao).toISOString(),
      vagas_totais:      parseInt(form.vagas_totais, 10),
      aceita_dependente: form.aceita_dependente,
      limite_convidado:  parseInt(form.limite_convidado, 10) || 0,
      valor_titular:     parseMoeda(form.valor_titular),
      valor_dependente:  form.valor_dependente ? parseMoeda(form.valor_dependente) : null,
      valor_convidado:   form.valor_convidado  ? parseMoeda(form.valor_convidado)  : null,
    }

    let error

    if (isEdicao) {
      const res = await supabase.from('eventos').update(payload).eq('id', eventoId)
      error = res.error
    } else {
      const res = await supabase.from('eventos').insert({
        ...payload,
        vagas_disponiveis: payload.vagas_totais,
      })
      error = res.error
    }

    setSalvando(false)

    if (error) {
      setErro('Erro ao salvar evento. Tente novamente.')
      return
    }

    navigate('/admin')
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 pt-28 pb-12">

        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Voltar para eventos
        </button>

        <h1 className="font-display text-2xl font-bold text-gray-800 text-center mb-8">
          {isEdicao ? 'Editar Evento' : 'Novo Evento'}
        </h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card border border-surface-200 p-6 sm:p-8">
          <div className="flex flex-col gap-5">

            {/* Destino */}
            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
              <label className="label mb-0 text-right">Destino:</label>
              <input
                type="text"
                value={form.destino}
                onChange={e => handleChange('destino', e.target.value)}
                placeholder="Ex: Beto Carrero World"
                className="field"
              />
            </div>

            {/* Data e hora do evento */}
            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
              <label className="label mb-0 text-right">Data do Evento:</label>
              <input
                type="datetime-local"
                value={form.data_evento}
                min={dataMinima}
                onChange={e => handleChange('data_evento', e.target.value)}
                className="field"
              />
            </div>

            {/* Inicio das inscricoes */}
            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
              <label className="label mb-0 text-right">Inicio das inscricoes:</label>
              <input
                type="datetime-local"
                value={form.inicio_inscricao}
                min={dataMinima}
                onChange={e => handleChange('inicio_inscricao', e.target.value)}
                className="field"
              />
            </div>

            {/* Fim das inscricoes */}
            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
              <label className="label mb-0 text-right">Fim das inscricoes:</label>
              <input
                type="datetime-local"
                value={form.fim_inscricao}
                min={form.inicio_inscricao || dataMinima}
                max={form.data_evento || undefined}
                onChange={e => handleChange('fim_inscricao', e.target.value)}
                className="field"
              />
            </div>

            {/* Vagas + Dependentes + Convidados */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="label">Quantidade de vagas:</label>
                <input
                  type="number"
                  min="1"
                  value={form.vagas_totais}
                  onChange={e => handleChange('vagas_totais', e.target.value)}
                  placeholder="0"
                  className="field"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="label">Dependentes:</label>
                <select
                  value={form.aceita_dependente ? 'sim' : 'nao'}
                  onChange={e => handleChange('aceita_dependente', e.target.value === 'sim')}
                  className="field"
                >
                  <option value="sim">Sim</option>
                  <option value="nao">Nao</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="label">Convidados:</label>
                <input
                  type="number"
                  min="0"
                  value={form.limite_convidado}
                  onChange={e => handleChange('limite_convidado', e.target.value)}
                  className="field"
                />
              </div>
            </div>

            {/* Valores */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="label">Valor Titular:</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.valor_titular}
                    onChange={e => handleMoeda('valor_titular', e.target.value)}
                    placeholder="0,00"
                    className="field pl-9"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="label">Valor Dependente:</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.valor_dependente}
                    onChange={e => handleMoeda('valor_dependente', e.target.value)}
                    placeholder="0,00"
                    className="field pl-9"
                    disabled={!form.aceita_dependente}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="label">Valor Convidado:</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.valor_convidado}
                    onChange={e => handleMoeda('valor_convidado', e.target.value)}
                    placeholder="0,00"
                    className="field pl-9"
                    disabled={parseInt(form.limite_convidado) === 0}
                  />
                </div>
              </div>
            </div>

            {/* Erro */}
            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm text-center">{erro}</p>
              </div>
            )}

            {/* Botoes */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="btn-primary"
                style={{ backgroundColor: salvando ? '#86efac' : '#16a34a' }}
              >
                {salvando ? 'Salvando...' : isEdicao ? 'Salvar alteracoes' : 'Criar evento'}
              </button>
            </div>

          </div>
        </form>

      </main>
    </div>
  )
}
