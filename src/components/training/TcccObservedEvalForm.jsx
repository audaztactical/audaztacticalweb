import TcccEntryTerminal from './TcccEntryTerminal'

/**
 * @param {{
 *   addLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   onSubmitted?: () => void
 *   hidePdfBanner?: boolean
 * }} props
 */
export default function TcccObservedEvalForm(props) {
  return <TcccEntryTerminal {...props} />
}
