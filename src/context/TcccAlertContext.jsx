import { createContext, useContext, useMemo } from 'react'
import { useAudazData } from '../hooks/useAudazData'
import { scanIfakInventoryAlerts } from '../lib/ifakExpiration'

/** @typedef {import('../lib/ifakExpiration').IfakExpiryStatus} IfakExpiryStatus */

/**
 * @typedef {Object} TcccAlertContextValue
 * @property {boolean} hasCriticalExpiry
 * @property {number} criticalCount
 * @property {Record<string, unknown>[]} criticalItems
 * @property {boolean} loading
 */

const TcccAlertContext = createContext(
  /** @type {TcccAlertContextValue} */ ({
    hasCriticalExpiry: false,
    criticalCount: 0,
    criticalItems: [],
    loading: true,
  })
)

export function TcccAlertProvider({ children }) {
  const { items, loading } = useAudazData('ifak_inventory')

  const value = useMemo(() => {
    const scan = scanIfakInventoryAlerts(items)
    return {
      hasCriticalExpiry: scan.hasCriticalExpiry,
      criticalCount: scan.criticalCount,
      criticalItems: scan.criticalItems,
      loading,
    }
  }, [items, loading])

  return <TcccAlertContext.Provider value={value}>{children}</TcccAlertContext.Provider>
}

export function useTcccAlerts() {
  return useContext(TcccAlertContext)
}
