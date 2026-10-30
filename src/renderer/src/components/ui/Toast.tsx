import { AlertTriangle, Info } from 'lucide-react'
import { useStore } from '../../store/useStore'

/** Notificações flutuantes (adicionar lista, erros, etc.). */
export function Toast(): JSX.Element | null {
  const toast = useStore((s) => s.toast)
  if (!toast) return null

  const isError = toast.type === 'error'

  return (
    <div className="pointer-events-none fixed bottom-8 left-1/2 z-[80] -translate-x-1/2 animate-slide-up">
      <div
        className={`flex max-w-[560px] items-start gap-3 rounded-xl border px-4 py-3 shadow-card backdrop-blur ${
          isError
            ? 'border-red-500/40 bg-red-950/80 text-red-100'
            : 'border-white/10 bg-[#1b1b21]/95 text-white'
        }`}
      >
        {isError ? (
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-red-400" />
        ) : (
          <Info size={17} className="mt-0.5 shrink-0 text-mmz-orange" />
        )}
        <p className="text-sm leading-relaxed">{toast.message}</p>
      </div>
    </div>
  )
}
