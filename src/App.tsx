import { useEffect } from 'react'
import { ReferenceAiLab } from '@/components/ReferenceAiLab'
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

  return <ReferenceAiLab />
}

export default App
