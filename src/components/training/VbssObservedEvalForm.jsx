import VbssEntryTerminal from './VbssEntryTerminal'

/**
 * @param {{
 *   addLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   onSubmitted?: () => void
 *   hidePdfBanner?: boolean
 * }} props
 */
export default function VbssObservedEvalForm(props) {
  return <VbssEntryTerminal {...props} />
}
