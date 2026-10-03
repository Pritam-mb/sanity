'use client'

import { useState, useCallback } from 'react'

export interface ChartCursorPos {
  x: number
  y: number
}

export interface UseChartCursorOptions {
  tooltipWidth?: number
  tooltipHeight?: number
  offsetX?: number
  offsetY?: number
  alwaysFlipX?: boolean
}

export function useChartCursor(options?: UseChartCursorOptions) {
  const [pos, setPos] = useState<ChartCursorPos | null>(null)

  const tooltipWidth = options?.tooltipWidth ?? 185
  const tooltipHeight = options?.tooltipHeight ?? 85
  const offsetX = options?.offsetX ?? 14
  const offsetY = options?.offsetY ?? 14
  const alwaysFlipX = options?.alwaysFlipX ?? false

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      let posX = x + offsetX
      let posY = y + offsetY

      if (alwaysFlipX || x > rect.width - tooltipWidth - 10) {
        posX = x - tooltipWidth - 10
      }

      if (y > rect.height - tooltipHeight - 10) {
        posY = y - tooltipHeight - 10
      }

      setPos({
        x: Math.round(posX),
        y: Math.round(posY),
      })
    },
    [tooltipWidth, tooltipHeight, offsetX, offsetY, alwaysFlipX]
  )

  const onMouseLeave = useCallback(() => {
    setPos(null)
  }, [])

  return {
    pos,
    onMouseMove,
    onMouseLeave,
  }
}
