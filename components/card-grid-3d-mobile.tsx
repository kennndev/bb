'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { availableCards } from '@/lib/card-images'

interface CardGrid3DMobileProps {
  asBackground?: boolean
  scrollProgress?: number
}

export function CardGrid3DMobile({ asBackground = false, scrollProgress = 0 }: CardGrid3DMobileProps) {
  const [time, setTime] = useState(0)
  const [opacity, setOpacity] = useState(0)
  
  // Use 6 rows of 6 cards = 36 cards total for mobile to fill vertical space
  const cards = Array(36).fill(null).map((_, index) => {
    return availableCards[index % availableCards.length]
  })
  
  useEffect(() => {
    let animationFrame: number
    
    const animate = (timestamp: number) => {
      setTime(timestamp / 1000) // Convert to seconds and update state
      animationFrame = requestAnimationFrame(animate)
    }
    
    // Start animation immediately
    animationFrame = requestAnimationFrame(animate)
    
    // Fade in the entire component
    setTimeout(() => {
      setOpacity(1)
    }, 50) // Small delay to ensure smooth transition
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [])
  
  const getCardActivation = (index: number) => {
    // Calculate card position in grid
    const col = index % 6
    const row = Math.floor(index / 6)
    
    // Wave parameters
    const waveSpeed = 0.25 // How fast the wave travels - slower for more relaxed effect
    const waveLength = 2 // How spread out the wave is
    
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
    const tiltX = wavePhase * 6 * finalActivation // Tilt with the wave
    const tiltY = wavePhase * -4 * finalActivation // Slight diagonal tilt
    
    return {
      isActive: finalActivation > 0.7,
      isNear: finalActivation > 0.3,
      activation: finalActivation,
      tiltX,
      tiltY
    }
  }
  
  if (asBackground) {
    return (
      <div 
        className="absolute inset-0 w-full h-full" 
        style={{ 
          zIndex: 1,
          opacity,
          transition: 'opacity 1.5s ease-in-out'
        }}
      >
        {/* Background gradient overlay - darker for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyber-black/60 to-cyber-black pointer-events-none" style={{ zIndex: 2 }} />
        
        {/* Simplified 3D perspective container for mobile */}
        <div 
          className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden"
          style={{
            perspective: '800px',
            perspectiveOrigin: '50% 50%',
          }}
        >
          {/* Grid container with proper width and height calculation */}
          {/* Width: 6 cards * 96px (w-24) + 5 gaps * 12px (gap-3) = 576px + 60px = 636px */}
          {/* Height: 6 rows * 134px (h-[134px]) + 5 gaps * 12px = 804px + 60px = 864px */}
          <div 
            className="grid grid-cols-6 gap-3 absolute"
            style={{
              width: '636px',
              height: '864px',
              transform: 'rotateX(20deg) rotateY(-10deg) translateZ(-30px) scale(1.1)',
              transformStyle: 'preserve-3d',
              top: '0',
              left: '50%',
              marginTop: '-55px', // Negative margin to pull cards up to the very top
              marginLeft: '-318px', // Half of width (636px / 2)
            }}
          >
            {cards.map((_, index) => {
              const { isActive, isNear, activation, tiltX, tiltY } = getCardActivation(index)
              
              // Ultra-simple fade and scale for mobile (no 3D transforms)
              const vanishScale = 1 - (scrollProgress * 0.6) // More dramatic scaling
              const vanishOpacity = 1 - (scrollProgress * 0.6)
              
              return (
                <div
                  key={index}
                  className="relative"
                  style={{
                    transform: `scale(${vanishScale})`,
                    transition: 'transform 0.25s ease-out, opacity 0.25s ease-out',
                    opacity: vanishOpacity,
                  }}
                >
                  {/* Card container with smooth wave-based transform */}
                  <div
                    className="relative"
                    style={{
                      transform: isActive 
                        ? `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(${10 * activation}px) scale(${1 + 0.04 * activation})` 
                        : `perspective(600px) rotateX(${tiltX * 0.5}deg) rotateY(${tiltY * 0.5}deg) translateZ(${5 * activation}px) scale(${1 + 0.02 * activation})`,
                      transformStyle: 'preserve-3d',
                      transition: 'transform 0.25s ease-in-out', // Slightly smoother rise and fall
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
                        opacity: activation * 0.5,
                        transition: 'opacity 0.2s ease-out'
                      }}
                    />
                    
                    {/* Card with fixed aspect ratio */}
                    <div 
                      className="relative w-24 h-[134px]"
                      style={{
                        filter: `brightness(${0.1 + activation * 0.4})`,
                        background: `linear-gradient(135deg, rgba(139, 92, 246, ${0.08 + activation * 0.17}), rgba(34, 211, 238, ${0.08 + activation * 0.17}))`,
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
                            opacity: activation,
                            transition: 'opacity 0.2s ease-out'
                          }}
                        />
                        
                        {/* Card image */}
                        <Image
                          src={cards[index]}
                          alt={`Card ${index + 1}`}
                          fill
                          className="object-fill"
                          priority={index < 6}
                          sizes="96px"
                          loading={index < 6 ? "eager" : "lazy"}
                          quality={75}
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