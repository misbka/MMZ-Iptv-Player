import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FixedSizeGrid } from 'react-window'
import type { GridChildComponentProps } from 'react-window'
import type { Channel } from '@shared/types'
import { useKeyHandler } from '../../hooks/useKeyHandler'
import { useStore } from '../../store/useStore'
import { ChannelCard } from './ChannelCard'

const GAP = 20
const TARGET_CARD_WIDTH = 268
const TEXT_AREA_HEIGHT = 74

interface CellData {
  channels: Channel[]
  columns: number
  focusIndex: number
  active: boolean
  onHover: (index: number) => void
}

interface Props {
  channels: Channel[]
}

/**
 * Grade virtualizada (react-window) com navegação por teclado estilo Smart TV.
 * Renderiza apenas os cards visíveis — essencial para listas com milhares de canais.
 */
export function ChannelGrid({ channels }: Props): JSX.Element {
  const play = useStore((s) => s.play)
  const focusArea = useStore((s) => s.focusArea)
  const contentFocus = useStore((s) => s.contentFocus)
  const setContentFocus = useStore((s) => s.setContentFocus)
  const setFocusArea = useStore((s) => s.setFocusArea)
  const setEpgVisibleIds = useStore((s) => s.setEpgVisibleIds)
  const playerOpen = useStore((s) => s.player.isOpen)

  const containerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<FixedSizeGrid<CellData>>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [focusIndex, setFocusIndex] = useState(0)

  // Mede o container para calcular colunas responsivas
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect) setSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) })
    })
    observer.observe(el)
    setSize({ width: el.clientWidth, height: el.clientHeight })
    return () => observer.disconnect()
  }, [])

  const columns = Math.max(1, Math.floor(size.width / (TARGET_CARD_WIDTH + GAP)))
  const columnWidth = size.width > 0 ? size.width / columns : TARGET_CARD_WIDTH
  const cardWidth = Math.max(160, columnWidth - GAP)
  const cardHeight = Math.round((cardWidth * 9) / 16) + TEXT_AREA_HEIGHT
  const rowHeight = cardHeight + GAP
  const rowCount = Math.ceil(channels.length / columns)
  const active = focusArea === 'content' && contentFocus === 'grid' && !playerOpen

  // Zera o foco quando a lista muda (busca/categoria)
  useEffect(() => {
    setFocusIndex(0)
  }, [channels.length, columns])

  // Rola até o card focado
  useEffect(() => {
    if (!active || size.height === 0 || channels.length === 0) return
    const row = Math.floor(focusIndex / columns)
    const col = focusIndex % columns
    gridRef.current?.scrollToItem({ rowIndex: row, columnIndex: col, align: 'auto' })
  }, [focusIndex, active, columns, size.height, channels.length])

  // Notifica quais canais estão visíveis (para sincronizar o EPG em lote)
  const handleItemsRendered = useCallback(
    (info: {
      visibleRowStartIndex: number
      visibleRowStopIndex: number
      visibleColumnStartIndex: number
      visibleColumnStopIndex: number
    }) => {
      if (channels.length === 0) return
      const start = info.visibleRowStartIndex * columns + info.visibleColumnStartIndex
      const end = Math.min(
        channels.length - 1,
        info.visibleRowStopIndex * columns + info.visibleColumnStopIndex
      )
      const ids: string[] = []
      for (let i = start; i <= end; i++) {
        const id = channels[i]?.tvgId
        if (id) ids.push(id)
      }
      setEpgVisibleIds(ids)
    },
    [channels, columns, setEpgVisibleIds]
  )

  useKeyHandler(
    (event) => {
      if (channels.length === 0) return
      const row = Math.floor(focusIndex / columns)
      const col = focusIndex % columns

      switch (event.key) {
        case 'ArrowRight': {
          event.preventDefault()
          const next = Math.min(focusIndex + 1, channels.length - 1)
          setFocusIndex(next)
          break
        }
        case 'ArrowLeft': {
          event.preventDefault()
          if (col === 0) {
            // Borda esquerda: volta para a barra de categorias
            setContentFocus('filters')
          } else {
            setFocusIndex(focusIndex - 1)
          }
          break
        }
        case 'ArrowDown': {
          event.preventDefault()
          const next = focusIndex + columns
          if (next < channels.length) setFocusIndex(next)
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          if (row === 0) {
            // Borda superior: volta para a barra de categorias
            setContentFocus('filters')
          } else {
            setFocusIndex(focusIndex - columns)
          }
          break
        }
        case 'Enter':
        case ' ': {
          event.preventDefault()
          const channel = channels[focusIndex]
          if (channel) play(channel.id)
          break
        }
        case 'Tab': {
          event.preventDefault()
          setFocusArea('sidebar')
          break
        }
        default:
          break
      }
    },
    active
  )

  // Hover do mouse: sincroniza o foco de teclado com o card apontado,
  // para que clique e setas operem sobre o mesmo item.
  // Usamos `mousemove` (e não `mouseenter`): o ponteiro parado não gera o
  // evento, então trocas de tela/remeontagens não "roubam" o foco de quem
  // navega por teclado ou controle remoto.
  const handleHover = useCallback(
    (index: number) => {
      if (playerOpen) return
      setFocusArea('content')
      setContentFocus('grid')
      setFocusIndex(index)
    },
    [playerOpen, setFocusArea, setContentFocus]
  )

  const itemData = useMemo<CellData>(
    () => ({ channels, columns, focusIndex, active, onHover: handleHover }),
    [channels, columns, focusIndex, active, handleHover]
  )

  const Cell = useCallback(
    ({ columnIndex, rowIndex, data, style }: GridChildComponentProps<CellData>) => {
      const index = rowIndex * data.columns + columnIndex
      const channel = data.channels[index]
      if (!channel) return <div style={style} />
      const epg = useStore((s) => s.epg[channel.tvgId ?? ''])
      return (
        <div
          style={{ ...style, paddingRight: GAP, paddingBottom: GAP }}
          onMouseMove={() => data.onHover(index)}
        >
          <ChannelCard channel={channel} epg={epg} focused={data.active && data.focusIndex === index} />
        </div>
      )
    },
    []
  )

  return (
    <div ref={containerRef} className="h-full w-full">
      {size.width > 0 && size.height > 0 && channels.length > 0 && (
        <FixedSizeGrid<CellData>
          ref={gridRef}
          columnCount={columns}
          columnWidth={columnWidth}
          height={size.height}
          rowCount={rowCount}
          rowHeight={rowHeight}
          width={size.width}
          itemData={itemData}
          overscanRowCount={1}
          overscanColumnCount={1}
          onItemsRendered={handleItemsRendered}
          itemKey={({ columnIndex, rowIndex }) => {
            const channel = channels[rowIndex * columns + columnIndex]
            return channel ? channel.id : `${rowIndex}-${columnIndex}`
          }}
        >
          {Cell}
        </FixedSizeGrid>
      )}
    </div>
  )
}
