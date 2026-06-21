import MatrixWireVisualizer from '../../armory/MatrixWireVisualizer'

/**
 * @param {{
 *   imageSrc: string
 *   imageAlt: string
 *   label?: string
 *   variant?: 'reddot' | 'default'
 *   stats?: import('react').ReactNode
 *   className?: string
 * }} props
 */
export default function TrainingVisualStage({
  imageSrc,
  imageAlt,
  label = '',
  variant = 'reddot',
  stats,
  className = 'mt-auto hidden border-t border-accent/12 pt-3 lg:block',
}) {
  return (
    <div className={className}>
      <MatrixWireVisualizer hubMode variant={variant} imageSrc={imageSrc} imageAlt={imageAlt} label={label} />
      {stats ? (
        <div className="mt-2 font-mono-technical text-[8px] uppercase text-app-text/55">{stats}</div>
      ) : null}
    </div>
  )
}
