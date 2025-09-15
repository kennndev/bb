"use client"

import Link from "next/link"
import { Sparkles, Upload, Store, User, LogIn, Shield, FileText, Mail } from "lucide-react"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient, signInWithGoogle } from "@/lib/supabase-browser"

export function Footer() {
  const pathname = usePathname()
  const currentYear = new Date().getFullYear()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    fetchUser()
  }, [])

  // Don't show footer on certain pages if needed
  const hideFooterPaths = ["/checkout"]
  if (hideFooterPaths.includes(pathname)) return null

  return (
    <footer className="relative mt-auto border-t border-cyber-cyan/10 bg-black/95 font-mono px-4 md:px-6 py-12">
      {/* Subtle animated border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-cyan/30 to-transparent animate-pulse" />
      
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Content - Better balanced grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-12">
          {/* Brand & Social Column */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-block group mb-6">
              <div className="relative">
                {/* Simplified glow effect */}
                <div className="absolute inset-0 blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-300">
                  <img 
                    src="/cardify-currentcolor_svg.svg" 
                    alt="" 
                    className="h-7 w-auto"
                    style={{ filter: 'brightness(0) saturate(100%) invert(51%) sepia(95%) saturate(1857%) hue-rotate(129deg) brightness(94%) contrast(101%)' }}
                    aria-hidden="true"
                  />
                </div>
                {/* Main logo */}
                <img 
                  src="/cardify-currentcolor_svg.svg" 
                  alt="Cardify" 
                  className="h-7 w-auto relative z-10 transition-all duration-300 group-hover:brightness-110"
                  style={{ 
                    filter: 'brightness(0) saturate(100%) invert(68%) sepia(13%) saturate(647%) hue-rotate(352deg) brightness(87%) contrast(87%)'
                  }}
                />
              </div>
            </Link>
            
            <p className="text-gray-400 text-xs leading-relaxed mb-6 max-w-xs">
              Professional trading card designs made simple. Create with AI, upload your art, sell to collectors, and print what you love.
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a
                href="https://discord.com/invite/MVESe8xQQ5"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-cyber-cyan transition-colors duration-200"
                aria-label="Discord"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </a>
              
              <a
                href="https://x.com/Cardify_Club"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-cyber-pink transition-colors duration-200"
                aria-label="X (Twitter)"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links - 2 columns */}
          <div className="md:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {/* Create */}
              <div>
                <h4 className="text-xs font-semibold text-cyber-cyan uppercase tracking-wider mb-4">Create</h4>
                <ul className="space-y-3">
                  <li>
                    <Link href="/generate" className="group flex items-center gap-2 text-xs text-gray-500 hover:text-cyber-cyan transition-colors duration-200">
                      <Sparkles className="w-3 h-3" />
                      <span>AI Generate</span>
                    </Link>
                  </li>
                  <li>
                    <Link href="/upload" className="group flex items-center gap-2 text-xs text-gray-500 hover:text-cyber-cyan transition-colors duration-200">
                      <Upload className="w-3 h-3" />
                      <span>Upload Design</span>
                    </Link>
                  </li>
                  <li>
                    <Link href="/marketplace" className="group flex items-center gap-2 text-xs text-gray-500 hover:text-cyber-cyan transition-colors duration-200">
                      <Store className="w-3 h-3" />
                      <span>Marketplace</span>
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Account */}
              <div>
                <h4 className="text-xs font-semibold text-cyber-pink uppercase tracking-wider mb-4">Account</h4>
                <ul className="space-y-3">
                  {!user ? (
                    <>
                      <li>
                        <button 
                          onClick={() => signInWithGoogle("/generate")}
                          className="group flex items-center gap-2 text-xs text-gray-500 hover:text-cyber-pink transition-colors duration-200"
                        >
                          <LogIn className="w-3 h-3" />
                          <span>Sign In</span>
                        </button>
                      </li>
                      <li>
                        <button 
                          onClick={() => signInWithGoogle("/generate")}
                          className="group flex items-center gap-2 text-xs text-gray-500 hover:text-cyber-pink transition-colors duration-200"
                        >
                          <User className="w-3 h-3" />
                          <span>Sign Up</span>
                        </button>
                      </li>
                    </>
                  ) : (
                    <li>
                      <Link href="/profile" className="group flex items-center gap-2 text-xs text-gray-500 hover:text-cyber-pink transition-colors duration-200">
                        <User className="w-3 h-3" />
                        <span>Profile</span>
                      </Link>
                    </li>
                  )}
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className="text-xs font-semibold text-cyber-purple uppercase tracking-wider mb-4">Legal</h4>
                <ul className="space-y-3">
                  <li>
                    <Link href="/terms" className="group flex items-center gap-2 text-xs text-gray-500 hover:text-cyber-purple transition-colors duration-200">
                      <FileText className="w-3 h-3" />
                      <span>Terms</span>
                    </Link>
                  </li>
                  <li>
                    <Link href="/dmca" className="group flex items-center gap-2 text-xs text-gray-500 hover:text-cyber-purple transition-colors duration-200">
                      <Shield className="w-3 h-3" />
                      <span>DMCA</span>
                    </Link>
                  </li>
                  <li>
                    <a href="mailto:support@cardify.club" className="group flex items-center gap-2 text-xs text-gray-500 hover:text-cyber-purple transition-colors duration-200">
                      <Mail className="w-3 h-3" />
                      <span>Contact</span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-900">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-600 tracking-wide uppercase">
              © {currentYear} Cardify. All rights reserved.
            </p>
            
            {/* Trust Badges */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 uppercase">Secured by</span>
                <div className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-cyber-green" />
                  <span className="text-xs text-cyber-green font-semibold uppercase">Stripe</span>
                </div>
              </div>
              
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-600 uppercase">
                <span className="w-1.5 h-1.5 bg-cyber-cyan rounded-full animate-pulse" />
                <span>Worldwide Shipping</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}