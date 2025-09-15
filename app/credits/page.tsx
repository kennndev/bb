"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

const PACKS = [
  { usd: 10, images: 4000, tag: "Starter" },
  { usd: 25, images: 10000, tag: "Popular" },
  { usd: 50, images: 20000, tag: "Best Value" },
] as const

function CreditsPageContent() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [uid, setUid] = useState<string | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [credits, setCredits] = useState<number>(0)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUid(session?.user?.id ?? null)
      
      if (session?.user?.id) {
        // Fetch current credits
        const { data } = await supabase
          .from("profiles")
          .select("credits")
          .eq("id", session.user.id)
          .maybeSingle()
        
        if (data) {
          setCredits(Number(data.credits ?? 0))
        }
      }
    }
    init()
  }, [supabase])
  
  // Monitor for credit changes and redirect if needed
  useEffect(() => {
    if (!uid) return
    
    const returnTo = searchParams.get('returnTo')
    // Validate returnTo is a safe internal path
    const isValidReturnPath = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
    
    if (isValidReturnPath && credits >= 10) {
      // User now has enough credits, redirect them back
      toast({ 
        title: "Credits purchased!", 
        description: `You now have ${credits} credits. Redirecting...` 
      })
      setTimeout(() => {
        router.push(returnTo)
      }, 1500)
    }
    
    // Set up realtime subscription for credit updates
    const sub = supabase.channel(`profile-${uid}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${uid}` },
        (payload) => {
          if (payload.new) {
            const newCredits = Number((payload.new as any).credits ?? 0)
            setCredits(newCredits)
            
            // Check if we should redirect after purchase
            const isValidPath = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
            if (isValidPath && newCredits >= 10) {
              toast({ 
                title: "Credits purchased!", 
                description: `You now have ${newCredits} credits. Redirecting...` 
              })
              setTimeout(() => {
                router.push(returnTo)
              }, 1500)
            }
          }
        }
      )
      .subscribe()
    
    return () => { supabase.removeChannel(sub) }
  }, [uid, credits, searchParams, router, supabase, toast])

  const buy = async (usd: number) => {
    if (!uid) {
      toast({ title: "Sign in required", description: "Please sign in to buy credits.", variant: "destructive" })
      return
    }
    setBusy(usd)
    try {
      const res = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ usd }),
      })
      const json = await res.json()
      if (!res.ok || !json?.url) {
        toast({ title: "Checkout failed", description: json?.error ?? "Unexpected error", variant: "destructive" })
        setBusy(null)
        return
      }
      window.location.href = json.url as string
    } catch (e: any) {
      toast({ title: "Checkout failed", description: String(e?.message ?? e), variant: "destructive" })
      setBusy(null)
    }
  }

  return (
    <div className="min-h-screen bg-cyber-black pt-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-wider">Buy Credits</h1>
            <p className="text-gray-400">$1 = 400 credits • Minimum $10 purchase</p>
            {searchParams.get('returnTo') === '/upload' && (
              <p className="text-cyber-cyan text-sm mt-2">Purchase credits to start uploading your artwork</p>
            )}
          </div>
          <Link href={searchParams.get('returnTo') || "/profile"}>
            <Button className="cyber-button">
              Back to {searchParams.get('returnTo') === '/upload' ? 'Upload' : 'Profile'}
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PACKS.map(p => (
            <Card key={p.usd} className="bg-cyber-dark/60 border border-cyber-cyan/30 hover:border-cyber-cyan/60">
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-white">${p.usd} Pack</CardTitle>
                <Badge className="bg-cyber-cyan/20 border border-cyber-cyan/40 text-cyber-cyan">{p.tag}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-4xl font-extrabold text-white">{p.images}</div>
                <div className="text-sm text-gray-400">images included</div>
                <Button className="cyber-button w-full" onClick={() => buy(p.usd)} disabled={busy === p.usd}>
                  {busy === p.usd ? "Starting…" : `Buy for $${p.usd}`}
                </Button>
                <div className="text-xs text-gray-500">~ $0.50 per image</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CreditsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cyber-black pt-24 px-6 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <CreditsPageContent />
    </Suspense>
  )
}
