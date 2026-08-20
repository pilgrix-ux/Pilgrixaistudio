import { useEffect } from 'react'
import { CodePenAiLab } from '@/components/CodePenAiLab'
import { applyRuntimeTheme, fetchRuntimeConfig } from '@/services/runtimeConfigClient'
import './App.css'

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

  // Keep the app entrypoint current so the connected Vercel project picks up the latest UI commit.
  return <CodePenAiLab />
}

export default App
