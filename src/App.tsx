import { useEffect } from 'react'
import { AiLabWorkspace } from '@/components/AiLabWorkspace'
import { applyRuntimeTheme, fetchRuntimeConfig } from '@/services/runtimeConfigClient'
import './App.css'

// Deployment marker: keep the production build synchronized with the AI Lab workspace.
function App(): JSX.Element {
  useEffect(() => {
    let active = true
    void fetchRuntimeConfig().then((runtimeConfig) => {
      if (!active || !runtimeConfig) return
      applyRuntimeTheme(runtimeConfig)
      document.documentElement.dataset.runtimeConfigVersion = String(runtimeConfig.version)
    })
    return () => { active = false }
  }, [])

  return <AiLabWorkspace />
}

export default App
