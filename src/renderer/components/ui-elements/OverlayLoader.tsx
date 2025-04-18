'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Quantum } from 'ldrs/react'
import 'ldrs/react/Quantum.css'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

type OverlayLoaderProps = {
  isLoading: boolean
  size?: number
  speed?: number
  delayMs?: number
}

export function OverlayLoader({
  isLoading,
  size = 50,
  speed = 2.5,
  delayMs = 400, // Delay để giữ loader lâu hơn
}: OverlayLoaderProps) {
  const { theme } = useTheme()
  const loaderColor = theme === 'dark' ? '#fff' : '#000'

  const [shouldRender, setShouldRender] = useState(isLoading)

  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (!isLoading) {
      timeout = setTimeout(() => setShouldRender(false), delayMs)
    } else {
      setShouldRender(true)
    }
    return () => clearTimeout(timeout)
  }, [isLoading, delayMs])

  return (
    <AnimatePresence>
      {shouldRender && (
        <motion.div
          key="overlay-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="grounded-radiants absolute inset-0 z-50 bg-transparent backdrop-blur-lg flex flex-col items-center justify-center"
        >
          <Quantum size={size} speed={speed} color={loaderColor} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
