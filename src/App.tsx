import { useEffect, useState } from 'react'
import { CodePenAiLab } from '@/components/CodePenAiLab'
import { LivingPals } from '@/components/LivingPals'
import { ImagesPage } from '@/pages/ImagesPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { SearchCreationsPage } from '@/pages/SearchCreationsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ChatHistoryPage, ConversationPage } from '@/pages/ChatPages'
import { applyRuntimeTheme, fetchRuntimeConfig } from '@/services/runtimeConfigClient'
import './App.css'
import '@/styles/crystal-theme.css'

type Page = 'ai' | 'projects' | 'images' | 'search' | 'settings' | 'chats' | 'conversation'
const HASH_TO_PAGE: Record<string, Page> = { '#projects': 'projects', '#images': 'images', '#search': 'search', '#settings': 'settings', '#chats': 'chats' }
const THEME_KEY = 'pilgrix.settings.theme'

function pageFromHash(): Page {
  if (typeof window === 'undefined') return 'ai'
  if (window.location.hash.startsWith('#chat/')) return 'conversation'
  return HASH_TO_PAGE[window.location.hash] ?? 'ai'
}

function chatIdFromHash(): string {
  if (typeof window === 'undefined') return ''
  return decodeURIComponent(window.location.hash.slice('#chat/'.length))
}

function readTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
}

function applyTheme(theme: 'light' | 'dark'): void {
  document.documentElement.dataset.pilgrixTheme = theme === 'dark' ? 'crystal-night' : 'light'
}

function App(): JSX.Element {
  const [page, setPage] = useState<Page>(pageFromHash)
  const [menuReturnSignal, setMenuReturnSignal] = useState(0)
  const [theme, setTheme] = useState<'light' | 'dark'>(readTheme)

  useEffect(() => { applyTheme(theme) }, [theme])

  useEffect(() => {
    const handleNavigationChange = () => setPage(pageFromHash())
    const handleThemeChange = () => setTheme(readTheme())
    window.addEventListener('hashchange', handleNavigationChange)
    window.addEventListener('popstate', handleNavigationChange)
    window.addEventListener('pilgrix-theme-change', handleThemeChange)
    let active = true
    void fetchRuntimeConfig().then((runtimeConfig) => {
      if (!active || !runtimeConfig) return
      applyRuntimeTheme(runtimeConfig)
      document.documentElement.dataset.runtimeConfigVersion = String(runtimeConfig.version)
    })
    return () => {
      active = false
      window.removeEventListener('hashchange', handleNavigationChange)
      window.removeEventListener('popstate', handleNavigationChange)
      window.removeEventListener('pilgrix-theme-change', handleThemeChange)
    }
  }, [])

  const navigate = (nextPage: Page, returnToMenu = false, chatId = ''): void => {
    if (nextPage === 'ai') {
      if (returnToMenu) setMenuReturnSignal((value) => value + 1)
      if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search)
      setPage('ai')
      return
    }
    const nextHash = nextPage === 'conversation' ? `#chat/${encodeURIComponent(chatId)}` : `#${nextPage}`
    if (window.location.hash !== nextHash) window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`)
    setPage(nextPage)
  }

  if (page === 'projects') return <ProjectsPage onBack={() => navigate('ai', true)} />
  if (page === 'images') return <><ImagesPage onBack={() => navigate('ai', true)} /><LivingPals page="images" /></>
  if (page === 'search') return <SearchCreationsPage onBack={() => navigate('ai', true)} />
  if (page === 'settings') return <SettingsPage onBack={() => navigate('ai', true)} />
  if (page === 'chats') return <ChatHistoryPage onBack={() => navigate('ai', true)} onOpenChat={(id) => navigate('conversation', false, id)} />
  if (page === 'conversation') return <ConversationPage id={chatIdFromHash()} onBack={() => navigate('chats')} />
  return <><CodePenAiLab menuReturnSignal={menuReturnSignal} onOpenProjects={(fromMenu = false) => navigate('projects', fromMenu)} onOpenImages={(fromMenu = false) => navigate('images', fromMenu)} onOpenSearch={(fromMenu = false) => navigate('search', fromMenu)} onOpenSettings={(fromMenu = false) => navigate('settings', fromMenu)} onOpenChats={(fromMenu = false) => navigate('chats', fromMenu)} onOpenConversation={(id) => navigate('conversation', false, id)} /><LivingPals page="ai" /></>
}

export default App
