/** @typedef {'pistol' | 'reddot' | 'cartridge'} MatrixModelVariant */

const WIRE = {
  fill: 'none',
  stroke: '#00FF41',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  vectorEffect: 'non-scaling-stroke',
}

/** @param {import('react').SVGProps<SVGSVGElement>} props */
function WireSvg({ children, ...props }) {
  return (
    <svg viewBox="0 0 240 140" className="h-full w-full max-h-[7.5rem] max-w-[14rem] sm:max-h-[8.5rem] sm:max-w-[16rem]" aria-hidden {...props}>
      {children}
    </svg>
  )
}

/** @param {import('react').SVGProps<SVGPathElement> & { d: string, dash?: string, opacity?: number }} props */
function WirePath({ d, dash = '4 6', opacity = 1, ...rest }) {
  return (
    <path
      d={d}
      {...WIRE}
      strokeDasharray={dash}
      opacity={opacity}
      className="matrix-wire-path"
      {...rest}
    />
  )
}

export function PistolWireSvg() {
  return (
    <WireSvg>
      <g className="matrix-wire-scan">
        <WirePath opacity={0.35} dash="2 8" d="M28 70 H212 M28 70 V95 M212 70 V95" />
        <WirePath
          d="M38 58 H158 L168 62 L168 70 L158 74 H38 L32 70 L32 62 Z"
        />
        <WirePath d="M158 60 H198 L204 62 L204 68 L198 70 H158" />
        <WirePath d="M198 63 H210 M198 67 H210" opacity={0.7} dash="2 4" />
        <WirePath d="M38 74 H150 L150 82 H42 L38 74 Z" />
        <WirePath d="M42 82 H148 L145 88 H48 Z" opacity={0.85} />
        <WirePath d="M48 88 H92 L98 118 H78 L72 118 L66 88 Z" />
        <WirePath d="M92 88 H118 L124 112 H104 L98 88 Z" />
        <WirePath d="M52 92 H68 L70 108 H54 Z" opacity={0.55} dash="3 5" />
        <WirePath
          d="M108 90 Q118 78 128 90 Q138 102 128 108 Q118 114 108 108 Q98 102 108 90 Z"
        />
        <WirePath d="M114 96 L118 102 M122 96 L118 102" opacity={0.8} />
        <WirePath d="M70 56 L74 50 M152 56 L148 50" />
        <WirePath d="M55 64 H62 V68 H55 Z M145 64 H152 V68 H145 Z" opacity={0.65} />
        <WirePath d="M95 58 H105 M115 58 H125 M135 58 H145" opacity={0.45} dash="1 5" />
        <WirePath d="M88 62 H132" opacity={0.5} dash="2 3" />
        <WirePath d="M168 64 H174 V70 H168 Z" opacity={0.7} />
        <WirePath d="M40 76 H46 V82 H40 Z" opacity={0.55} dash="2 4" />
        <circle cx="201" cy="65" r="2.5" {...WIRE} strokeDasharray="2 3" opacity={0.6} />
        <WirePath d="M124 74 H138 L140 78 H122 Z" opacity={0.5} dash="3 4" />
      </g>
    </WireSvg>
  )
}

export function RedDotWireSvg() {
  return (
    <WireSvg>
      <g className="matrix-wire-scan">
        <WirePath opacity={0.35} dash="2 8" d="M40 98 H200 M120 30 V98" />
        {[-36, -24, -12, 0, 12, 24, 36].map((dx) => (
          <WirePath
            key={dx}
            opacity={0.4}
            dash="1 4"
            d={`M${120 + dx} 98 L${120 + dx} 92`}
          />
        ))}
        <WirePath d="M52 98 H188 L192 94 L192 90 H48 L44 94 Z" />
        <WirePath d="M56 90 H184 L180 86 H60 Z" opacity={0.7} />
        <WirePath d="M68 86 H172 L168 58 H72 Z" />
        <WirePath d="M72 58 H168 L164 42 H76 Z" />
        <WirePath d="M80 42 H160 L156 36 H84 Z" opacity={0.85} />
        <WirePath d="M88 36 H152 L148 32 H92 Z" opacity={0.65} />
        <WirePath d="M118 32 L122 28 L126 32" />
        <circle cx="122" cy="26" r="5" {...WIRE} />
        <WirePath d="M122 21 V16 M117 26 H112 M127 26 H132" opacity={0.75} />
        <WirePath d="M96 26 H108 M136 26 H148" opacity={0.55} dash="2 4" />
        <WirePath d="M158 48 H172 L176 52 L172 56 H158 Z" opacity={0.8} />
        <WirePath d="M72 48 H86 L82 52 L72 56 Z" opacity={0.8} />
        <ellipse cx="122" cy="50" rx="28" ry="14" {...WIRE} strokeDasharray="3 5" />
        <ellipse cx="122" cy="50" rx="18" ry="9" {...WIRE} opacity={0.7} />
        <WirePath d="M122 50 L122 42 M122 50 L130 50 M122 50 L114 50 M122 50 L122 58" opacity={0.55} dash="2 3" />
        <WirePath d="M100 62 H144 L140 72 H104 Z" opacity={0.6} />
        <WirePath d="M108 72 H136 L132 78 H112 Z" opacity={0.45} dash="3 5" />
        <WirePath d="M76 58 H88 M156 58 H168" opacity={0.5} />
      </g>
    </WireSvg>
  )
}

export function CartridgeWireSvg() {
  return (
    <WireSvg>
      <g className="matrix-wire-scan">
        <WirePath opacity={0.35} dash="2 8" d="M120 24 V118 M95 118 H145" />
        <WirePath
          d="M120 28 C108 28 100 36 98 48 C96 58 98 66 104 72 C110 78 118 80 120 80 C122 80 130 78 136 72 C142 66 144 58 142 48 C140 36 132 28 120 28 Z"
        />
        <WirePath d="M104 72 L104 88 C104 92 108 96 112 96 H128 C132 96 136 92 136 88 L136 72" />
        <WirePath d="M108 96 H132 L130 108 H110 Z" />
        <WirePath d="M110 108 H130 L128 112 H112 Z" opacity={0.85} />
        <WirePath d="M112 112 H128 L126 118 H114 Z" />
        <ellipse cx="120" cy="118" rx="14" ry="3" {...WIRE} />
        <WirePath d="M106 118 H134" opacity={0.7} />
        <circle cx="120" cy="116" r="3" {...WIRE} opacity={0.65} strokeDasharray="2 3" />
        <WirePath d="M114 100 H126" opacity={0.55} dash="2 4" />
        <WirePath d="M112 104 V112 M128 104 V112" opacity={0.5} dash="1 5" />
        <WirePath d="M118 88 H122 M118 92 H122" opacity={0.45} />
        <WirePath d="M108 76 Q120 74 132 76" opacity={0.4} dash="3 4" />
        <WirePath d="M120 44 L120 38 M112 52 L108 48 M128 52 L132 48" opacity={0.6} />
        <WirePath d="M100 90 C100 86 104 84 108 84" opacity={0.5} dash="2 3" />
        <WirePath d="M140 90 C140 86 136 84 132 84" opacity={0.5} dash="2 3" />
      </g>
    </WireSvg>
  )
}

/** @param {{ variant: MatrixModelVariant }} props */
export function MatrixWireModel({ variant }) {
  if (variant === 'reddot') return <RedDotWireSvg />
  if (variant === 'cartridge') return <CartridgeWireSvg />
  return <PistolWireSvg />
}
