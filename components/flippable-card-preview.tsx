"use client"

import { useState, memo, useEffect, useRef } from "react"
import { CyberDefense } from "./cyber-defense"
import { Loader2, Sparkles } from "lucide-react"

interface FlippableCardPreviewProps {
  artwork: string | null
  isLoading?: boolean
  defaultImage?: string
  useSimpleLoader?: boolean
  isGenerating?: boolean
  generationComplete?: boolean
  onGenerationComplete?: () => void
}

export const FlippableCardPreview = memo(function FlippableCardPreview({ 
  artwork, 
  isLoading = false, 
  defaultImage = "/generate_default_image.webp", 
  useSimpleLoader = false,
  isGenerating = false,
  generationComplete = false,
  onGenerationComplete
}: FlippableCardPreviewProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isLowPerf, setIsLowPerf] = useState(false)
  const [mobileProgress, setMobileProgress] = useState(0)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const generationStartTimeRef = useRef<number>(0)

  // Set generation start time when generation begins
  useEffect(() => {
    if (isGenerating && generationStartTimeRef.current === 0) {
      generationStartTimeRef.current = Date.now()
    } else if (!isGenerating) {
      // Reset when not generating
      generationStartTimeRef.current = 0
    }
  }, [isGenerating])

  // Use effect to detect mobile and performance capabilities after hydration
  useEffect(() => {
    const checkDevice = () => {
      // Check if mobile
      const mobile = 'ontouchstart' in window || window.innerWidth <= 768
      setIsMobile(mobile)
      
      // Performance detection
      let performanceScore = 0
      
      // Check device memory (if available)
      if ('deviceMemory' in navigator) {
        const memory = (navigator as any).deviceMemory
        if (memory <= 4) performanceScore++
        if (memory <= 2) performanceScore++
      }
      
      // Check hardware concurrency (CPU cores)
      if ('hardwareConcurrency' in navigator) {
        const cores = navigator.hardwareConcurrency
        if (cores <= 4) performanceScore++
        if (cores <= 2) performanceScore++
      }
      
      // Check connection speed (if available)
      if ('connection' in navigator) {
        const conn = (navigator as any).connection
        if (conn?.effectiveType === '3g' || conn?.effectiveType === '2g') {
          performanceScore += 2
        }
      }
      
      // Check if reduced motion is preferred
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        performanceScore += 3
      }
      
      // Check for low-end mobile devices using screen size and pixel ratio
      if (mobile && window.devicePixelRatio < 2) {
        performanceScore++
      }
      
      // Only use lightweight animations on mobile OR if performance score indicates low-end device
      // Desktop should use full animations unless it's a low-performance machine
      setIsLowPerf(mobile || performanceScore >= 3)
    }
    
    checkDevice()
    
    // Re-check on resize
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  // Animate the percentage counter for mobile loading - optimized for performance
  useEffect(() => {
    if (isLoading && isLowPerf) {
      setMobileProgress(0)
      const duration = 90000 // 90 seconds (1 minute 30 seconds)
      const updateInterval = 500 // Update every 500ms for better performance
      const totalSteps = duration / updateInterval
      let currentStep = 0
      
      progressIntervalRef.current = setInterval(() => {
        currentStep++
        // Simple linear progression for minimal CPU usage
        const progress = Math.min(100, Math.floor((currentStep / totalSteps) * 100))
        setMobileProgress(progress)
        
        if (currentStep >= totalSteps) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
          }
          setMobileProgress(100)
        }
      }, updateInterval)
      
      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
        }
      }
    } else {
      setMobileProgress(0)
    }
  }, [isLoading, isLowPerf])

  // Special rendering when generating with CyberDefense game
  if (isGenerating) {
    return (
      <div className="relative w-full max-w-md mx-auto font-mono">
        {/* Non-flippable card container with game - mobile optimized */}
        <div
          className="relative w-full"
          style={{
            aspectRatio: "2.5 / 3.5",
            maxWidth: "100%",
            minHeight: isMobile ? "400px" : "auto",
          }}
        >
          {/* Card frame with game inside - enhanced mobile styling */}
          <div className="relative w-full h-full rounded-2xl border-2 border-cyber-cyan/50 shadow-2xl cyber-card-glow-gradient overflow-hidden bg-cyber-dark transition-all duration-500 ease-in-out">
            {/* CyberDefense Game Container with mobile-optimized layout */}
            <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300">
              {generationComplete ? (
                // Show completion message briefly before transitioning
                <div className="flex flex-col items-center gap-4 p-4 animate-fadeIn">
                  <div className="flex items-center gap-2 sm:gap-3 text-cyber-cyan">
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-lg sm:text-xl lg:text-2xl font-bold text-center">Card Ready!</span>
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  {onGenerationComplete && (
                    <button
                      onClick={onGenerationComplete}
                      className="cyber-button group px-6 py-3 rounded-lg text-sm sm:text-base min-h-[44px] touch-manipulation hover:bg-cyber-cyan/10 active:bg-cyber-cyan/20 transition-all duration-200"
                    >
                      <span className="relative z-10">View Card</span>
                    </button>
                  )}
                </div>
              ) : (
                <CyberDefense isGenerating={isGenerating} startTime={generationStartTimeRef.current || Date.now()} />
              )}
            </div>
            
            {/* Mobile-optimized frame overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-8 sm:h-12 bg-gradient-to-b from-cyber-dark/70 sm:from-cyber-dark/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-20 sm:h-12 bg-gradient-to-t from-cyber-dark/80 sm:from-cyber-dark/50 to-transparent" />
              {/* Extra mobile padding for better touch interaction */}
              {isMobile && (
                <>
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-cyber-dark/30 to-transparent" />
                  <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-cyber-dark/30 to-transparent" />
                </>
              )}
            </div>
          </div>
        </div>
        
        
        {/* Add fade animation styles */}
        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out forwards;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="relative w-full max-w-md mx-auto font-mono">
      {/* Card Container with 3D flip effect - Standard playing card ratio 2.5:3.5 */}
      <div
        className="relative w-full cursor-pointer"
        style={{
          perspective: "1000px",
          aspectRatio: "2.5 / 3.5",
          maxWidth: "100%",
        }}
        onMouseEnter={() => !isMobile && setIsFlipped(true)}
        onMouseLeave={() => !isMobile && setIsFlipped(false)}
        onClick={() => isMobile && setIsFlipped(!isFlipped)}
      >
        <div
          className={`relative w-full h-full transition-transform duration-700 ease-in-out transform-style-preserve-3d ${
            isFlipped ? "rotate-y-180" : ""
          }`}
        >
          {/* Front of Card */}
          <div className="absolute inset-0 w-full h-full backface-hidden">
            <div className="relative w-full h-full rounded-2xl border-2 border-cyber-cyan/50 shadow-2xl cyber-card-glow-gradient overflow-hidden">
              {/* Loading Animation - Adaptive based on device capabilities */}
              {isLoading ? (
                (isLowPerf || useSimpleLoader) ? (
                  // Cyberpunk-themed ultra-lightweight mobile animation - improved mobile sizing
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyber-dark to-cyber-darker rounded-xl px-4">
                    <div className="flex flex-col items-center max-w-full">
                      {/* Cyberpunk circuit board loader - mobile responsive */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mb-6">
                        {/* Static circuit frame */}
                        <div className="absolute inset-0">
                          <svg viewBox="0 0 100 100" className="w-full h-full">
                            {/* Circuit paths - static background */}
                            <path 
                              d="M20,50 L30,50 L35,45 L35,30 L45,30"
                              stroke="rgba(0,255,255,0.1)"
                              strokeWidth="2"
                              fill="none"
                            />
                            <path 
                              d="M80,50 L70,50 L65,55 L65,70 L55,70"
                              stroke="rgba(0,255,255,0.1)"
                              strokeWidth="2"
                              fill="none"
                            />
                            <path 
                              d="M50,20 L50,30 L45,35 L30,35"
                              stroke="rgba(0,255,255,0.1)"
                              strokeWidth="2"
                              fill="none"
                            />
                            <path 
                              d="M50,80 L50,70 L55,65 L70,65"
                              stroke="rgba(0,255,255,0.1)"
                              strokeWidth="2"
                              fill="none"
                            />
                            
                            {/* Animated circuit trace */}
                            <rect 
                              x="48" 
                              y="48" 
                              width="4" 
                              height="4"
                              fill="#00ffff"
                              className="cyber-core"
                            />
                            
                            {/* Corner nodes */}
                            <circle cx="20" cy="20" r="2" fill="rgba(0,255,255,0.3)" className="cyber-node-1" />
                            <circle cx="80" cy="20" r="2" fill="rgba(0,255,255,0.3)" className="cyber-node-2" />
                            <circle cx="80" cy="80" r="2" fill="rgba(0,255,255,0.3)" className="cyber-node-3" />
                            <circle cx="20" cy="80" r="2" fill="rgba(0,255,255,0.3)" className="cyber-node-4" />
                            
                            {/* Data flow lines - animated */}
                            <line 
                              x1="20" y1="20" 
                              x2="80" y2="80"
                              stroke="#00ffff"
                              strokeWidth="1"
                              strokeDasharray="5,95"
                              className="cyber-data-flow"
                            />
                            <line 
                              x1="80" y1="20" 
                              x2="20" y2="80"
                              stroke="#ff007f"
                              strokeWidth="1"
                              strokeDasharray="5,95"
                              className="cyber-data-flow-2"
                            />
                          </svg>
                        </div>
                        
                        {/* Percentage in center - mobile optimized */}
                        {!useSimpleLoader && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-cyber-cyan font-mono font-bold text-xl sm:text-lg cyber-percentage">
                              {mobileProgress}
                              <span className="text-sm sm:text-xs">%</span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Status text - mobile optimized */}
                      <div className="text-center w-full px-2">
                        <div className="text-cyber-cyan text-sm sm:text-xs font-bold tracking-wider mb-3 sm:mb-2 uppercase">
                          {useSimpleLoader ? 'PROCESSING' :
                           mobileProgress < 25 ? 'INITIALIZING' : 
                           mobileProgress < 50 ? 'PROCESSING' :
                           mobileProgress < 75 ? 'ENHANCING' : 
                           <span className="text-cyber-pink">FINALIZING</span>}
                        </div>
                        
                        {/* Enhanced progress indicator for mobile */}
                        {!useSimpleLoader && (
                          <div className="flex justify-center gap-1 sm:gap-1">
                            <div className={`w-10 h-2 sm:w-8 sm:h-1 rounded-sm ${mobileProgress > 0 ? 'bg-cyber-cyan shadow-cyber-cyan/50 shadow-sm' : 'bg-cyber-dark'} transition-all duration-300`} />
                            <div className={`w-10 h-2 sm:w-8 sm:h-1 rounded-sm ${mobileProgress > 33 ? 'bg-cyber-cyan shadow-cyber-cyan/50 shadow-sm' : 'bg-cyber-dark'} transition-all duration-300`} />
                            <div className={`w-10 h-2 sm:w-8 sm:h-1 rounded-sm ${mobileProgress > 66 ? 'bg-cyber-cyan shadow-cyber-cyan/50 shadow-sm' : 'bg-cyber-dark'} transition-all duration-300`} />
                          </div>
                        )}
                      </div>
                      
                      <style jsx>{`
                        /* Core pulse - simple opacity */
                        .cyber-core {
                          animation: corePulse 2s ease-in-out infinite;
                        }
                        
                        @keyframes corePulse {
                          0%, 100% {
                            opacity: 0.3;
                            fill: #00ffff;
                          }
                          50% {
                            opacity: 1;
                            fill: #ff007f;
                          }
                        }
                        
                        /* Node pulses - staggered opacity only */
                        .cyber-node-1 {
                          animation: nodePulse 3s infinite;
                          animation-delay: 0s;
                        }
                        .cyber-node-2 {
                          animation: nodePulse 3s infinite;
                          animation-delay: 0.75s;
                        }
                        .cyber-node-3 {
                          animation: nodePulse 3s infinite;
                          animation-delay: 1.5s;
                        }
                        .cyber-node-4 {
                          animation: nodePulse 3s infinite;
                          animation-delay: 2.25s;
                        }
                        
                        @keyframes nodePulse {
                          0%, 70%, 100% {
                            opacity: 0.3;
                            r: 2;
                          }
                          35% {
                            opacity: 1;
                            r: 3;
                          }
                        }
                        
                        /* Data flow animation - simple dash offset */
                        .cyber-data-flow {
                          animation: dataFlow 4s linear infinite;
                        }
                        
                        .cyber-data-flow-2 {
                          animation: dataFlow 4s linear infinite reverse;
                          animation-delay: 2s;
                        }
                        
                        @keyframes dataFlow {
                          0% {
                            stroke-dashoffset: 0;
                          }
                          100% {
                            stroke-dashoffset: -100;
                          }
                        }
                        
                        /* Percentage glow - subtle */
                        .cyber-percentage {
                          text-shadow: 0 0 8px rgba(0,255,255,0.5);
                        }
                      `}</style>
                    </div>
                  </div>
                ) : (
                  // Full desktop/high-performance loading animation
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyber-dark to-cyber-darker rounded-xl px-4">
                    <div className="flex flex-col items-center">
                      {/* Cyberpunk Loading Animation */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
                      {/* Outer rotating ring */}
                      <div className="absolute inset-0 border-4 border-cyber-cyan/30 rounded-full animate-spin" 
                           style={{ animationDuration: '3s' }}>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 bg-cyber-cyan rounded-full shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
                      </div>
                      
                      {/* Inner counter-rotating ring */}
                      <div className="absolute inset-2 border-2 border-cyber-pink/30 rounded-full animate-spin" 
                           style={{ animationDuration: '2s', animationDirection: 'reverse' }}>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-1.5 h-1.5 bg-cyber-pink rounded-full shadow-[0_0_8px_rgba(255,0,127,0.8)]" />
                      </div>
                      
                      {/* Center pulse */}
                      <div className="absolute inset-6 bg-cyber-cyan/20 rounded-full animate-pulse" 
                           style={{ animationDuration: '1.5s' }}>
                        <div className="w-full h-full bg-gradient-to-br from-cyber-cyan/40 to-cyber-pink/40 rounded-full" />
                      </div>
                    </div>
                    
                    {/* Loading text */}
                    <div className="mt-6 text-center">
                      <div className="text-cyber-cyan text-sm font-bold tracking-wider animate-pulse loading-text">
                        <span className="text-1">GENERATING</span>
                        <span className="text-2">PROCESSING</span>
                        <span className="text-3">FINALIZING</span>
                        <span className="text-4 whitespace-nowrap">ALMOST READY</span>
                      </div>
                      {/* Cyberpunk loading bar */}
                      <div className="mt-3 w-32 mx-auto">
                        <div className="relative h-1 bg-cyber-dark/50 border border-cyber-cyan/30 overflow-visible">
                          {/* Background grid effect */}
                          <div className="absolute inset-0 opacity-30">
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,255,255,0.1)_2px,rgba(0,255,255,0.1)_4px)]" />
                          </div>
                          
                          {/* Main progress bar */}
                          <div 
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyber-cyan via-cyber-pink to-cyber-cyan loading-bar"
                            style={{
                              boxShadow: '0 0 10px rgba(0,255,255,0.8), inset 0 0 3px rgba(255,255,255,0.5)'
                            }}
                          />
                          
                          {/* Glowing edge */}
                          <div 
                            className="absolute inset-y-0 w-4 bg-gradient-to-r from-transparent to-white/80 loading-bar"
                            style={{
                              filter: 'blur(2px)'
                            }}
                          />
                          
                          {/* Energy overflow particles - appear at 100% */}
                          <div className="energy-particles absolute inset-0">
                            <div className="particle particle-1 absolute w-1 h-1 bg-cyber-cyan rounded-full" />
                            <div className="particle particle-2 absolute w-1 h-1 bg-cyber-pink rounded-full" />
                            <div className="particle particle-3 absolute w-1 h-1 bg-white rounded-full" />
                          </div>
                        </div>
                        
                        {/* Progress indicators */}
                        <div className="flex justify-between mt-1">
                          <span className="text-[8px] text-cyber-cyan/50 font-mono">0%</span>
                          <span className="text-[8px] text-cyber-pink/50 font-mono complete-indicator">100%</span>
                        </div>
                      </div>
                      
                      <style jsx>{`
                        /* Loading text transitions */
                        .loading-text {
                          position: relative;
                          height: 20px;
                          display: flex;
                          justify-content: center;
                          align-items: center;
                        }
                        
                        .loading-text span {
                          position: absolute;
                          opacity: 0;
                        }
                        
                        .text-1 {
                          animation: fadeText1 42s ease-out forwards;
                        }
                        
                        .text-2 {
                          animation: fadeText2 8s ease-out 42s forwards;
                        }
                        
                        .text-3 {
                          animation: fadeText3 8s ease-out 50s forwards;
                        }
                        
                        .text-4 {
                          animation: fadeText4 45s ease-out 58s forwards;
                        }
                        
                        @keyframes fadeText1 {
                          0% { opacity: 1; }
                          95% { opacity: 1; }
                          100% { opacity: 0; }
                        }
                        
                        @keyframes fadeText2 {
                          0% { opacity: 0; }
                          5% { opacity: 1; }
                          95% { opacity: 1; }
                          100% { opacity: 0; }
                        }
                        
                        @keyframes fadeText3 {
                          0% { opacity: 0; }
                          5% { opacity: 1; }
                          95% { opacity: 1; }
                          100% { opacity: 0; }
                        }
                        
                        @keyframes fadeText4 {
                          0% { 
                            opacity: 0;
                            color: #00ffff;
                          }
                          2% { 
                            opacity: 1;
                            color: #00ffff;
                          }
                          20% {
                            opacity: 1;
                            color: #ff007f;
                            text-shadow: 0 0 10px rgba(255,0,127,0.5);
                          }
                          40% {
                            opacity: 1;
                            color: #ff00aa;
                            text-shadow: 0 0 20px rgba(255,0,127,0.8);
                          }
                          70% {
                            opacity: 1;
                            color: #ff66cc;
                            text-shadow: 0 0 25px rgba(255,0,127,0.9);
                          }
                          100% { 
                            opacity: 1;
                            color: #ffffff;
                            text-shadow: 0 0 30px rgba(255,0,127,1), 0 0 40px rgba(255,255,255,0.8);
                            filter: brightness(1.5);
                          }
                        }
                        
                        /* Loading bar animation */
                        .loading-bar {
                          animation: loadingProgress 40s ease-out forwards;
                        }
                        
                        @keyframes loadingProgress {
                          0% { width: 0%; }
                          10% { width: 15%; }
                          20% { width: 25%; }
                          30% { width: 35%; }
                          40% { width: 45%; }
                          50% { width: 55%; }
                          60% { width: 65%; }
                          70% { width: 75%; }
                          80% { width: 85%; }
                          90% { width: 95%; }
                          100% { width: 100%; }
                        }
                        
                        /* Pulsing effect when complete */
                        .loading-bar {
                          animation: loadingProgress 40s ease-out forwards, pulseComplete 1.5s ease-in-out 40s infinite;
                        }
                        
                        @keyframes pulseComplete {
                          0%, 100% { 
                            filter: brightness(1) drop-shadow(0 0 10px rgba(0,255,255,0.8));
                          }
                          50% { 
                            filter: brightness(1.4) drop-shadow(0 0 25px rgba(0,255,255,1)) drop-shadow(0 0 35px rgba(255,0,127,0.8));
                          }
                        }
                        
                        /* 100% indicator flashing - slower */
                        .complete-indicator {
                          animation: flashIndicator 2s ease-in-out 40s infinite;
                        }
                        
                        @keyframes flashIndicator {
                          0%, 100% { 
                            color: rgba(255,0,127,0.5);
                          }
                          50% { 
                            color: rgba(255,255,255,1);
                            text-shadow: 0 0 15px rgba(255,0,127,1);
                          }
                        }
                        
                        /* Energy particles */
                        .particle {
                          opacity: 0;
                          position: absolute;
                          top: 50%;
                          left: 100%;
                          transform: translate(-50%, -50%);
                          pointer-events: none;
                        }
                        
                        .particle-1 {
                          animation: particleBurst1 1.5s ease-out 40s infinite;
                          box-shadow: 0 0 6px rgba(0,255,255,0.8);
                        }
                        
                        .particle-2 {
                          animation: particleBurst2 1.5s ease-out 40.2s infinite;
                          box-shadow: 0 0 6px rgba(255,0,127,0.8);
                        }
                        
                        .particle-3 {
                          animation: particleBurst3 1.5s ease-out 40.4s infinite;
                          box-shadow: 0 0 6px rgba(255,255,255,0.8);
                        }
                        
                        @keyframes particleBurst1 {
                          0% {
                            opacity: 0;
                            transform: translate(-50%, -50%) scale(0);
                          }
                          20% {
                            opacity: 1;
                            transform: translate(-50%, -50%) scale(1.2);
                          }
                          100% {
                            opacity: 0;
                            transform: translate(20px, -10px) scale(0.3);
                          }
                        }
                        
                        @keyframes particleBurst2 {
                          0% {
                            opacity: 0;
                            transform: translate(-50%, -50%) scale(0);
                          }
                          20% {
                            opacity: 1;
                            transform: translate(-50%, -50%) scale(1.2);
                          }
                          100% {
                            opacity: 0;
                            transform: translate(25px, 8px) scale(0.3);
                          }
                        }
                        
                        @keyframes particleBurst3 {
                          0% {
                            opacity: 0;
                            transform: translate(-50%, -50%) scale(0);
                          }
                          20% {
                            opacity: 1;
                            transform: translate(-50%, -50%) scale(1.2);
                          }
                          100% {
                            opacity: 0;
                            transform: translate(15px, -2px) scale(0.3);
                          }
                        }
                      `}</style>
                    </div>
                  </div>
                </div>
                )
              ) : artwork && !imageError ? (
                <img
                  src={artwork}
                  alt="Card artwork"
                  className="w-full h-full object-fill rounded-xl"
                  style={{
                    willChange: 'transform',
                    transform: 'translateZ(0)',
                    imageRendering: 'crisp-edges'
                  }}
                  onLoad={() => {
                    setImageError(false) // Clear any previous error state
                  }}
                  onError={(e) => {
                    const img = e.currentTarget
                    const retryCount = parseInt(img.dataset.retryCount || '0')
                    
                    // Try different strategies based on URL type and retry count
                    if (retryCount < 2) {
                      img.dataset.retryCount = String(retryCount + 1)
                      
                      if (artwork.startsWith('blob:') && retryCount === 0) {
                        // First retry: try reloading the same blob URL
                        setTimeout(() => {
                          img.src = artwork
                        }, 100)
                      } else if (artwork.startsWith('blob:') && retryCount === 1) {
                        // Second retry: blob URL might be stale, show error
                        setImageError(true)
                      } else if (artwork.startsWith('data:')) {
                        // Data URLs should always work, if they don't it's a format issue
                        setImageError(true)
                      } else {
                        // Regular URL failed
                        setImageError(true)
                      }
                    } else {
                      setImageError(true)
                    }
                  }}
                />
              ) : (
                // Show default image when no artwork is provided
                <img
                  src={defaultImage}
                  alt="Default card preview"
                  className="w-full h-full object-fill rounded-xl"
                  style={{
                    willChange: 'transform',
                    transform: 'translateZ(0)',
                    imageRendering: 'crisp-edges'
                  }}
                />
              )}
            </div>
          </div>

          {/* Back of Card */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
            <div className="relative w-full h-full rounded-2xl border-2 border-cyber-pink/50 shadow-2xl cyber-card-glow-gradient overflow-hidden">
              {/* Holographic overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyber-pink/5 via-cyber-purple/5 to-cyber-cyan/5 rounded-2xl z-10" />

              {/* Scanlines - disabled on mobile for performance */}
              {!isMobile && <div className="absolute inset-0 scanlines opacity-20 rounded-2xl z-10" />}

              {/* Back Label */}
              <div className="absolute top-2 left-2 px-2 py-1 bg-cyber-pink/20 border border-cyber-pink/50 rounded text-xs text-cyber-pink font-bold tracking-wider z-10">
                BACK
              </div>

              {/* Static image for the back of the card */}
              <img
                src="/redbackbleed111111.jpg"
                alt="Limited Edition Card Back"
                className="absolute inset-0 w-full h-full object-cover rounded-xl"
              />
              {/* Removed corner accents from the back of the card */}
            </div>
          </div>
        </div>
      </div>

      {/* Flip Instruction */}
      <div className="text-center mt-4">
        <p className="text-xs text-gray-400 tracking-wide">
          {isFlipped ? "Showing card back" : (isMobile ? "Tap to flip card" : "Hover to flip card")}
        </p>
      </div>
    </div>
  )
})
