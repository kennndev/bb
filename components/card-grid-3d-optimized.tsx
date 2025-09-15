'use client'

import { useState, useRef, MouseEvent, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { availableCards } from '@/lib/card-images'

interface CardGrid3DProps {
  asBackground?: boolean
  scrollProgress?: number
  onImagesLoaded?: () => void
}

export function CardGrid3D({ asBackground = false, scrollProgress = 0, onImagesLoaded }: CardGrid3DProps) {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isSafari, setIsSafari] = useState(false)
  const [allImagesLoaded, setAllImagesLoaded] = useState(false)
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false)
  const throttleRef = useRef<NodeJS.Timeout | null>(null)
  const loadedImages = useRef(new Set<number>())
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Create array of 80 cards, cycling through available images if less than 80 unique ones
  const cards = Array(80).fill(null).map((_, index) => {
    return availableCards[index % availableCards.length]
  })

  useEffect(() => {
    // Detect Safari browser
    const isSafariBrowser = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    setIsSafari(isSafariBrowser)
    
    // Mark that initial animation has played after a delay
    const animTimer = setTimeout(() => {
      setHasAnimatedIn(true)
    }, 2000) // After initial animation completes
    
    // Force Safari to re-render after a short delay
    if (isSafariBrowser) {
      const timer = setTimeout(() => {
        // Force a repaint by toggling a CSS property
        if (containerRef.current) {
          containerRef.current.style.display = 'none'
          containerRef.current.offsetHeight // Force reflow
          containerRef.current.style.display = ''
        }
      }, 100)
      
      return () => {
        clearTimeout(timer)
        clearTimeout(animTimer)
      }
    }
    
    // Cleanup throttle timeout on unmount
    return () => {
      clearTimeout(animTimer)
      if (throttleRef.current) {
        clearTimeout(throttleRef.current)
      }
    }
  }, [])

  const handleImageLoad = useCallback((index: number) => {
    loadedImages.current.add(index)
    // Check if all images are loaded
    if (loadedImages.current.size === cards.length) {
      // Small delay to ensure smooth transition
      requestAnimationFrame(() => {
        setAllImagesLoaded(true)
        // Notify parent component that images are loaded
        if (onImagesLoaded) {
          onImagesLoaded()
        }
      })
    }
  }, [cards.length, onImagesLoaded])

  const handleImageError = useCallback((index: number) => {
    // Still count errored images as "loaded" to prevent infinite waiting
    handleImageLoad(index)
  }, [handleImageLoad])
  
  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    // Skip tilt calculations for Safari to avoid jitter
    if (isSafari) return
    
    // Throttle the mouse move events to prevent infinite loop
    if (throttleRef.current) return
    
    throttleRef.current = setTimeout(() => {
      throttleRef.current = null
    }, 16) // ~60fps
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    // Calculate tilt based on cursor position (-45 to 45 degrees for more pronounced effect)
    const tiltX = ((y - centerY) / centerY) * -45
    const tiltY = ((x - centerX) / centerX) * 45
    
    setTilt({ x: tiltX, y: tiltY })
  }, [isSafari])
  
  const handleMouseLeave = () => {
    setHoveredCard(null)
    setTilt({ x: 0, y: 0 })
  }
  
  if (asBackground) {
    return (
      <div 
        ref={containerRef}
        className={`absolute inset-0 w-full h-full card-grid-3d-container ${allImagesLoaded ? 'loaded' : ''}`} 
        style={{ 
          zIndex: 1,
          opacity: allImagesLoaded ? 1 : 0,
          transition: 'opacity 1.5s ease-in-out'
        }}>
        {/* Background gradient overlay - no pointer events */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-70% via-cyber-black/50 to-cyber-black pointer-events-none" style={{ zIndex: 2 }} />
        
        {/* 3D perspective container - allow pointer events on cards only */}
        <div 
          className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden"
          style={{
            perspective: '1200px',
            WebkitPerspective: '1200px',
            perspectiveOrigin: '50% 50%',
            WebkitPerspectiveOrigin: '50% 50%',
            transform: 'translateZ(0)',
            WebkitTransform: 'translateZ(0)',
            // Force GPU acceleration for Safari
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <div 
            className="grid grid-cols-[repeat(auto-fill,8rem)] md:grid-cols-[repeat(auto-fill,10rem)] lg:grid-cols-[repeat(auto-fill,12rem)] gap-4 md:gap-6 min-[1749px]:gap-x-6 min-[1749px]:gap-y-0 absolute w-[200%] h-[200%] -top-[50%] -left-[50%] p-8 justify-center"
            style={{
              transform: 'rotateX(25deg) rotateY(-12deg) translateZ(-50px) scale(0.9)',
              WebkitTransform: 'rotateX(25deg) rotateY(-12deg) translateZ(-50px) scale(0.9)',
              transformStyle: isSafari ? 'flat' : 'preserve-3d',
              WebkitTransformStyle: isSafari ? 'flat' : 'preserve-3d',
              // Force layer creation
              willChange: 'transform',
            }}
          >
            {cards.map((_, index) => {
              // Simple vanishing effect - cards move back into distance
              const vanishZ = -scrollProgress * 800 // Move away from viewer
              const vanishScale = 1 - (scrollProgress * 0.5) // Shrink as they move away
              const vanishOpacity = 1 - (scrollProgress * 0.6) // Fade as they move away
              
              return (
                <div
                  key={index}
                  className="relative flex-shrink-0"
                  style={{
                    opacity: vanishOpacity,
                    transform: `scale(${vanishScale}) translateZ(${vanishZ}px)`,
                    WebkitTransform: `scale(${vanishScale}) translateZ(${vanishZ}px)`,
                    transition: 'transform 0.6s ease-out, opacity 0.6s ease-out',
                    WebkitTransition: '-webkit-transform 0.6s ease-out, opacity 0.6s ease-out',
                  }}
                >
                  <div
                    className="relative group"
                    style={{
                      // Flatten transform hierarchy for Safari
                      transformStyle: isSafari ? 'flat' : 'preserve-3d',
                      WebkitTransformStyle: isSafari ? 'flat' : 'preserve-3d',
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      // Pre-promote to GPU layer
                      willChange: hoveredCard === index ? 'transform' : 'auto',
                      transform: 'translateZ(0)',
                      WebkitTransform: 'translateZ(0)',
                    }}
                    onMouseEnter={() => setHoveredCard(index)}
                    onMouseLeave={handleMouseLeave}
                    onMouseMove={handleMouseMove}
                  >
                    {/* Card container with hover transform and tilt */}
                    <div
                      className="relative"
                      style={{
                        transform: hoveredCard === index 
                          ? isSafari
                            ? 'translateY(-20px) scale(1.08)' // Simplified for Safari - no 3D rotation
                            : `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(20px) translateY(-20px) scale(1.08)`
                          : 'translate3d(0, 0, 0) scale(1)',
                        WebkitTransform: hoveredCard === index 
                          ? isSafari
                            ? 'translateY(-20px) scale(1.08)'
                            : `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(20px) translateY(-20px) scale(1.08)`
                          : 'translate3d(0, 0, 0) scale(1)',
                        transformStyle: isSafari ? 'flat' : 'preserve-3d',
                        WebkitTransformStyle: isSafari ? 'flat' : 'preserve-3d',
                        transition: hoveredCard === index 
                          ? isSafari ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 0.5s ease-out'
                          : isSafari ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 1s ease-in-out',
                        WebkitTransition: hoveredCard === index 
                          ? isSafari ? '-webkit-transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : '-webkit-transform 0.5s ease-out'
                          : isSafari ? '-webkit-transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : '-webkit-transform 1s ease-in-out',
                        // Fix transform origin for stability
                        transformOrigin: '50% 50% 0',
                        WebkitTransformOrigin: '50% 50% 0',
                      }}
                    >
                    {/* Card glow effect on hover - positioned to not affect layout */}
                    <div 
                      className={`absolute bg-gradient-to-r from-purple-600/40 to-cyan-600/40 rounded-lg blur-lg pointer-events-none ${
                        hoveredCard === index ? 'opacity-100' : 'opacity-0'
                      }`}
                      style={{
                        top: '-8px',
                        left: '-8px',
                        right: '-8px',
                        bottom: '-8px',
                        zIndex: -1,
                        transition: hoveredCard === index 
                          ? 'opacity 0.5s ease-out' 
                          : 'opacity 1s ease-in-out',
                        WebkitTransition: hoveredCard === index 
                          ? 'opacity 0.5s ease-out' 
                          : 'opacity 1s ease-in-out'
                      }}
                    />
                    
                    {/* Card container with fixed 5:7 aspect ratio */}
                    <div 
                      className={`relative w-32 h-[179px] md:w-40 md:h-[224px] lg:w-48 lg:h-[269px] ${
                        hoveredCard === index ? 'brightness-110' : 'brightness-[0.15]'
                      }`}
                      style={{
                        background: hoveredCard === index 
                          ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(34, 211, 238, 0.3))' 
                          : 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(34, 211, 238, 0.1))',
                        borderRadius: '8px',
                        padding: '2px',
                        transition: hoveredCard === index 
                          ? 'filter 0.5s ease-out, background 0.5s ease-out' 
                          : 'filter 1s ease-in-out, background 1s ease-in-out',
                        WebkitTransition: hoveredCard === index 
                          ? 'filter 0.5s ease-out, background 0.5s ease-out' 
                          : 'filter 1s ease-in-out, background 1s ease-in-out'
                      }}
                    >
                      <div className="bg-gray-900 rounded-lg overflow-hidden w-full h-full relative">
                        {/* Holographic overlay on hover */}
                        <div 
                          className={`absolute inset-0 bg-gradient-to-br from-transparent via-purple-600/10 to-cyan-600/10 pointer-events-none z-10 ${
                            hoveredCard === index ? 'opacity-100' : 'opacity-0'
                          }`}
                          style={{
                            transition: hoveredCard === index 
                              ? 'opacity 0.5s ease-out' 
                              : 'opacity 1s ease-in-out',
                            WebkitTransition: hoveredCard === index 
                              ? 'opacity 0.5s ease-out' 
                              : 'opacity 1s ease-in-out'
                          }}
                        />
                        
                        {/* Card image with 5:7 aspect ratio */}
                        <Image
                          src={cards[index]}
                          alt={`Card ${index + 1}`}
                          fill
                          className="object-fill will-change-transform"
                          priority={index < 20}
                          sizes="(max-width: 768px) 128px, (max-width: 1024px) 160px, 192px"
                          loading={isSafari || index < 20 ? "eager" : "lazy"}
                          quality={90}
                          onLoad={() => handleImageLoad(index)}
                          onError={() => handleImageError(index)}
                        />
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }
  
  // Non-background implementation remains the same as original
  return null
}