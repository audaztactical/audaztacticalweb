/**
 * Landing üst menü ↔ navStructure eşlemesi.
 * Öğeler navStructure'dan üretilir; burada yalnızca hangi path hangi menüye düşer.
 *
 * Notlar (ADIM 0):
 * - Taslak "Atış / CQB / VBSS" ayrı satırları yok → tek öğe: /antrenman (trainingOps)
 * - "AAR" navStructure'da yok → eklenmedi
 * - /mesajlar personal grubunda; AUDAZ Ağı menüsüne alındı
 * - Eğitmen paneli (görünürse) Profil ▾ içinde, Ayarlar’ın üstünde (landingNavMap dışı; LandingAuthNav)
 * - /profil yalnızca Profil ▾ altında (map dışı)
 */

/** @typedef {'training' | 'brain' | 'ops' | 'network'} LandingAuthMenuId */

/** @type {Record<LandingAuthMenuId, { labelKey: string, routes: string[] }>} */
export const LANDING_AUTH_MENU_DEFS = {
  training: {
    labelKey: 'authNav.menus.training',
    routes: ['/antrenman', '/taktik-timer', '/tccc', '/akademi'],
  },
  brain: {
    labelKey: 'authNav.menus.brain',
    // Operatör Beyni = /dashboard (hqReturn); başarılar
    routes: ['/dashboard', '/basarilar'],
  },
  ops: {
    labelKey: 'authNav.menus.ops',
    routes: ['/balistik', '/cephanelik'],
  },
  network: {
    labelKey: 'authNav.menus.network',
    routes: ['/istihbarat', '/forum', '/mesajlar'],
  },
}

/** Landing’de “Yakında” rozeti gösterilecek path’ler */
export const LANDING_SOON_ROUTES = new Set(['/akademi'])

/** Beyin menüsüne eklenen sayfa-içi sabit öğe (navStructure dışı) */
export const LANDING_BRAIN_STATIC = {
  id: 'noro-anchor',
  href: '#noro',
  labelKey: 'authNav.noroWhat',
  descKey: 'authNav.descs.noro',
}

/** Keşfet — statik */
export const LANDING_EXPLORE_ITEMS = [
  { id: 'how', href: '#nasil', labelKey: 'authNav.explore.how' },
  { id: 'modules', href: '#moduller', labelKey: 'authNav.explore.modules' },
  { id: 'privacy', href: '#gizlilik', labelKey: 'authNav.explore.privacy' },
  { id: 'guide', to: '/kilavuz', labelKey: 'authNav.explore.guide' },
]

/**
 * Görünür nav gruplarından (applyInstructorNavVisibility sonrası) landing menü öğelerini kur.
 * @param {Array<{ id: string, items: Array<{ to: string, label: string, labelKey?: string, icon: import('lucide-react').LucideIcon, end?: boolean }> }>} visibleGroups
 * @returns {Array<{ id: LandingAuthMenuId, labelKey: string, items: Array<{ to: string, label: string, labelKey?: string, icon: import('lucide-react').LucideIcon, end?: boolean, soon?: boolean }> }>}
 */
export function buildLandingAuthMenus(visibleGroups) {
  /** @type {Map<string, { to: string, label: string, labelKey?: string, icon: import('lucide-react').LucideIcon, end?: boolean }>} */
  const byRoute = new Map()
  for (const g of visibleGroups) {
    for (const item of g.items) {
      // hqReturn ve home aynı /dashboard olmasın diye: home artık /ana-sayfa.
      // Beyin menüsünde Operatör Beyni için /dashboard (hqReturn) kullanılır.
      if (item.labelKey === 'items.home') continue
      if (item.labelKey === 'items.hqReturn') {
        byRoute.set(item.to, { ...item, labelKey: item.labelKey })
        continue
      }
      if (!byRoute.has(item.to)) byRoute.set(item.to, item)
    }
  }

  /** @type {LandingAuthMenuId[]} */
  const order = ['training', 'brain', 'ops', 'network']
  return order.map((id) => {
    const def = LANDING_AUTH_MENU_DEFS[id]
    const items = def.routes
      .map((route) => {
        const item = byRoute.get(route)
        if (!item) return null
        return {
          ...item,
          soon: LANDING_SOON_ROUTES.has(route),
        }
      })
      .filter(Boolean)
    return { id, labelKey: def.labelKey, items }
  })
}

/**
 * applyInstructorNavVisibility sonrası eğitmen paneli öğesini bulur (yoksa null).
 * @param {Array<{ items: Array<{ to: string, labelKey?: string }> }>} visibleGroups
 */
export function findInstructorNavItem(visibleGroups) {
  for (const g of visibleGroups) {
    const found = g.items.find(
      (i) => i.to === '/egitmen-komuta' || i.labelKey === 'items.instructorPanel',
    )
    if (found) return found
  }
  return null
}
