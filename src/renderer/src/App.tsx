import { useEffect } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { PlayerOverlay } from './components/player/PlayerOverlay'
import { Toast } from './components/ui/Toast'
import { useEpgSync, useGlobalKeys } from './hooks/useAppKeys'
import { useT } from './hooks/useT'
import { HomeScreen } from './screens/HomeScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ContentScreen } from './screens/ContentScreen'
import { useStore } from './store/useStore'

export default function App(): JSX.Element {
  const booted = useStore((s) => s.booted)
  const section = useStore((s) => s.section)
  const playerOpen = useStore((s) => s.player.isOpen)
  const t = useT()

  useEffect(() => {
    void useStore.getState().boot()
  }, [])

  useGlobalKeys()
  useEpgSync()

  if (!booted) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-mmz-bg">
        <div className="text-4xl font-extrabold tracking-tight">
          MMZ <span className="gradient-text">IPTV PLAYER</span>
        </div>
        <div className="h-1 w-56 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-mmz-accent" />
        </div>
        <p className="text-sm text-white/50">{t('app.loading')}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-mmz-bg font-sans text-white">
      <Sidebar />

      <main className="relative flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="min-h-0 flex-1 overflow-hidden">
          {section === 'home' && <HomeScreen />}
          {(section === 'live' || section === 'movies' || section === 'series') && (
            <ContentScreen key={section} />
          )}
          {section === 'settings' && <SettingsScreen />}
        </div>
      </main>

      {playerOpen && <PlayerOverlay />}
      <Toast />
    </div>
  )
}
