import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  buildBottomTabItems,
  buildInstructorNavItem,
  buildNavGroups,
  getSystemGroupTitle,
} from '../lib/navStructure'

/** @returns {ReturnType<typeof buildNavGroups>} */
export function useNavGroups() {
  const { t, i18n } = useTranslation('nav')
  return useMemo(() => buildNavGroups(t), [t, i18n.language])
}

/** @returns {ReturnType<typeof buildInstructorNavItem>} */
export function useInstructorNavItem() {
  const { t, i18n } = useTranslation('nav')
  return useMemo(() => buildInstructorNavItem(t), [t, i18n.language])
}

/** @returns {ReturnType<typeof buildBottomTabItems>} */
export function useBottomTabItems() {
  const { t, i18n } = useTranslation('nav')
  return useMemo(() => buildBottomTabItems(t), [t, i18n.language])
}

export function useSystemGroupTitle() {
  const { t, i18n } = useTranslation('nav')
  return useMemo(() => getSystemGroupTitle(t), [t, i18n.language])
}

export function useNavUi() {
  const { t, i18n } = useTranslation('nav')
  return useMemo(
    () => ({
      collapse: t('ui.collapse'),
      expand: t('ui.expand'),
      collapseAria: t('ui.collapseAria'),
      expandAria: t('ui.expandAria'),
      mainNavAria: t('ui.mainNavAria'),
      modulesNavAria: t('ui.modulesNavAria'),
      modulesTitle: t('ui.modulesTitle'),
      modulesSheetAria: t('ui.modulesSheetAria'),
      closeMenu: t('ui.closeMenu'),
      openMenu: t('ui.openMenu'),
      close: t('ui.close'),
      bottomNavAria: t('ui.bottomNavAria'),
      homeAria: t('ui.homeAria'),
      moduleMenuAria: t('ui.moduleMenuAria'),
      noSession: t('ui.noSession'),
      unreadMessages: (/** @type {number} */ count) => t('ui.unreadMessages', { count }),
    }),
    [t, i18n.language],
  )
}

export function useNavItemLabels() {
  const { t, i18n } = useTranslation('nav')
  return useMemo(
    () => ({
      admin: t('items.admin'),
      feedback: t('items.feedback'),
      pricing: t('items.pricing'),
      settings: t('items.settings'),
      signOut: t('items.signOut'),
    }),
    [t, i18n.language],
  )
}
