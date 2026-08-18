import { useEffect, useState } from 'react'
import { Studio } from '@/pages/Studio'
import { applyRuntimeTheme, fetchRuntimeConfig, type RuntimeConfig } from '@/services/runtimeConfigClient'
import './App.css'

function App(): JSX.Element {
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null)

  useEffect(() => {
    let active = true
    void fetchRuntimeConfig().then((config) => {
      if (!active || !config) return
      applyRuntimeTheme(config)
      document.documentElement.dataset.runtimeConfigVersion = String(config.version)
      setRuntimeConfig(config)
    })
    return () => { active = false }
  }, [])

  return <Studio runtimeConfig={runtimeConfig} />
}

export default App
