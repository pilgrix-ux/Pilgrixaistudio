/**
 * Main layout component
 */

import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: LayoutProps): JSX.Element {
  return <div className="min-h-screen bg-slate-50">{children}</div>
}
