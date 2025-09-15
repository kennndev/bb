"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface LightboxProps {
  images: Array<{
    id: string
    url: string
    title: string
    size?: number | null
    mimeType?: string | null
  }>
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

export function Lightbox({ images, initialIndex = 0, isOpen, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const thumbnailsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  // Auto-scroll thumbnail strip to keep current thumbnail centered
  useEffect(() => {
    if (!thumbnailsRef.current || !isOpen) return
    
    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      const container = thumbnailsRef.current
      if (!container) return
      
      const thumbnails = container.querySelectorAll('button')
      const currentThumbnail = thumbnails[currentIndex] as HTMLElement
      
      if (currentThumbnail) {
        // Always scroll to center the current thumbnail
        const containerWidth = container.clientWidth
        const thumbLeft = currentThumbnail.offsetLeft
        const thumbWidth = currentThumbnail.offsetWidth
        
        // Calculate position to center the thumbnail
        const targetScroll = thumbLeft - (containerWidth / 2) + (thumbWidth / 2)
        
        container.scrollTo({
          left: targetScroll,
          behavior: 'smooth'
        })
      }
    }, 100)
    
    return () => clearTimeout(timeoutId)
  }, [currentIndex, isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      switch (e.key) {
        case "Escape":
          onClose()
          break
        case "ArrowLeft":
          goToPrevious()
          break
        case "ArrowRight":
          goToNext()
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, currentIndex])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
    setLoading(true)
    setImageError(false)
  }, [images.length])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
    setLoading(true)
    setImageError(false)
  }, [images.length])

  if (!isOpen || images.length === 0) return null

  const currentImage = images[currentIndex]
  const placeholder = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#0b0f19"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6ee7ff" font-family="monospace" font-size="18">Loading...</text></svg>`
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onClose}
        >
          {/* Backdrop matching sheet overlay */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm">
            <div className="absolute inset-0 cyber-grid opacity-5" />
            <div className="absolute inset-0 scanlines opacity-10" />
          </div>

          {/* Main content with proper spacing */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 flex flex-col items-center justify-center h-full px-0 md:px-4 py-16"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Container for image and navigation */}
            <div className="relative flex items-center gap-4 w-full md:max-w-[80vw] lg:max-w-[70vw]">
              {/* Desktop close button - positioned above top right */}
              <button
                onClick={onClose}
                className="hidden md:block absolute -top-10 right-0 p-2 text-gray-400 hover:text-cyber-pink transition-colors z-20"
                title="Close (Esc)"
              >
                <X className="w-6 h-6" />
              </button>
              
              {/* Desktop: Left navigation button (hidden on mobile) */}
              {images.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    goToPrevious()
                  }}
                  className="hidden md:flex flex-shrink-0 w-12 h-12 rounded-full bg-cyber-dark/90 backdrop-blur-sm border-2 border-cyber-cyan/50 hover:border-cyber-cyan hover:bg-gray-800/90 active:bg-gray-700/90 transition-all duration-300 items-center justify-center"
                  title="Previous (←)"
                >
                  <ChevronLeft className="w-6 h-6 text-cyber-cyan" />
                </button>
              )}

              {/* Image container with responsive sizing */}
              <div className="relative flex-1 flex items-center justify-center">
                {/* Mobile: Full width container, Desktop: Fixed aspect ratio */}
                <div className="relative h-[60vh] md:h-[70vh] w-screen md:w-[calc(70vh*5/7)] -mx-4 md:mx-0 flex items-center justify-center">
                  {/* Mobile: Inner card container that hugs the image */}
                  <div className="md:hidden relative flex items-center justify-center" style={{ width: 'min(90%, calc(60vh * 5/7))' }}>
                    {/* Mobile close button aligned with card edge */}
                    <button
                      onClick={onClose}
                      className="absolute -top-12 right-0 p-2 text-gray-400 hover:text-cyber-pink transition-colors z-20 md:hidden"
                      title="Close (Esc)"
                    >
                      <X className="w-6 h-6" />
                    </button>
                    <div className="relative w-full aspect-[5/7] bg-gradient-to-br from-cyber-dark/40 to-cyber-dark/80 rounded-2xl border-2 border-cyber-cyan/50 overflow-hidden">
                      {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-cyber-dark/60">
                          <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
                        </div>
                      )}
                      <Image
                        src={imageError ? placeholder : currentImage.url}
                        alt={currentImage.title}
                        fill
                        className="object-fill"
                        sizes="60vw"
                        priority
                        onLoad={() => setLoading(false)}
                        onError={() => {
                          setImageError(true)
                          setLoading(false)
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Desktop: Card container with border */}
                  <div className="hidden md:flex relative h-full w-full items-center justify-center bg-gradient-to-br from-cyber-dark/40 to-cyber-dark/80 rounded-2xl border-2 border-cyber-cyan/50 overflow-hidden">
                    {loading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-cyber-dark/60">
                        <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
                      </div>
                    )}
                    
                    <Image
                      src={imageError ? placeholder : currentImage.url}
                      alt={currentImage.title}
                      fill
                      className="object-fill"
                      sizes="96vw"
                      priority
                      onLoad={() => setLoading(false)}
                      onError={() => {
                        setImageError(true)
                        setLoading(false)
                      }}
                    />
                  </div>
                  
                  {/* Mobile: Overlay navigation buttons */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          goToPrevious()
                        }}
                        className="md:hidden absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-cyber-dark/90 backdrop-blur-sm border-2 border-cyber-cyan/50 hover:border-cyber-cyan hover:bg-gray-800/90 active:bg-gray-700/90 transition-all duration-300 flex items-center justify-center z-10"
                        title="Previous (←)"
                      >
                        <ChevronLeft className="w-5 h-5 text-cyber-cyan" />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          goToNext()
                        }}
                        className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-cyber-dark/90 backdrop-blur-sm border-2 border-cyber-cyan/50 hover:border-cyber-cyan hover:bg-gray-800/90 active:bg-gray-700/90 transition-all duration-300 flex items-center justify-center z-10"
                        title="Next (→)"
                      >
                        <ChevronRight className="w-5 h-5 text-cyber-cyan" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Desktop: Right navigation button (hidden on mobile) */}
              {images.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    goToNext()
                  }}
                  className="hidden md:flex flex-shrink-0 w-12 h-12 rounded-full bg-cyber-dark/90 backdrop-blur-sm border-2 border-cyber-cyan/50 hover:border-cyber-cyan hover:bg-gray-800/90 active:bg-gray-700/90 transition-all duration-300 items-center justify-center"
                  title="Next (→)"
                >
                  <ChevronRight className="w-6 h-6 text-cyber-cyan" />
                </button>
              )}
            </div>

            {/* Thumbnail strip for multiple images */}
            {images.length > 1 && (
              <div className="mt-6 w-full max-w-[90vw] md:max-w-[600px] mx-auto">
                <div ref={thumbnailsRef} className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-2">
                  {images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => {
                      setCurrentIndex(idx)
                      setLoading(true)
                      setImageError(false)
                    }}
                    className={`relative w-16 h-20 rounded border-2 overflow-hidden transition-all flex-shrink-0 ${
                      idx === currentIndex 
                        ? "border-cyber-cyan shadow-[0_0_15px_rgba(34,211,238,0.6)] scale-110" 
                        : "border-cyber-cyan/30 hover:border-cyber-cyan/60 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={img.url}
                      alt={img.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}