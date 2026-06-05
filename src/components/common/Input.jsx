export default function Input({
  id,
  label,
  hint,
  error,
  className = '',
  inputClassName = '',
  variant = 'default',
  select = false,
  children,
  ...props
}) {
  const inputId = id ?? props.name

  const goldBase = [
    'h-10 w-full rounded-lg border bg-black/50 px-3 text-sm text-white placeholder:text-slate-600',
    'ring-0 transition-colors focus:outline-none focus:ring-2',
    error
      ? 'border-amber-500/70 focus:border-amber-400 focus:ring-amber-500/25'
      : 'border-white/15 focus:border-[#ffb400]/60 focus:ring-[#ffb400]/20',
  ]
  if (select) {
    goldBase.push(
      'cursor-pointer appearance-none bg-[length:0.65rem] bg-[right_0.75rem_center] bg-no-repeat pr-9',
      "[background-image:url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23ffb400%27 stroke-width=%272%27%3E%3Cpath d=%27M6 9l6 6 6-6%27/%3E%3C/svg%3E')]"
    )
  }

  const defaultBase = [
    'h-10 w-full rounded-lg border border-slate-700/90 bg-slate-900 px-3 text-sm text-slate-100 placeholder:text-slate-500',
    'ring-0 transition-colors',
    'focus:border-emerald-500/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/35',
    error && 'border-orange-500/80 focus:border-orange-500 focus:ring-orange-500/30',
  ]
  if (select) {
    defaultBase.push('cursor-pointer')
  }

  const styles = (variant === 'gold' ? goldBase : defaultBase).filter(Boolean)
  styles.push(inputClassName)

  const labelClass =
    variant === 'gold'
      ? 'text-[10px] font-bold uppercase tracking-widest text-[#d4af37]/90'
      : 'text-xs font-semibold uppercase tracking-wide text-slate-500'

  const errorClass =
    variant === 'gold'
      ? 'text-xs font-mono-technical font-medium text-amber-300/95'
      : 'text-xs font-medium text-orange-400'

  const fieldClass = styles.filter(Boolean).join(' ')

  const field = select ? (
    <select id={inputId} className={fieldClass} {...props}>
      {children}
    </select>
  ) : (
    <input id={inputId} className={fieldClass} {...props} />
  )

  return (
    <div className={['flex flex-col gap-1.5', className].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={inputId} className={labelClass}>
          {label}
        </label>
      )}
      {field}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className={errorClass}>{error}</p>}
    </div>
  )
}
