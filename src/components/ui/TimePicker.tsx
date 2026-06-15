import { useState, useRef } from "react";
import { Clock, X } from "lucide-react";

interface TimePickerProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  label?: string;
}

const CLOCK_SIZE = 240;
const CENTER = CLOCK_SIZE / 2;
const RADIUS_OUTER = 95;
const RADIUS_INNER = 65;
const RADIUS_MINUTES = 95;

function posicaoCircular(
  angulo: number,
  raio: number
): { x: number; y: number } {
  const rad = ((angulo - 90) * Math.PI) / 180;
  return {
    x: CENTER + raio * Math.cos(rad),
    y: CENTER + raio * Math.sin(rad),
  };
}

// Horas do anel interno: 00, 1, 2, 3, ..., 11
const HORAS_INTERNAS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
// Horas do anel externo: 12, 13, 14, ..., 23
const HORAS_EXTERNAS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

export default function TimePicker({ value, onChange }: TimePickerProps) {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<"hora" | "minuto">("hora");
  const [horaTemp, setHoraTemp] = useState(0);
  const [minutoTemp, setMinutoTemp] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  function abrirPicker() {
    const [h, m] = (value || "08:00").split(":").map(Number);
    setHoraTemp(h);
    setMinutoTemp(m);
    setModo("hora");
    setAberto(true);
  }

  function selecionarHora(h: number) {
    setHoraTemp(h);
    setModo("minuto");
  }

  function selecionarMinuto(m: number) {
    setMinutoTemp(m);
  }

  function confirmar() {
    const hStr = String(horaTemp).padStart(2, "0");
    const mStr = String(minutoTemp).padStart(2, "0");
    onChange(`${hStr}:${mStr}`);
    setAberto(false);
  }

  function handleClickRelogio(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - CENTER;
    const y = e.clientY - rect.top - CENTER;
    const angulo = (Math.atan2(y, x) * 180) / Math.PI + 90;
    const anguloNorm = angulo < 0 ? angulo + 360 : angulo;
    const distancia = Math.sqrt(x * x + y * y);

    if (modo === "hora") {
      const setor = Math.round(anguloNorm / 30) % 12;
      // Anel interno (0-11) ou externo (12-23) baseado na distância
      const ehInterno = distancia < (RADIUS_OUTER + RADIUS_INNER) / 2;
      const hora = ehInterno ? setor : setor + 12;
      selecionarHora(hora);
    } else {
      const setor = Math.round(anguloNorm / 6) % 60;
      selecionarMinuto(setor);
    }
  }

  // Ponteiro
  const anguloAtual =
    modo === "hora"
      ? ((horaTemp % 12) / 12) * 360
      : (minutoTemp / 60) * 360;

  const raioAtual =
    modo === "hora"
      ? horaTemp < 12
        ? RADIUS_INNER
        : RADIUS_OUTER
      : RADIUS_MINUTES;

  const ponteiro = posicaoCircular(anguloAtual, raioAtual);

  return (
    <div className="relative">
      <div
        onClick={abrirPicker}
        className="field flex items-center gap-2 cursor-pointer select-none"
      >
        <Clock size={16} className="text-gray-400" />
        <span className={value ? "text-gray-800" : "text-gray-400"}>
          {value || "Selecionar horário"}
        </span>
      </div>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-modal w-80 overflow-hidden animate-slide-up">
            {/* Header */}
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ backgroundColor: "#16a34a" }}
            >
              <div className="flex items-baseline gap-1">
                <button
                  onClick={() => setModo("hora")}
                  className={`text-3xl font-bold transition-opacity ${
                    modo === "hora"
                      ? "text-white"
                      : "text-white/50 hover:text-white/70"
                  }`}
                >
                  {String(horaTemp).padStart(2, "0")}
                </button>
                <span className="text-3xl font-bold text-white/50">:</span>
                <button
                  onClick={() => setModo("minuto")}
                  className={`text-3xl font-bold transition-opacity ${
                    modo === "minuto"
                      ? "text-white"
                      : "text-white/50 hover:text-white/70"
                  }`}
                >
                  {String(minutoTemp).padStart(2, "0")}
                </button>
              </div>
              <button
                onClick={() => setAberto(false)}
                className="text-white/70 hover:text-white p-1 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 pt-3">
              {modo === "hora"
                ? "Selecione a hora"
                : "Selecione os minutos"}
            </p>

            {/* Relógio */}
            <div className="flex justify-center py-4">
              <svg
                ref={svgRef}
                width={CLOCK_SIZE}
                height={CLOCK_SIZE}
                onClick={handleClickRelogio}
                className="cursor-pointer"
              >
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={CENTER - 4}
                  fill="#f3f4f6"
                />
                <circle cx={CENTER} cy={CENTER} r={3} fill="#16a34a" />

                {/* Ponteiro */}
                <line
                  x1={CENTER}
                  y1={CENTER}
                  x2={ponteiro.x}
                  y2={ponteiro.y}
                  stroke="#16a34a"
                  strokeWidth={2}
                />
                <circle
                  cx={ponteiro.x}
                  cy={ponteiro.y}
                  r={16}
                  fill="#16a34a"
                  opacity={0.15}
                />

                {modo === "hora" ? (
                  <>
                    {/* Anel externo: 12-23 */}
                    {HORAS_EXTERNAS.map((hora) => {
                      const posicao = hora - 12; // 0-11 para posição angular
                      const pos = posicaoCircular(posicao * 30, RADIUS_OUTER);
                      const selecionado = horaTemp === hora;
                      return (
                        <g key={`ext-${hora}`}>
                          {selecionado && (
                            <circle
                              cx={pos.x}
                              cy={pos.y}
                              r={16}
                              fill="#16a34a"
                            />
                          )}
                          <text
                            x={pos.x}
                            y={pos.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={12}
                            fontWeight={selecionado ? "bold" : "normal"}
                            fill={selecionado ? "white" : "#374151"}
                            className="select-none pointer-events-none"
                          >
                            {hora}
                          </text>
                        </g>
                      );
                    })}

                    {/* Anel interno: 00, 1, 2, ..., 11 */}
                    {HORAS_INTERNAS.map((hora) => {
                      const pos = posicaoCircular(hora * 30, RADIUS_INNER);
                      const selecionado = horaTemp === hora;
                      return (
                        <g key={`int-${hora}`}>
                          {selecionado && (
                            <circle
                              cx={pos.x}
                              cy={pos.y}
                              r={16}
                              fill="#16a34a"
                            />
                          )}
                          <text
                            x={pos.x}
                            y={pos.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={11}
                            fontWeight={selecionado ? "bold" : "normal"}
                            fill={selecionado ? "white" : "#9ca3af"}
                            className="select-none pointer-events-none"
                          >
                            {hora === 0 ? "00" : hora}
                          </text>
                        </g>
                      );
                    })}
                  </>
                ) : (
                  Array.from({ length: 12 }, (_, i) => {
                    const minuto = i * 5;
                    const pos = posicaoCircular(i * 30, RADIUS_MINUTES);
                    const selecionado = minutoTemp === minuto;
                    return (
                      <g key={`min-${i}`}>
                        {selecionado && (
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r={16}
                            fill="#16a34a"
                          />
                        )}
                        <text
                          x={pos.x}
                          y={pos.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={13}
                          fontWeight={selecionado ? "bold" : "normal"}
                          fill={selecionado ? "white" : "#374151"}
                          className="select-none pointer-events-none"
                        >
                          {String(minuto).padStart(2, "0")}
                        </text>
                      </g>
                    );
                  })
                )}
              </svg>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-surface-100 flex justify-end gap-3">
              <button
                onClick={() => setAberto(false)}
                className="btn-secondary text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmar}
                className="text-sm font-semibold text-white px-5 py-2 rounded-xl transition-colors hover:opacity-90"
                style={{ backgroundColor: "#16a34a" }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
