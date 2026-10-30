import { useEffect, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { useKeyHandler } from './useKeyHandler'

/**
 * Teclas globais do app:
 *  - Escape: fecha guia > sai da tela cheia > fecha player > limpa busca > foca menu lateral
 *  - Letras/Backspace: busca incremental (modo TV)
 *  - F11: tela cheia
 */
export function useGlobalKeys(): void {
  const booted = useStore((s) => s.booted)

  useKeyHandler(
    (event) => {
      const state = useStore.getState()

      if (event.key === 'Escape') {
        event.preventDefault()
        if (state.player.showGuide) {
          state.toggleGuide(false)
          return
        }
        if (state.player.isOpen) {
          if (document.fullscreenElement) {
            void document.exitFullscreen()
          } else {
            state.closePlayer()
          }
          return
        }
        if (state.search) {
          state.setSearch('')
          return
        }
        state.setFocusArea('sidebar')
        return
      }

      if (event.key === 'F11') {
        event.preventDefault()
        toggleFullscreen()
        return
      }

      // Busca incremental apenas na área de conteúdo das telas de catálogo
      if (state.player.isOpen || state.section === 'settings' || state.section === 'home') return
      if (state.focusArea !== 'content') return

      if (event.key === 'Backspace' && state.search) {
        event.preventDefault()
        state.setSearch(state.search.slice(0, -1))
        return
      }

      if (event.key.length === 1 && /\S/.test(event.key) && !event.ctrlKey && !event.metaKey) {
        const next = `${state.search}${event.key}`
        state.setSearch(next)
      }
    },
    booted
  )
}

export function toggleFullscreen(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen()
  } else {
    void document.documentElement.requestFullscreen().catch(() => {
      /* permissões podem negar; ignora */
    })
  }
}

/**
 * Sincroniza o EPG (programa atual/próximo) dos canais visíveis na tela.
 * Faz batching por IPC e atualiza a cada 60s — evita consultas pesadas por card.
 */
export function useEpgSync(): void {
  const visibleIds = useStore((s) => s.epgVisibleIds)
  const loaded = useStore((s) => s.epgStats?.loaded ?? false)
  const mergedKey = useMemo(() => visibleIds.join('|'), [visibleIds])

  useEffect(() => {
    if (!loaded || mergedKey.length === 0) return
    const ids = mergedKey.split('|')
    let cancelled = false

    const run = async (): Promise<void> => {
      const batch = await window.mmz.epg.nowNext(ids)
      if (!cancelled) useStore.getState().mergeEpg(batch)
    }

    const debounce = setTimeout(run, 400)
    const interval = setInterval(run, 60_000)

    return () => {
      cancelled = true
      clearTimeout(debounce)
      clearInterval(interval)
    }
  }, [loaded, mergedKey])
}
