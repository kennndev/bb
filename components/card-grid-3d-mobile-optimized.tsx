'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { availableCards } from '@/lib/card-images'

interface CardGrid3DMobileProps {
  asBackground?: boolean
  scrollProgress?: number
}

export function CardGrid3DMobileOptimized({ asBackground = false, scrollProgress = 0 }: CardGrid3DMobileProps) {
  const [time, setTime] = useState(0)
  const [allImagesLoaded, setAllImagesLoaded] = useState(false)
  const loadedImages = useRef(new Set<number>())
  const animationFrameRef = useRef<number>()
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Use 6 rows of 6 cards = 36 cards total for mobile
  const cards = Array(36).fill(null).map((_, index) => {
    return availableCards[index % availableCards.length]
  })

  const handleImageLoad = useCallback((index: number) => {
    loadedImages.current.add(index)
    // Check if all images are loaded
    if (loadedImages.current.size === cards.length) {
      // Small delay to ensure smooth transition
      requestAnimationFrame(() => {
        setAllImagesLoaded(true)
      })
    }
  }, [cards.length])

  const handleImageError = useCallback((index: number) => {
    // Still count errored images as "loaded" to prevent infinite waiting
    handleImageLoad(index)
  }, [handleImageLoad])
  
  useEffect(() => {
    if (!allImagesLoaded) return // Don't start animation until images are loaded
    
    let lastTime = 0
    const animate = (timestamp: number) => {
      // Only update if enough time has passed (throttle to 30fps on mobile)
      if (timestamp - lastTime > 33) {
        setTime(timestamp / 1000)
        lastTime = timestamp
      }
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    // Start animation after images load
    animationFrameRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [allImagesLoaded])
  
  const getCardActivation = (index: number) => {
    // Calculate card position in grid
    const col = index % 6
    const row = Math.floor(index / 6)
    
    // Wave parameters
    const waveSpeed = 0.25
    const waveLength = 2
    
    // Calculate diagonal distance from top-left corner
    const diagonalDistance = (col + row) / 10
    
    // Create a sine wave that travels diagonally
    const wavePhase = Math.sin((diagonalDistance - time * waveSpeed) * Math.PI * waveLength)
    
    // Convert wave to activation (0 to 1)
    const activation = (wavePhase + 1) / 2
    
    // Add some randomness for more organic feel
    const randomOffset = Math.sin(index * 12.34 + time * 0.2) * 0.1
    const finalActivation = Math.max(0, Math.min(1, activation + randomOffset))
    
    // Calculate tilt based on wave position
    const tiltX = wavePhase * 6 * finalActivation
    const tiltY = wavePhase * -4 * finalActivation
    
    return {
      isActive: finalActivation > 0.7,
      activation: finalActivation,
      tiltX,
      tiltY
    }
  }
  
  if (asBackground) {
    return (
      <div 
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ 
          zIndex: 1,
          opacity: allImagesLoaded ? 1 : 0,
          transition: 'opacity 1.2s ease-in-out'
        }}
      >
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyber-black/60 to-cyber-black pointer-events-none" style={{ zIndex: 2 }} />
        
        {/* Simplified 3D perspective container for mobile */}
        <div 
          className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden"
          style={{
            perspective: '800px',
            perspectiveOrigin: '50% 50%',
          }}
        >
          {/* Grid container */}
          <div 
            className="grid grid-cols-6 gap-3 absolute"
            style={{
              width: '636px',
              height: '864px',
              transform: `rotateX(20deg) rotateY(-10deg) translateZ(-30px) scale(1.1)`,
              transformStyle: 'preserve-3d',
              top: '0',
              left: '50%',
              marginTop: '-55px',
              marginLeft: '-318px',
            }}
          >
            {cards.map((cardSrc, index) => {
              const cardAnimation = allImagesLoaded ? getCardActivation(index) : { activation: 0, tiltX: 0, tiltY: 0, isActive: false }
              
              // Per-card scroll animations
              const vanishScale = 1 - (scrollProgress * 0.6)
              const vanishOpacity = 1 - (scrollProgress * 0.6)
              
              return (
                <div
                  key={index}
                  className="relative"
                  style={{
                    transform: `scale(${vanishScale})`,
                    opacity: vanishOpacity,
                    transition: scrollProgress > 0 ? 'transform 0.25s ease-out, opacity 0.25s ease-out' : 'none'
                  }}
                >
                  {/* Card container with smooth wave-based transform */}
                  <div
                    className="relative"
                    style={{
                      transform: allImagesLoaded && cardAnimation.isActive 
                        ? `perspective(600px) rotateX(${cardAnimation.tiltX}deg) rotateY(${cardAnimation.tiltY}deg) translateZ(${10 * cardAnimation.activation}px) scale(${1 + 0.04 * cardAnimation.activation})` 
                        : `perspective(600px) rotateX(${cardAnimation.tiltX * 0.5}deg) rotateY(${cardAnimation.tiltY * 0.5}deg) translateZ(${5 * cardAnimation.activation}px) scale(${1 + 0.02 * cardAnimation.activation})`,
                      transformStyle: 'preserve-3d',
                      transition: 'transform 0.25s ease-in-out',
                    }}
                  >
                    {/* Card glow effect based on activation */}
                    <div 
                      className="absolute bg-gradient-to-r from-purple-600/30 to-cyan-600/30 rounded-lg blur-md pointer-events-none"
                      style={{
                        top: '-6px',
                        left: '-6px',
                        right: '-6px',
                        bottom: '-6px',
                        zIndex: -1,
                        opacity: cardAnimation.activation * 0.5,
                        transition: 'opacity 0.2s ease-out'
                      }}
                    />
                    
                    {/* Card with fixed aspect ratio */}
                    <div 
                      className="relative w-24 h-[134px]"
                      style={{
                        filter: `brightness(${0.1 + cardAnimation.activation * 0.4})`,
                        background: `linear-gradient(135deg, rgba(139, 92, 246, ${0.08 + cardAnimation.activation * 0.17}), rgba(34, 211, 238, ${0.08 + cardAnimation.activation * 0.17}))`,
                        borderRadius: '6px',
                        padding: '1.5px',
                        transition: 'filter 0.2s ease-out, background 0.2s ease-out',
                      }}
                    >
                      <div className="bg-gray-900 rounded-md overflow-hidden w-full h-full relative">
                        {/* Holographic overlay based on activation */}
                        <div 
                          className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-600/15 to-cyan-600/15 pointer-events-none z-10"
                          style={{
                            opacity: cardAnimation.activation,
                            transition: 'opacity 0.2s ease-out'
                          }}
                        />
                        
                        {/* Card image */}
                        <Image
                          src={cardSrc}
                          alt={`Card ${index + 1}`}
                          fill
                          className="object-fill"
                          priority={index < 6}
                          sizes="96px"
                          loading={index < 6 ? "eager" : "lazy"}
                          quality={75}
                          onLoad={() => handleImageLoad(index)}
                          onError={() => handleImageError(index)}
                        />
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
  
  return null
}