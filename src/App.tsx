import { useEffect, useState } from 'react'
import { CodePenAiLab } from '@/components/CodePenAiLab'
import { ImagesPage } from '@/pages/ImagesPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { SearchCreationsPage } from '@/pages/SearchCreationsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { applyRuntimeTheme, fetchRuntimeConfig } from '@/services/runtimeConfigClient'
import './App.css'

type Page = 'ai' | 'projects' | 'images' | 'search' | 'settings'

function App(): JSX.Element {
  const [page, setPage] = useState<Page>('ai')

  useEffect(() => {
    let active = true
    void fetchRuntimeConfig().then((runtimeConfig) => {
      if (!active || !runtimeConfig) return
      applyRuntimeTheme(runtimeConfig)
      document.documentElement.dataset.runtimeConfigVersion = String(runtimeConfig.version)
    })
    return () => { active = false }
  }, [])

  if (page === 'projects') return <ProjectsPage onBack={() => setPage('ai')} />
  if (page === 'images') return <ImagesPage onBack={() => setPage('ai')} />
  if (page === 'search') return <SearchCreationsPage onBack={() => setPage('ai')} />
  if (page === 'settings') return <SettingsPage onBack={() => setPage('ai')} />

  return (
    <CodePenAiLab
      onOpenProjects={() => setPage('projects')}
      onOpenImages={() => setPage('images')}
      onOpenSearch={() => setPage('search')}
      onOpenSettings={() => setPage('settings')}
    />
  )
}

export default App
