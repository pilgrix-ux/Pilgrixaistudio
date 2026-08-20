import { useEffect, useState } from 'react'
import { CodePenAiLab } from '@/components/CodePenAiLab'
import { ImagesPage } from '@/pages/ImagesPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { SearchCreationsPage } from '@/pages/SearchCreationsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { applyRuntimeTheme, fetchRuntimeConfig } from '@/services/runtimeConfigClient'
import './App.css'

type Page = 'ai' | 'projects' | 'images' | 'search' | 'settings'

const HASH_TO_PAGE: Record<string, Page> = {
  '#projects': 'projects',
  '#images': 'images',
  '#search': 'search',
  '#settings': 'settings',
}

function pageFromHash(): Page {
  if (typeof window === 'undefined') return 'ai'
  return HASH_TO_PAGE[window.location.hash] ?? 'ai'
}

function App(): JSX.Element {
  const [page, setPage] = useState<Page>(pageFromHash)

  useEffect(() => {
    const handleHashChange = () => setPage(pageFromHash())
    window.addEventListener('hashchange', handleHashChange)

    let active = true
    void fetchRuntimeConfig().then((runtimeConfig) => {
      if (!active || !runtimeConfig) return
      applyRuntimeTheme(runtimeConfig)
      document.documentElement.dataset.runtimeConfigVersion = String(runtimeConfig.version)
    })

    return () => {
      active = false
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const navigate = (nextPage: Page): void => {
    const nextHash = nextPage === 'ai' ? '' : `#${nextPage}`
    if (window.location.hash === nextHash) {
      setPage(nextPage)
      return
    }
    window.location.hash = nextHash
  }

  if (page === 'projects') return <ProjectsPage onBack={() => navigate('ai')} />
  if (page === 'images') return <ImagesPage onBack={() => navigate('ai')} />
  if (page === 'search') return <SearchCreationsPage onBack={() => navigate('ai')} />
  if (page === 'settings') return <SettingsPage onBack={() => navigate('ai')} />

  return (
    <CodePenAiLab
      onOpenProjects={() => navigate('projects')}
      onOpenImages={() => navigate('images')}
      onOpenSearch={() => navigate('search')}
      onOpenSettings={() => navigate('settings')}
    />
  )
}

export default App
