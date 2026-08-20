import { useEffect, useState } from 'react'
import { CodePenAiLab } from '@/components/CodePenAiLab'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { applyRuntimeTheme, fetchRuntimeConfig } from '@/services/runtimeConfigClient'
import './App.css'

function App(): JSX.Element {
  const [page, setPage] = useState<'ai' | 'projects'>('ai')

  useEffect(() => {
    let active = true
    void fetchRuntimeConfig().then((runtimeConfig) => {
      if (!active || !runtimeConfig) return
      applyRuntimeTheme(runtimeConfig)
      document.documentElement.dataset.runtimeConfigVersion = String(runtimeConfig.version)
    })
    return () => { active = false }
  }, [])

  return page === 'projects'
    ? <ProjectsPage onBack={() => setPage('ai')} />
    : <CodePenAiLab onOpenProjects={() => setPage('projects')} />
}

export default App
