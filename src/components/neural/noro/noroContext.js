import { createContext } from 'react'

/** @type {import('react').Context<null | {
 *   enabled: boolean
 *   neuralState: object
 *   serverStored: object|null
 *   hasActivity: boolean
 *   loading: boolean
 *   events: Array<Record<string, unknown> & { id: string }>
 * }>} */
export const NoroCtx = createContext(null)
