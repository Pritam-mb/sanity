'use client'

import React, { useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import { usePathname } from 'next/navigation'
import 'lenis/dist/lenis.css'

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const lenisRef = useRef<Lenis | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const lenis = new Lenis({
      lerp: 0.09,
      duration: 1.1,
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.2,
      infinite: false,
    })

    lenisRef.current = lenis

    lenis.on('scroll', (e: { progress: number }) => {
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${e.progress})`
      }
    })

    let rafId: number
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }

    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  // Reset scroll position on route change without breaking Next.js navigation
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true })
    }
  }, [pathname])

  return (
    <>
      {mounted && (
        <div
          aria-hidden="true"
          className="fixed top-0 left-0 right-0 z-[100] h-[2px] pointer-events-none origin-left"
        >
          <div
            ref={barRef}
            className="h-full w-full bg-gradient-to-r from-neutral-500 via-white to-neutral-300 origin-left transition-transform duration-75 ease-out shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            style={{ transform: 'scaleX(0)' }}
          />
        </div>
      )}
      {children}
    </>
  )
}
