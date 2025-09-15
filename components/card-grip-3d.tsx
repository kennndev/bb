'use client'

import { useState, useRef, MouseEvent, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { availableCards } from '@/lib/card-images'

interface CardGrid3DProps {
  asBackground?: boolean
  scrollProgress?: number
}

export function CardGrid3D({ asBackground = false, scrollProgress = 0 }: CardGrid3DProps) {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isSafari, setIsSafari] = useState(false)
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false)
  const throttleRef = useRef<NodeJS.Timeout | null>(null)
  
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
        const container = document.querySelector('.card-grid-3d-container')
        if (container) {
          (container as HTMLElement).style.display = 'none'
          ;(container as HTMLElement).offsetHeight // Force reflow
          ;(container as HTMLElement).style.display = ''
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
  
  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
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
    
    // Calculate tilt based on cursor position (-20 to 20 degrees for more pronounced effect)
    const tiltX = ((y - centerY) / centerY) * -20
    const tiltY = ((x - centerX) / centerX) * 20
    
    setTilt({ x: tiltX, y: tiltY })
  }, [])
  
  const handleMouseLeave = (index: number) => {
    setHoveredCard(null)
    setTilt({ x: 0, y: 0 })
  }
  
  if (asBackground) {
    return (
      <div className="absolute inset-0 w-full h-full card-grid-3d-container" style={{ zIndex: 1 }}>
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
          }}
        >
          <div 
            className="grid grid-cols-[repeat(auto-fill,8rem)] md:grid-cols-[repeat(auto-fill,10rem)] lg:grid-cols-[repeat(auto-fill,12rem)] gap-4 md:gap-6 min-[1749px]:gap-x-6 min-[1749px]:gap-y-0 absolute w-[200%] h-[200%] -top-[50%] -left-[50%] p-8 justify-center"
            style={{
              transform: 'rotateX(25deg) rotateY(-12deg) translateZ(-50px) scale(0.9)',
              transformStyle: 'preserve-3d',
            }}
          >
            {cards.map((_, index) => {
              // Simple sequential delay for left-to-right, top-to-bottom flow
              const initialDelay = index * 0.02 // Sequential wave effect for initial animation
              
              // Simple vanishing effect - cards move back into distance
              const vanishZ = -scrollProgress * 800 // Move away from viewer
              const vanishScale = 1 - (scrollProgress * 0.5) // Shrink as they move away
              const vanishOpacity = 1 - (scrollProgress * 0.6) // Fade as they move away
              
              return (
                <motion.div
                  key={index}
                  className="relative group flex-shrink-0"
                  style={{
                    transformStyle: 'preserve-3d',
                    WebkitTransformStyle: 'preserve-3d',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                  onMouseEnter={() => setHoveredCard(index)}
                  onMouseLeave={() => handleMouseLeave(index)}
                  onMouseMove={handleMouseMove}
                  initial={{ 
                    opacity: 0, 
                    rotateY: -45, // Reduced rotation for Safari
                    scale: 0.8,
                    x: -20,
                    y: 20
                  }}
                  animate={{ 
                    opacity: vanishOpacity,
                    rotateY: 0, // Keep the rotation at 0 after initial animation
                    rotateX: 0,
                    scale: vanishScale,
                    x: 0,
                    y: 0,
                    z: vanishZ
                  }}
                  transition={{ 
                    delay: !hasAnimatedIn ? initialDelay : 0,
                    duration: !hasAnimatedIn ? 1.5 : 0.6,
                    ease: scrollProgress > 0 ? "easeOut" : "easeInOut"
                  }}
                >
                {/* Card container with hover transform and tilt */}
                <div
                  className="relative"
                  style={{
                    transform: hoveredCard === index 
                      ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(30px) translateY(-8px) scale(1.05)` 
                      : 'rotateX(0deg) rotateY(0deg) translateZ(0px) translateY(0px) scale(1)',
                    transformStyle: 'preserve-3d',
                    transition: hoveredCard === index 
                      ? 'transform 0.5s ease-out' // Slower up
                      : 'transform 1s ease-in-out', // Slow down
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
                        : 'filter 1s ease-in-out, background 1s ease-in-out'
                    }}
                  >
                    <div className="bg-gray-900 rounded-lg overflow-hidden w-full h-full relative" style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}>
                      {/* Holographic overlay on hover */}
                      <div 
                        className={`absolute inset-0 bg-gradient-to-br from-transparent via-purple-600/10 to-cyan-600/10 pointer-events-none z-10 ${
                          hoveredCard === index ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{
                          transition: hoveredCard === index 
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
                        style={{
                          WebkitTransform: 'translateZ(0)',
                          transform: 'translateZ(0)',
                        }}
                      />
                    </div>
                  </div>
                </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      
      {/* Cyberpunk glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[128px] animate-pulse delay-1000" />
      
      <div className="relative z-10 container mx-auto px-4 py-20">
        <h1 className="text-5xl font-bold text-center mb-16 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
          Card Gallery
        </h1>
        
        {/* 3D perspective container */}
        <div 
          className="relative mx-auto max-w-7xl"
          style={{
            perspective: '1000px',
            perspectiveOrigin: '50% 50%'
          }}
        >
          <div 
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 p-8"
            style={{
              transform: 'rotateX(15deg) rotateY(-5deg)',
              transformStyle: 'preserve-3d'
            }}
          >
            {cards.map((_, index) => (
              <motion.div
                key={index}
                className="relative group"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: hoveredCard === index ? 'translateZ(50px)' : 'translateZ(0px)',
                  transition: 'transform 0.3s ease'
                }}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {/* Card glow effect */}
                <div 
                  className={`absolute -inset-1 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg blur-md transition-all duration-300 ${
                    hoveredCard === index ? 'opacity-75' : 'opacity-0'
                  }`}
                />
                
                {/* Card shadow */}
                <div 
                  className={`absolute inset-0 bg-black/50 rounded-lg blur-xl transition-all duration-300 ${
                    hoveredCard === index ? 'translate-y-4 opacity-30' : 'translate-y-2 opacity-20'
                  }`}
                  style={{
                    transform: hoveredCard === index ? 'translateZ(-30px) translateY(20px)' : 'translateZ(-20px) translateY(10px)'
                  }}
                />
                
                {/* Card container */}
                <div 
                  className={`relative bg-gray-900 rounded-lg overflow-hidden border transition-all duration-300 ${
                    hoveredCard === index 
                      ? 'border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.5)]' 
                      : 'border-gray-800'
                  }`}
                >
                  {/* Holographic overlay */}
                  <div 
                    className={`absolute inset-0 bg-gradient-to-br from-transparent via-purple-600/10 to-cyan-600/10 pointer-events-none transition-opacity duration-300 ${
                      hoveredCard === index ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  
                  {/* Scan line effect */}
                  {hoveredCard === index && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan" />
                    </div>
                  )}
                  
                  {/* Card image */}
                  <div className="aspect-[2.5/3.5] relative">
                    <Image
                      src={cards[index]}
                      alt={`Card ${index + 1}`}
                      fill
                      className={`object-cover transition-all duration-300 ${
                        hoveredCard === index ? 'scale-105 brightness-110' : 'brightness-90'
                      }`}
                      priority={index < 4}
                    />
                  </div>
                  
                  {/* Card info */}
                  <div className="p-3 bg-gradient-to-t from-gray-900 to-gray-900/80">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Series 1</span>
                      <span className={`text-xs font-mono transition-colors duration-300 ${
                        hoveredCard === index ? 'text-cyan-400' : 'text-gray-500'
                      }`}>
                        #{String(index + 1).padStart(3, '0')}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Hover particles */}
                {hoveredCard === index && (
                  <>
                    <div className="absolute -top-2 -left-2 w-1 h-1 bg-purple-400 rounded-full animate-float-up" />
                    <div className="absolute -top-2 -right-2 w-1 h-1 bg-cyan-400 rounded-full animate-float-up animation-delay-200" />
                    <div className="absolute -bottom-2 -left-2 w-1 h-1 bg-pink-400 rounded-full animate-float-up animation-delay-400" />
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}