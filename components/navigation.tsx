"use client"

import { Button } from "@/components/ui/button"
import { ShoppingCart, Sparkles, Upload, Store, ChevronDown, Coins, User, LogOut, LogIn, Shield, BarChart3, Users } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { useNavigationVisibility } from "@/hooks/use-navigation-visibility"
import { AnimatedHamburger } from "@/components/ui/animated-hamburger"
import { useCart } from "@/lib/cart-context"
import { CartDrawer } from "@/components/cart-drawer"
import { getSupabaseBrowserClient, signInWithGoogle, signOutUser } from "@/lib/supabase-browser"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { AvatarBubble } from "@/components/Avatar"

/** Inline SVG fallback for anonymous avatar (data URL) */
const DEFAULT_AVATAR_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="9" r="3.25" stroke="#22d3ee" stroke-width="1.5" fill="none"/>
      <path d="M18.5 19c-1.6-3.2-4.1-4.5-6.5-4.5S7.1 15.8 5.5 19" stroke="#22d3ee" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    </svg>`
  )


export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [credits, setCredits] = useState<number>(0)
  const [freeGenerationsUsed, setFreeGenerationsUsed] = useState<number>(0)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminCheckLoading, setAdminCheckLoading] = useState(false)

  const isVisible = useNavigationVisibility()
  const { getItemCount } = useCart()
  const itemCount = getItemCount()

  // Check if user is admin
  const checkAdminStatus = useCallback(async (userId: string) => {
    if (!userId) return
    
    console.log('🔍 Navigation: Starting admin check for user:', userId)
    setAdminCheckLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      console.log('🔍 Navigation: Querying admins table for user_id:', userId)
      
      const { data, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()
      
      console.log('🔍 Navigation: Admin check result:', { data, error, userId })
      
      if (!error && data) {
        console.log('🔍 User is admin:', userId)
        setIsAdmin(true)
      } else {
        console.log('🔍 User is not admin:', userId, error)
        setIsAdmin(false)
      }
    } catch (error) {
      console.error('❌ Error checking admin status:', error)
      setIsAdmin(false)
    } finally {
      setAdminCheckLoading(false)
    }
  }, [])

  // Body scroll lock when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      // Store current scroll position
      const scrollY = window.scrollY
      // Add styles to prevent scrolling
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      
      return () => {
        // Restore scroll position when menu closes
        const storedScrollY = Math.abs(parseInt(document.body.style.top || '0'))
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        window.scrollTo(0, storedScrollY)
      }
    }
  }, [isMenuOpen])

  // auth wiring
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Check admin status when user changes
  useEffect(() => {
    if (user?.id) {
      console.log('🔍 Navigation: Checking admin status for user:', user.id)
      checkAdminStatus(user.id)
    } else {
      setIsAdmin(false)
    }
  }, [user?.id, checkAdminStatus])

  // fetch credits directly from profiles table
  const fetchCredits = useCallback(async () => {
    if (!user?.id) {
      setCredits(0)
      return
    }
    const sb = getSupabaseBrowserClient()
    const { data, error } = await sb
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching credits:', error)
      setCredits(0)
      return
    }
    console.log('🔍 Credits fetched from profiles:', data?.credits)
    setCredits(Number(data?.credits ?? 0))
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return;

    const supabase = getSupabaseBrowserClient();

    // Initial fetch
    const fetchCredits = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits, free_generations_used")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        console.log('🔍 Navbar: Credits fetched from profiles:', data.credits, 'Free generations:', data.free_generations_used)
        setCredits(Number(data.credits) || 0);
        setFreeGenerationsUsed(Number(data.free_generations_used) || 0);
      } else {
        console.error('❌ Navbar: Error fetching credits:', error)
      }
    };

    fetchCredits();

    // Realtime subscription
    const channel = supabase
      .channel(`profile-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, // Updated table name
        (payload) => {
          if (payload.new) {
            setCredits(Number((payload.new as any).credits) || 0);
            setFreeGenerationsUsed(Number((payload.new as any).free_generations_used) || 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ credits: number }>
      if (typeof ce.detail?.credits === "number") {
        console.log('🔍 Navbar: Credits updated via event:', ce.detail.credits)
        setCredits(ce.detail.credits)
      }
    }
    window.addEventListener("cardify-credits-updated", handler)
    return () => window.removeEventListener("cardify-credits-updated", handler)
  }, [])

  // Also refresh credits when user changes
  useEffect(() => {
    if (user?.id) {
      fetchCredits()
    }
  }, [user?.id, fetchCredits])

  return (
    <>
      {/* Mobile menu overlay - outside nav for proper layering */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
          isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMenuOpen(false)}
      />
      
      <nav
        className={`fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-3 bg-cyber-black/90 backdrop-blur-md border-b border-cyber-cyan/30 font-mono transition-transform duration-300 ease-in-out ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              {/* Glow layers */}
              <div className="absolute inset-0 blur-md opacity-50 transition-all duration-300 group-hover:opacity-75 group-hover:blur-lg">
                <img 
                  src="/cardify-currentcolor_svg.svg" 
                  alt="" 
                  className="h-6 w-auto"
                  style={{ filter: 'brightness(0) saturate(100%) invert(51%) sepia(95%) saturate(1857%) hue-rotate(129deg) brightness(94%) contrast(101%)' }}
                  aria-hidden="true"
                />
              </div>
              <div className="absolute inset-0 blur-lg opacity-30 transition-all duration-300 group-hover:opacity-50 group-hover:blur-xl">
                <img 
                  src="/cardify-currentcolor_svg.svg" 
                  alt="" 
                  className="h-6 w-auto"
                  style={{ filter: 'brightness(0) saturate(100%) invert(21%) sepia(88%) saturate(6591%) hue-rotate(326deg) brightness(90%) contrast(106%)' }}
                  aria-hidden="true"
                />
              </div>
              <div className="absolute inset-0 blur-xl opacity-20 transition-all duration-300 group-hover:opacity-35 group-hover:blur-2xl">
                <img 
                  src="/cardify-currentcolor_svg.svg" 
                  alt="" 
                  className="h-6 w-auto"
                  style={{ filter: 'brightness(0) saturate(100%) invert(24%) sepia(95%) saturate(6067%) hue-rotate(265deg) brightness(90%) contrast(103%)' }}
                  aria-hidden="true"
                />
              </div>
              {/* Main logo */}
              <img 
                src="/cardify-currentcolor_svg.svg" 
                alt="Cardify" 
                className="h-6 w-auto relative z-10 transition-all duration-300 group-hover:brightness-110"
                style={{ 
                  filter: 'brightness(0) saturate(100%) invert(68%) sepia(13%) saturate(647%) hue-rotate(352deg) brightness(87%) contrast(87%)'
                }}
              />
            </div>
          </Link>

          {/* Desktop controls */}
          <div className="hidden md:flex items-center gap-3">
            {/* Create Dropdown */}
            <DropdownMenu onOpenChange={setIsDropdownOpen} modal={false}>
              <DropdownMenuTrigger asChild>
                <Button 
                  className="relative bg-cyber-black/60 border-2 text-cyber-green tracking-wider px-4 py-2 font-mono text-sm group animate-subtle-glow overflow-hidden"
                >
                  <span className="relative z-10 pointer-events-none">GET STARTED</span>
                  <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 pointer-events-none relative z-10 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyber-cyan/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="bg-cyber-black/95 backdrop-blur-md border-2 border-cyber-cyan/50 text-white min-w-[200px] mt-2 rounded-none shadow-[0_2px_8px_rgba(34,211,238,0.2)]"
                sideOffset={5}
              >
                <DropdownMenuItem asChild className="focus:bg-cyber-green/20 focus:text-cyber-green cursor-pointer transition-colors duration-200">
                  <Link href="/generate" className="flex items-center gap-3 px-4 py-3 text-cyber-green hover:text-cyber-green font-mono text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Generate</span>
                    <span className="ml-auto text-[10px] text-cyber-green/60">NEW</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild className="focus:bg-cyber-pink/20 focus:text-cyber-pink cursor-pointer transition-colors duration-200">
                  <Link href="/upload" className="flex items-center gap-3 px-4 py-3 text-cyber-pink hover:text-cyber-pink font-mono text-sm">
                    <Upload className="w-4 h-4" />
                    <span>Upload Art</span>
                  </Link>
                </DropdownMenuItem>
          
                <DropdownMenuItem asChild className="focus:bg-cyber-blue/20 focus:text-cyber-blue cursor-pointer transition-colors duration-200">
                  <Link href="/marketplace" className="flex items-center gap-3 px-4 py-3 text-cyber-blue hover:text-cyber-blue font-mono text-sm">
                    <Store className="w-4 h-4" />
                    <span>Marketplace</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-cyber-cyan/30 to-transparent my-2" />
                
                <DropdownMenuItem asChild className="focus:bg-cyber-orange/20 focus:text-cyber-orange cursor-pointer transition-colors duration-200">
                  <Link href="/credits" className="flex items-center gap-3 px-4 py-3 text-cyber-orange hover:text-cyber-orange font-mono text-sm">
                    <Coins className="w-4 h-4" />
                    <span>Buy Credits</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Avatar area */}
            {user ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <span>
                    <AvatarBubble
                      src={user.user_metadata?.avatar_url}
                      name={user.user_metadata?.full_name || user.email}
                      title="Account"
                      size={36}
                    />
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-cyber-black/95 backdrop-blur-md border-2 border-cyber-cyan/50 text-white min-w-[180px] mt-2 rounded-none shadow-[0_0_30px_rgba(34,211,238,0.2)]"
                  sideOffset={5}
                >
                  <DropdownMenuItem asChild className="focus:bg-cyber-green/20 focus:text-cyber-green cursor-pointer transition-colors duration-200">
                    <Link href="/profile" className="flex items-center gap-3 px-4 py-3 text-cyber-green font-mono text-sm">
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="focus:bg-cyber-cyan/20 focus:text-cyber-cyan cursor-pointer transition-colors duration-200">
                    <Link href="/credits" className="flex items-center justify-between px-4 py-3 text-cyber-cyan font-mono text-sm">
                      <span className="flex items-center gap-2">
                        <Coins className="w-4 h-4" />
                        Credits
                      </span>
                      <span className="font-mono text-xs ml-2">{credits}</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  {/* Admin Section */}
                  {adminCheckLoading && (
                    <>
                      <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-cyber-pink/30 to-transparent my-2" />
                      <div className="px-4 py-2 text-xs font-mono text-cyber-pink/60 uppercase tracking-wider">Admin</div>
                      <div className="px-4 py-3 text-cyber-pink/60 font-mono text-sm flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-cyber-pink/40 border-t-cyber-pink rounded-full animate-spin"></div>
                        Checking access...
                      </div>
                    </>
                  )}
                  {isAdmin && !adminCheckLoading && (
                    <>
                      <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-cyber-pink/30 to-transparent my-2" />
                      <div className="px-4 py-2 text-xs font-mono text-cyber-pink/60 uppercase tracking-wider">Admin</div>
                      <DropdownMenuItem asChild className="focus:bg-cyber-pink/20 focus:text-cyber-pink cursor-pointer transition-colors duration-200">
                        <Link href="/admin" className="flex items-center gap-3 px-4 py-3 text-cyber-pink font-mono text-sm">
                          <Shield className="w-4 h-4" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="focus:bg-cyber-pink/20 focus:text-cyber-pink cursor-pointer transition-colors duration-200">
                        <Link href="/admin/duplicates" className="flex items-center gap-3 px-4 py-3 text-cyber-pink font-mono text-sm">
                          <Users className="w-4 h-4" />
                          Review Duplicates
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="focus:bg-cyber-pink/20 focus:text-cyber-pink cursor-pointer transition-colors duration-200">
                        <Link href="/admin/manage" className="flex items-center gap-3 px-4 py-3 text-cyber-pink font-mono text-sm">
                          <BarChart3 className="w-4 h-4" />
                          Manage Users
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-cyber-cyan/30 to-transparent my-2" />
                  <DropdownMenuItem onClick={signOutUser} className="focus:bg-cyber-pink/20 focus:text-cyber-pink cursor-pointer transition-colors duration-200 px-4 py-3 font-mono text-sm flex items-center gap-3">
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <AvatarBubble
                src={DEFAULT_AVATAR_SVG}
                name={null}
                onClick={() => signInWithGoogle("/generate")}
                title="Sign in"
                size={36}
              />
            )}

            {/* Cart */}
            <button
              onClick={() => setIsCartOpen(!isCartOpen)}
              className="relative flex items-center justify-center w-10 h-10 rounded-full border-2 border-cyber-cyan hover:border-cyber-green transition-colors"
              title="Shopping Cart"
            >
              <ShoppingCart className="w-5 h-5 text-cyber-cyan" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-cyber-pink text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border border-cyber-pink/50 shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                  {itemCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setIsCartOpen(!isCartOpen)}
              className="relative flex items-center justify-center w-9 h-9 rounded-full border-2 border-cyber-cyan hover:border-cyber-green transition-colors"
              title="Shopping Cart"
            >
              <ShoppingCart className="w-4 h-4 text-cyber-cyan" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-cyber-pink text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5 border border-cyber-pink/50">
                  {itemCount}
                </span>
              )}
            </button>
            <AnimatedHamburger isOpen={isMenuOpen} onClick={() => setIsMenuOpen(!isMenuOpen)} />
          </div>
        </div>

        {/* Mobile menu */}
        <div 
          className={`absolute top-full left-0 right-0 bg-cyber-black/95 backdrop-blur-md border-b border-cyber-cyan/30 md:hidden z-50 transition-all duration-300 transform shadow-[0_8px_32px_rgba(0,255,255,0.1)] ${
            isMenuOpen 
              ? 'translate-y-0 opacity-100' 
              : '-translate-y-4 opacity-0 pointer-events-none'
          }`}
        >
          <div className="px-6 py-4 space-y-3 max-h-[calc(100vh-64px)] overflow-y-auto">
              {/* Get Started Section - Always visible */}
              <div className="text-xs font-mono text-cyber-cyan/60 uppercase tracking-wider mb-2">Get Started</div>
              
              {/* AI Generate */}
              <Link href="/generate" className="block">
                <Button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full bg-cyber-dark border-2 border-cyber-green text-cyber-green hover:bg-cyber-green/10 tracking-wider justify-start"
                >
                  <Sparkles className="w-4 h-4 mr-3" />
                  AI Generate
                  <span className="ml-auto text-[10px] text-cyber-green/60">NEW</span>
                </Button>
              </Link>

              {/* Upload Art */}
              <Link href="/upload" className="block">
                <Button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full bg-cyber-dark border-2 border-cyber-pink text-cyber-pink hover:bg-cyber-pink/10 tracking-wider justify-start"
                >
                  <Upload className="w-4 h-4 mr-3" />
                  Upload Art
                </Button>
              </Link>

              {/* Marketplace */}
              <Link href="/marketplace" className="block">
                <Button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full bg-cyber-dark border-2 border-cyber-blue text-cyber-blue hover:bg-cyber-blue/10 tracking-wider justify-start"
                >
                  <Store className="w-4 h-4 mr-3" />
                  Marketplace
                </Button>
              </Link>

              <div className="border-t border-cyber-cyan/20 my-3"></div>

              {/* Buy Credits - Always visible */}
              <Link href="/credits" className="block">
                <Button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full bg-cyber-dark border-2 border-cyber-orange text-cyber-orange hover:bg-cyber-orange/10 tracking-wider justify-start"
                >
                  <Coins className="w-4 h-4 mr-3" />
                  Buy Credits
                </Button>
              </Link>

              {/* User Section - Only when logged in */}
              {user && (
                <>
                  <div className="border-t border-cyber-cyan/20 my-3"></div>
                  <div className="text-xs font-mono text-cyber-cyan/60 uppercase tracking-wider mb-2">Account</div>
                  
                  <Link href="/profile" className="block">
                    <Button
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full bg-cyber-dark border border-cyber-green/40 text-cyber-green hover:bg-cyber-green/10 tracking-wider justify-start"
                    >
                      <User className="w-4 h-4 mr-3" />
                      Profile
                    </Button>
                  </Link>

                  <Link href="/credits" className="block">
                    <Button
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full bg-cyber-dark border border-cyber-cyan/40 text-cyber-cyan hover:bg-cyber-cyan/10 tracking-wider justify-between"
                    >
                      <span className="flex items-center">
                        <Coins className="w-4 h-4 mr-3" />
                        Credits
                      </span>
                      <span className="font-mono text-xs">{credits}</span>
                    </Button>
                  </Link>

                  {/* Admin Section - Mobile */}
                  {adminCheckLoading && (
                    <>
                      <div className="border-t border-cyber-pink/20 my-3"></div>
                      <div className="text-xs font-mono text-cyber-pink/60 uppercase tracking-wider mb-2">Admin</div>
                      <div className="w-full bg-cyber-dark border border-cyber-pink/40 text-cyber-pink/60 py-3 px-4 rounded flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-cyber-pink/40 border-t-cyber-pink rounded-full animate-spin"></div>
                        Checking access...
                      </div>
                    </>
                  )}
                  {isAdmin && !adminCheckLoading && (
                    <>
                      <div className="border-t border-cyber-pink/20 my-3"></div>
                      <div className="text-xs font-mono text-cyber-pink/60 uppercase tracking-wider mb-2">Admin</div>
                      
                      <Link href="/admin" className="block">
                        <Button
                          onClick={() => setIsMenuOpen(false)}
                          className="w-full bg-cyber-dark border border-cyber-pink/40 text-cyber-pink hover:bg-cyber-pink/10 tracking-wider justify-start"
                        >
                          <Shield className="w-4 h-4 mr-3" />
                          Dashboard
                        </Button>
                      </Link>

                      <Link href="/admin/duplicates" className="block">
                        <Button
                          onClick={() => setIsMenuOpen(false)}
                          className="w-full bg-cyber-dark border border-cyber-pink/40 text-cyber-pink hover:bg-cyber-pink/10 tracking-wider justify-start"
                        >
                          <Users className="w-4 h-4 mr-3" />
                          Review Duplicates
                        </Button>
                      </Link>

                      <Link href="/admin/manage" className="block">
                        <Button
                          onClick={() => setIsMenuOpen(false)}
                          className="w-full bg-cyber-dark border border-cyber-pink/40 text-cyber-pink hover:bg-cyber-pink/10 tracking-wider justify-start"
                        >
                          <BarChart3 className="w-4 h-4 mr-3" />
                          Manage Users
                        </Button>
                      </Link>
                    </>
                  )}

                  <Button
                    onClick={() => {
                      signOutUser()
                      setIsMenuOpen(false)
                    }}
                    className="w-full bg-cyber-dark border border-cyber-pink/40 text-cyber-pink hover:bg-cyber-pink/10 tracking-wider justify-start"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                  </Button>
                </>
              )}

              {/* Sign In for non-authenticated users */}
              {!user && (
                <Button
                  onClick={() => {
                    signInWithGoogle("/generate")
                    setIsMenuOpen(false)
                  }}
                  className="w-full bg-cyber-dark border-2 border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan/10 tracking-wider justify-start"
                >
                  <LogIn className="w-4 h-4 mr-3" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
      </nav>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  )
}
