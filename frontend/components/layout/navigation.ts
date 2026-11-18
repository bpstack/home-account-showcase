// One definition of the app's navigation, shared by the sidebar (desktop) and the bottom bar (mobile).

import { LayoutDashboard, Receipt, Settings, Tags, Upload, type LucideIcon } from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

export const mainNav: NavItem[] = [
  { name: 'Resumen', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Transacciones', href: '/transactions', icon: Receipt },
  { name: 'Categorías', href: '/categories', icon: Tags },
  { name: 'Importar', href: '/import', icon: Upload },
]

export const settingsNav: NavItem = {
  name: 'Configuración',
  href: '/profile?panel=settings',
  icon: Settings,
}

/** The four destinations kept in the mobile bottom bar; the rest live in the "Más" drawer. */
export const mobileNav: NavItem[] = mainNav.filter((item) =>
  ['/dashboard', '/transactions', '/import', '/categories'].includes(item.href)
)

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Resumen',
  transactions: 'Transacciones',
  categories: 'Categorías',
  import: 'Importar',
  investment: 'Inversión',
  profile: 'Configuración',
  'setup-recovery': 'Recuperación',
}

/** Title of the current page, from the first segment of the path. */
export function pageTitle(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean)[0] ?? ''
  return PAGE_TITLES[segment] ?? ''
}

/** Whether a nav item points at the current page (ignores its query string). */
export function isActive(item: NavItem, pathname: string, panel: string | null): boolean {
  const [path, query] = item.href.split('?')
  if (query) return pathname === path && new URLSearchParams(query).get('panel') === panel
  return pathname === path || pathname.startsWith(`${path}/`)
}
