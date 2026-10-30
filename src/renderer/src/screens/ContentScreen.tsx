import { useMemo } from 'react'
import { groupKind } from '@shared/channel'
import type { Channel, ContentKind } from '@shared/types'
import { useStore } from '../store/useStore'
import { useT } from '../hooks/useT'
import { categoriesOf, sectionToKind } from '../store/selectors'
import { ChannelGrid } from '../components/channels/ChannelGrid'
import { CategoryBar } from '../components/channels/CategoryBar'
import { EmptyState } from '../components/ui/EmptyState'

/**
 * Combina o tipo detectado no parse (kind) com a preferência do usuário:
 * `includeLinearVod` libera canais ao vivo cujo grupo indica filme/série.
 * Padrão (false): abas Filmes/Séries mostram apenas conteúdo sob demanda.
 */
function matchesKind(ch: Channel, kind: ContentKind, includeLinearVod: boolean): boolean {
  if (ch.kind === kind) return true
  if (kind !== 'live' && includeLinearVod && ch.kind === 'live') {
    return groupKind(ch.group) === kind
  }
  return false
}

/**
 * Tela genérica de conteúdo (Canais ao vivo / Filmes / Séries).
 * Combina barra de categorias + grade virtualizada, com navegação por teclado
 * e por mouse (hover sincroniza o foco, clique reproduz).
 */
export function ContentScreen(): JSX.Element {
  const section = useStore((s) => s.section)
  const channels = useStore((s) => s.channels)
  const activeCategory = useStore((s) => s.activeCategory)
  const search = useStore((s) => s.search)
  const includeLinearVod = useStore((s) => s.settings.includeLinearVod)
  const setSection = useStore((s) => s.setSection)
  const t = useT()

  const kind = sectionToKind(section)

  const baseChannels = useMemo(
    () => (kind ? channels.filter((ch) => matchesKind(ch, kind, includeLinearVod)) : []),
    [channels, kind, includeLinearVod]
  )

  const categories = useMemo(() => categoriesOf(baseChannels), [baseChannels])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return baseChannels.filter((ch) => {
      if (activeCategory !== 'Todos' && ch.group !== activeCategory) return false
      if (query) {
        const haystack = `${ch.name} ${ch.group} ${ch.tvgId ?? ''}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  }, [baseChannels, activeCategory, search])

  if (baseChannels.length === 0) {
    const isVod = section === 'movies' || section === 'series'
    return (
      <div className="h-full w-full">
        <EmptyState
          icon={section === 'movies' ? 'movies' : section === 'series' ? 'series' : 'tv'}
          title={
            section === 'movies'
              ? t('content.emptyMovies')
              : section === 'series'
                ? t('content.emptySeries')
                : t('content.emptyLive')
          }
          description={
            isVod && !includeLinearVod ? t('content.emptyDescVod') : t('content.emptyDescLive')
          }
          actionLabel={t('content.goSettings')}
          onAction={() => setSection('settings')}
          focused
        />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      <CategoryBar categories={categories} />
      {filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-8">
          <p className="text-center text-sm text-white/45">
            {t('content.noResults', { query: search || activeCategory })}
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 px-8 pb-4">
          <ChannelGrid key={`${activeCategory}-${filtered.length}`} channels={filtered} />
        </div>
      )}
    </div>
  )
}
