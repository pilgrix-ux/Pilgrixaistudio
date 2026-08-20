import { useEffect, useState } from 'react'
import { ArrowLeft, Check, ChevronRight, Moon, Shield, UserRound } from 'lucide-react'

const THEME_KEY = 'pilgrix.settings.theme'
const NOTIFICATIONS_KEY = 'pilgrix.settings.notifications'

export function SettingsPage({ onBack }: { onBack: () => void }): JSX.Element {
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(true)

  useEffect(() => {
    setDarkMode(window.localStorage.getItem(THEME_KEY) === 'dark')
    const storedNotifications = window.localStorage.getItem(NOTIFICATIONS_KEY)
    if (storedNotifications !== null) setNotifications(storedNotifications === 'true')
  }, [])

  const toggleTheme = (): void => {
    const next = !darkMode
    setDarkMode(next)
    window.localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  }

  const toggleNotifications = (): void => {
    const next = !notifications
    setNotifications(next)
    window.localStorage.setItem(NOTIFICATIONS_KEY, String(next))
  }

  return (
    <main className="fixed inset-0 z-0 flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-50/95 font-sans text-slate-800">
      <div className="pointer-events-none absolute right-0 top-10 h-80 w-80 rounded-full bg-gradient-to-br from-sky-200/35 to-indigo-200/25 blur-3xl" />
      <header className="relative z-10 flex shrink-0 items-center gap-3 px-5 pb-4 pt-6"><button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/85 text-slate-600 shadow-sm" aria-label="Back"><ArrowLeft size={17} /></button><div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-sky-500">PILGRIX</p><h1 className="text-2xl font-black tracking-tight text-slate-900">Settings</h1></div></header>
      <section className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Account</div>
        <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/80 shadow-sm backdrop-blur-md"><button type="button" className="flex w-full items-center justify-between p-4 text-left"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-500"><UserRound size={18} /></span><div><p className="text-sm font-semibold text-slate-800">Profile</p><p className="text-[10px] text-slate-400">Your account details</p></div></div><ChevronRight size={17} className="text-slate-300" /></button><div className="mx-4 border-t border-slate-200/60" /><button type="button" className="flex w-full items-center justify-between p-4 text-left"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500"><Shield size={18} /></span><div><p className="text-sm font-semibold text-slate-800">Privacy</p><p className="text-[10px] text-slate-400">Control your workspace data</p></div></div><ChevronRight size={17} className="text-slate-300" /></button></div>

        <div className="mb-3 mt-7 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Preferences</div>
        <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/80 shadow-sm backdrop-blur-md"><button type="button" onClick={toggleTheme} className="flex w-full items-center justify-between p-4 text-left"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Moon size={18} /></span><div><p className="text-sm font-semibold text-slate-800">Dark appearance</p><p className="text-[10px] text-slate-400">{darkMode ? 'On' : 'Off'}</p></div></div><span className={`flex h-6 w-10 items-center rounded-full p-1 transition ${darkMode ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'}`}><span className="flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm">{darkMode && <Check size={10} className="text-indigo-600" />}</span></span></button><div className="mx-4 border-t border-slate-200/60" /><button type="button" onClick={toggleNotifications} className="flex w-full items-center justify-between p-4 text-left"><div><p className="text-sm font-semibold text-slate-800">Notifications</p><p className="text-[10px] text-slate-400">{notifications ? 'Enabled' : 'Disabled'}</p></div><span className={`flex h-6 w-10 items-center rounded-full p-1 transition ${notifications ? 'bg-sky-500 justify-end' : 'bg-slate-200 justify-start'}`}><span className="h-4 w-4 rounded-full bg-white shadow-sm" /></span></button></div>
      </section>
    </main>
  )
}
