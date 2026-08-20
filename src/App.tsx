import { useEffect, useState } from 'react'
import { CodePenAiLab } from '@/components/CodePenAiLab'
import { ImagesPage } from '@/pages/ImagesPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { SearchCreationsPage } from '@/pages/SearchCreationsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { applyRuntimeTheme, fetchRuntimeConfig } from '@/services/runtimeConfigClient'
import './App.css'
import '@/styles/crystal-theme.css'

type Page = 'ai' | 'projects' | 'images' | 'search' | 'settings'
const HASH_TO_PAGE: Record<string, Page> = { '#projects': 'projects', '#images': 'images', '#search': 'search', '#settings': 'settings' }
function pageFromHash(): Page { if (typeof window === 'undefined') return 'ai'; return HASH_TO_PAGE[window.location.hash] ?? 'ai' }
function App(): JSX.Element {
  const [page, setPage] = useState<Page>(pageFromHash)
  const [menuReturnSignal, setMenuReturnSignal] = useState(0)
  useEffect(() => {
    const handleNavigationChange = () => setPage(pageFromHash())
    window.addEventListener('hashchange', handleNavigationChange)
    window.addEventListener('popstate', handleNavigationChange)
    let active = true
    void fetchRuntimeConfig().then((runtimeConfig) => { if (!active || !runtimeConfig) return; applyRuntimeTheme(runtimeConfig); document.documentElement.dataset.runtimeConfigVersion = String(runtimeConfig.version) })
    return () => { active = false; window.removeEventListener('hashchange', handleNavigationChange); window.removeEventListener('popstate', handleNavigationChange) }
  }, [])
  const navigate = (nextPage: Page, returnToMenu = false): void => {
    if (nextPage === 'ai') { if (returnToMenu) setMenuReturnSignal((value) => value + 1); if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search); setPage('ai'); return }
    const nextHash = `#${nextPage}`
    if (window.location.hash !== nextHash) window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`)
    setPage(nextPage)
  }
  if (page === 'projects') return <ProjectsPage onBack={() => navigate('ai', true)} />
  if (page === 'images') return <ImagesPage onBack={() => navigate('ai', true)} />
  if (page === 'search') return <SearchCreationsPage onBack={() => navigate('ai', true)} />
  if (page === 'settings') return <SettingsPage onBack={() => navigate('ai', true)} />
  return <CodePenAiLab menuReturnSignal={menuReturnSignal} onOpenProjects={(fromMenu = false) => navigate('projects', fromMenu)} onOpenImages={(fromMenu = false) => navigate('images', fromMenu)} onOpenSearch={(fromMenu = false) => navigate('search', fromMenu)} onOpenSettings={(fromMenu = false) => navigate('settings', fromMenu)} />
}
export default App
