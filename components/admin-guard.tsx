'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { isUserAdmin } from '@/lib/admin-auth'
import { Loader2, Shield, AlertTriangle } from 'lucide-react'

interface AdminGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function AdminGuard({ children, fallback }: AdminGuardProps) {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get current user
    async function getCurrentUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        if (user) {
          console.log('🔐 Checking admin status for user:', user.email)
          
          // Quick check: if email is in authorized list, grant access immediately
          if (user.email === 'mirachannan@gmail.com') {
            console.log('✅ Quick admin access granted for:', user.email)
            setIsAdmin(true)
            setLoading(false)
            return
          }
          
          // Full admin check with timeout
          try {
            // Add timeout to prevent hanging
            const adminCheckPromise = isUserAdmin(user.id)
            const timeoutPromise = new Promise<boolean>((_, reject) => 
              setTimeout(() => reject(new Error('Admin check timeout')), 5000)
            )
            
            const adminStatus = await Promise.race([adminCheckPromise, timeoutPromise])
            setIsAdmin(adminStatus)
            
            if (!adminStatus) {
              console.log('🚫 Access denied: User is not authorized admin')
            }
          } catch (error) {
            console.error('💥 Admin check failed:', error)
            // Fallback: if database check fails, use email-based check
            const authorizedEmails = ['mirachannan@gmail.com', 'kainatkhankhosa@gmail.com', 'placeparks@gmail.com']
            const fallbackAdmin = authorizedEmails.includes(user.email || '')
            console.log('🔄 Using fallback admin check:', { email: user.email, isAdmin: fallbackAdmin })
            setIsAdmin(fallbackAdmin)
          }
        } else {
          setIsAdmin(false)
        }
      } catch (error) {
        console.error('💥 User check failed:', error)
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    getCurrentUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          try {
            // Add timeout to prevent hanging
            const adminCheckPromise = isUserAdmin(session.user.id)
            const timeoutPromise = new Promise<boolean>((_, reject) => 
              setTimeout(() => reject(new Error('Admin check timeout')), 5000)
            )
            
            const adminStatus = await Promise.race([adminCheckPromise, timeoutPromise])
            setIsAdmin(adminStatus)
          } catch (error) {
            console.error('💥 Admin check failed:', error)
            // Fallback: if database check fails, use email-based check
            const authorizedEmails = ['mirachannan@gmail.com', 'kainatkhankhosa@gmail.com', 'placeparks@gmail.com']
            const fallbackAdmin = authorizedEmails.includes(session.user.email || '')
            console.log('🔄 Using fallback admin check:', { email: session.user.email, isAdmin: fallbackAdmin })
            setIsAdmin(fallbackAdmin)
          }
        } else {
          setUser(null)
          setIsAdmin(false)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-cyber-cyan animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  // User not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-cyber-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertTriangle className="h-16 w-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">🤖 Identity Crisis Detected! 🤖</h2>
          
          <div className="space-y-4 mb-6">
            <p className="text-cyber-cyan text-lg font-semibold">
              "Who are you, mysterious stranger? A ghost? A bot? A very confused user?"
            </p>
            
            <p className="text-gray-300 text-sm">
              You're trying to access the admin panel, but you're not even logged in! 
              That's like trying to enter a VIP club while wearing an invisibility cloak. 
              Cool concept, but it's not going to work! 🧙‍♂️
            </p>
            
            <p className="text-amber-400 text-sm font-medium">
              💡 Life hack: You need to actually sign in first. Revolutionary, I know!
            </p>
            
            <div className="bg-cyber-dark/50 p-3 rounded-lg border border-amber-400/30">
              <p className="text-amber-300 text-xs">
                🎭 <strong>Current Status:</strong> You're like a digital ghost 
                trying to haunt the admin panel. Spooky, but ineffective! 👻
              </p>
            </div>
          </div>
          
          <button
            onClick={() => router.push('/')}
            className="bg-cyber-cyan text-black px-6 py-2 rounded-lg font-semibold hover:bg-cyber-cyan/80 transition-colors"
          >
            🏠 Go Home and Get Your Life Together
          </button>
          
          <p className="text-gray-500 text-xs mt-4">
            P.S. Ghosts can't be admins. It's in the terms of service. 👻
          </p>
        </div>
      </div>
    )
  }

  // User not authorized
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-cyber-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Shield className="h-16 w-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">🚫 Nice Try, Sneaky One! 🚫</h2>
          
          <div className="space-y-4 mb-6">
            <p className="text-cyber-cyan text-lg font-semibold">
              "Oh look, another user who thinks they're special enough to access the admin panel!"
            </p>
            
            <p className="text-gray-300 text-sm">
              Listen here, you magnificent creature of chaos: this is the admin zone. 
              The place where we make the big decisions, like whether to ban users 
              who try to access admin pages they shouldn't. 😏
            </p>
            
            <p className="text-amber-400 text-sm font-medium">
              💡 Pro tip: If you want admin access, try asking nicely instead of 
              sneaking around like a digital ninja!
            </p>
            
            <div className="bg-cyber-dark/50 p-3 rounded-lg border border-amber-400/30">
              <p className="text-amber-300 text-xs">
                🎭 <strong>Current Status:</strong> You're about as admin as a 
                goldfish trying to code. Cute, but not quite there yet! 🐠
              </p>
            </div>
          </div>
          
          <button
            onClick={() => router.push('/')}
            className="bg-cyber-cyan text-black px-6 py-2 rounded-lg font-semibold hover:bg-cyber-cyan/80 transition-colors"
          >
            🏠 Go Back to Your Regular User Life
          </button>
          
          <p className="text-gray-500 text-xs mt-4">
            P.S. We're watching you... 👀 (Not really, but it sounds cool)
          </p>
        </div>
      </div>
    )
  }

  // User is authorized admin
  return <>{children}</>
}
