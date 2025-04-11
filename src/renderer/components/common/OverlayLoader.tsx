'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Quantum } from 'ldrs/react'
import 'ldrs/react/Quantum.css'
import { useTheme } from 'next-themes'

type OverlayLoaderProps = {
  isLoading: boolean
  size?: number
  speed?: number
}

export function OverlayLoader({ isLoading, size = 45, speed = 2.5 }: OverlayLoaderProps) {
  const { theme } = useTheme()

  const loaderColor = theme === 'dark' ? '#fff' : '#000'

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="overlay-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="absolute inset-0 z-50 bg-white/60 dark:bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center"
        >
          <Quantum size={size} speed={speed} color={loaderColor} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
