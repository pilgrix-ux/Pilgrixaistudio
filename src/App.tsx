import { useEffect } from 'react'
import { Studio } from '@/pages/Studio'
import { applyRuntimeTheme, fetchRuntimeConfig } from '@/services/runtimeConfigClient'
import './App.css'

function App(): JSX.Element {
  useEffect(() => {
    let active = true
    void fetchRuntimeConfig().then((config) => {
      if (!active || !config) return
      applyRuntimeTheme(config)
      document.documentElement.dataset.runtimeConfigVersion = String(config.version)
    })
    return () => { active = false }
  }, [])

  return <Studio />
}

export default App
