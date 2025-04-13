'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { Quantum } from 'ldrs/react'
import { useTheme } from 'next-themes'
import 'ldrs/react/Quantum.css'

type OverlayLoaderProps = {
  isLoading: boolean
  size?: number
  speed?: number
}

export function OverlayLoader({ isLoading, size = 50, speed = 2.5 }: OverlayLoaderProps) {
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
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="grounded-radiants absolute inset-0 z-50 bg-transparent backdrop-blur-lg flex flex-col items-center justify-center"
        >
          <Quantum size={size} speed={speed} color={loaderColor} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
