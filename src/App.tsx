import { useEffect } from 'react'
import { Studio } from '@/pages/Studio'
import { applyRuntimeTheme, fetchRuntimeConfig } from '@/services/runtimeConfigClient'
import './App.css'

function App(): JSX.Element {
  useEffect(() => {
    let active = true
    const load = async () => {
      const config = await fetchRuntimeConfig()
      if (!active || !config) return
      applyRuntimeTheme(config)

      const root = document.documentElement
      root.dataset.runtimeConfigVersion = String(config.version)

      const nav = document.querySelectorAll('.bottom-nav button')
      const navKeys = ['aiLab', 'main', 'me'] as const
      nav.forEach((button, index) => {
        const key = navKeys[index]
        const item = config.navigation?.[key]
        if (!item) return
        button.toggleAttribute('hidden', !item.enabled)
        const label = button.querySelector('span')
        if (label) label.textContent = item.label
      })

      const eyebrow = document.querySelector('.ai-heading .eyebrow')
      if (eyebrow) eyebrow.textContent = config.aiLab.eyebrow
      const heading = document.querySelector('.ai-heading h1')
      if (heading) {
        heading.childNodes[0].textContent = `${config.aiLab.heading}\n`
        const accent = heading.querySelector('span')
        if (accent) accent.textContent = config.aiLab.headingAccent
      }
      const composer = document.querySelector<HTMLTextAreaElement>('.composer textarea')
      if (composer) composer.placeholder = config.aiLab.composerPlaceholder

      const welcome = document.querySelector('.message.ai .message-body p')
      if (welcome) welcome.textContent = config.aiLab.welcome

      const starterButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.starter-row button'))
      starterButtons.forEach((button) => button.setAttribute('hidden', ''))
      config.aiLab.starterPrompts.slice(0, starterButtons.length).forEach((item, index) => {
        const button = starterButtons[index]
        button.removeAttribute('hidden')
        const strong = button.querySelector('strong')
        const small = button.querySelector('small')
        if (strong) strong.textContent = item.title
        if (small) small.textContent = item.detail
      })

      const toolButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.tool-list button'))
      toolButtons.forEach((button) => button.setAttribute('hidden', ''))
      config.aiLab.tools.filter((item) => item.enabled).slice(0, toolButtons.length).forEach((item, index) => {
        const button = toolButtons[index]
        button.removeAttribute('hidden')
        const strong = button.querySelector('strong')
        const small = button.querySelector('small')
        if (strong) strong.textContent = item.title
        if (small) small.textContent = item.detail
      })

      const workingTitle = document.querySelector('.working-row strong')
      const workingSubtitle = document.querySelector('.working-row p')
      if (workingTitle) workingTitle.textContent = config.aiLab.workingTitle
      if (workingSubtitle) workingSubtitle.textContent = config.aiLab.workingSubtitle
    }
    void load()
    return () => { active = false }
  }, [])

  return <Studio />
}

export default App
