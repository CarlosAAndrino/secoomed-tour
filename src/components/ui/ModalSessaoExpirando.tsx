interface Props {
  visivel: boolean
  segundosRestantes: number
  onContinuar: () => void
}

export default function ModalSessaoExpirando({ visivel, segundosRestantes, onContinuar }: Props) {
  if (!visivel) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-modal p-8 max-w-sm w-full mx-4 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: '#FEF3C7' }}
        >
          <span style={{ fontSize: 28 }}>⏱</span>
        </div>
        <h2 className="font-display text-xl font-bold text-gray-800 mb-2">
          Sua sessao esta expirando
        </h2>
        <p className="text-gray-500 text-sm mb-1">
          Por inatividade, voce sera deslogado em:
        </p>
        <p className="text-4xl font-bold mb-6" style={{ color: '#16a34a' }}>
          {segundosRestantes}s
        </p>
        <button
          onClick={onContinuar}
          className="btn-primary w-full"
          style={{ backgroundColor: '#16a34a' }}
        >
          Continuar conectado
        </button>
      </div>
    </div>
  )
}