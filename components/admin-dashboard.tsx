'use client'

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, XCircle, Users, Upload, ShoppingCart, Sparkles, Eye, Shield, Loader2 } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

/* ───── Types ───── */
type Row = {
  created_at: string | null
  event_name: string
  user_id: string | null
  device_id: string | null
  properties: Record<string, any> | null
}
type Bucket = "generate" | "upload" | "buy"

/* ───── Helpers ───── */
const DAY = 86_400_000
const last30ISO = new Date(Date.now() - 30 * DAY).toISOString()

function toDayUTC(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`
}
const fmt = (n: number) => new Intl.NumberFormat().format(n)

/* Only count terminal-state rows */
function classify(r: Row): Bucket | null {
  if (r.event_name === "upload") {
    if (r.properties?.phase === "saved_to_supabase") return "upload"
    if (r.properties?.action === "upload_ok") return "upload"
    return null
  }

  if (["buy", "checkout", "purchase"].includes(r.event_name)) return "buy"

  if (r.event_name === "generate") {
    if (r.properties?.action === "done") return "generate"
    /* "upload_ok" comes through as event_name=generate */
    if (r.properties?.action === "upload_ok") return "upload"
    return null
  }

  /* fallback on Stripe success in properties.action */
  if (r.properties?.action === "payment_intent_succeeded") return "buy"

  return null
}

/* ───── Component ───── */
export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState<any>({
    users: 0,
    revenueRequests: 0,
    marketplaceListings: 0,
    totalRevenue: 0,
    duplicateStats: {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0
    },
    assetStats: {
      aiGenerations: 0,
      uploads: 0,
      purchases: 0
    }
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadStats() {
      try {
        const supabase = createClientComponentClient()
        
        // First check if current user is admin using admins table
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Authentication required')
          setLoading(false)
          return
        }
        
        // Check if user exists in admins table
        const { data: adminProfile, error: adminError } = await supabase
          .from("admins")
          .select("user_id")
          .eq("user_id", user.id)
          .single()
        
        if (adminError || !adminProfile) {
          console.log('User is not admin, cannot load admin stats')
          setIsAdmin(false)
          setLoading(false)
          return
        }
        
        // User is admin, proceed to load stats
        setIsAdmin(true)
        
        // Test database access first
        console.log('🔍 Testing database access...')
        const { data: testData, error: testError } = await supabase
          .from("profiles")
          .select("id")
          .limit(1)
        
        if (testError) {
          console.log('🔍 Database access test failed:', testError)
        } else {
          console.log('🔍 Database access test successful')
        }
        
        // Try to get table information
        console.log('🔍 Testing table access...')
        try {
          const { data: tableTest, error: tableError } = await supabase
            .from("generated_images")
            .select("id")
            .limit(1)
          
          console.log('🔍 Table access test:', { 
            success: !tableError, 
            error: tableError,
            dataCount: tableTest?.length || 0
          })
        } catch (error) {
          console.log('🔍 Table access test failed with exception:', error)
        }
        
        // Get user counts
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("id")

        if (userError) {
          console.error('Error loading user data:', userError)
        }

        // Get revenue requests from revenue_requests table
        // Note: Admin users should have access to all data via RLS policies
        console.log('🔍 Querying revenue_requests table...')
        const { data: revenueData, error: revenueError } = await supabase
          .from("revenue_requests")
          .select("id, amount_cents, status, created_at")

        if (revenueError) {
          console.error('Error loading revenue data:', revenueError)
          console.log('🔍 Revenue error details:', {
            code: revenueError.code,
            message: revenueError.message,
            details: revenueError.details,
            hint: revenueError.hint
          })
          console.log('This might be an RLS policy issue. Admin users need proper access.')
        } else {
          console.log('🔍 Revenue Requests query result:', {
            count: revenueData?.length || 0,
            data: revenueData?.slice(0, 3) // Show first 3 for debugging
          })
          
          // Debug revenue calculation
          if (revenueData && revenueData.length > 0) {
            const totalRevenue = revenueData.reduce((sum, req) => sum + (req.amount_cents || 0), 0)
            console.log('🔍 Revenue calculation:', {
              totalRequests: revenueData.length,
              totalAmountCents: totalRevenue,
              totalAmountDollars: (totalRevenue / 100).toFixed(2),
              sampleRequests: revenueData.slice(0, 3).map(req => ({
                id: req.id,
                amount_cents: req.amount_cents,
                status: req.status
              }))
            })
          }
        }

        // Get marketplace data from marketplace_listings table
        const { data: marketplaceData, error: marketplaceError } = await supabase
          .from("marketplace_listings")
          .select("id, status, price_cents")

        if (marketplaceError) {
          console.error('Error loading marketplace data:', marketplaceError)
        }

        // Get uploads from uploaded_images table
        const { data: uploadsData, error: uploadsError } = await supabase
          .from("uploaded_images")
          .select("id")

        if (uploadsError) {
          console.error('Error loading uploads data:', uploadsError)
        }

        // Get AI generations from generated_images table (only count AI-generated ones)
        console.log('🔍 Querying generated_images table...')
        
        // First try a simple query to see if we can access the table at all
        let generatedData: any[] | null = null
        let generatedError: any = null
        
        // Try the main table name first - use columns that definitely exist
        const { data: mainData, error: mainError } = await supabase
          .from("generated_images")
          .select("id, prompt, created_at")
          .limit(100)
        
        console.log('🔍 Main generated_images query result:', { 
          data: mainData?.length || 0, 
          error: mainError,
          errorCode: mainError?.code,
          errorMessage: mainError?.message 
        })
        
        // Also try a simple count query
        const { count: totalCount, error: countError } = await supabase
          .from("generated_images")
          .select("*", { count: 'exact', head: true })
        
        console.log('🔍 Generated images count query:', { 
          totalCount, 
          error: countError,
          errorCode: countError?.code,
          errorMessage: countError?.message 
        })
        
        // Try a different approach - just get the first few records
        const { data: simpleData, error: simpleError } = await supabase
          .from("generated_images")
          .select("id")
          .limit(5)
        
        console.log('🔍 Simple generated_images query:', { 
          data: simpleData?.length || 0, 
          error: simpleError,
          errorCode: simpleError?.code,
          errorMessage: simpleError?.message 
        })
        
        if (mainError) {
          console.log('🔍 Main table query failed, trying alternative names...')
          
          // Try alternative table names
          const { data: altData, error: altError } = await supabase
            .from("generations")
            .select("id, metadata")
            .limit(100)
          
          if (altError) {
            console.log('🔍 Alternative table also failed, trying ai_generations...')
            
            const { data: aiData, error: aiError } = await supabase
              .from("ai_generations")
              .select("id, metadata")
              .limit(100)
            
            if (aiError) {
              console.log('🔍 All table attempts failed')
              generatedError = aiError
            } else {
              generatedData = aiData
            }
          } else {
            generatedData = altData
          }
        } else {
          generatedData = mainData
        }

        if (generatedError) {
          console.error('Error loading generated images data:', generatedError)
          console.log('🔍 Generated images error details:', {
            code: generatedError.code,
            message: generatedError.message,
            details: generatedError.details,
            hint: generatedError.hint
          })
        } else {
          console.log('🔍 AI Generations query result:', {
            count: generatedData?.length || 0,
            data: generatedData?.slice(0, 3) // Show first 3 for debugging
          })
          
          // If we got data, show more details
          if (generatedData && generatedData.length > 0) {
            console.log('🔍 Sample generated image data:', {
              firstImage: generatedData[0],
              metadataType: typeof generatedData[0]?.metadata,
              hasMetadata: !!generatedData[0]?.metadata
            })
          }
        }

        // Get purchases from asset_buyers table
        const { data: purchasesData, error: purchasesError } = await supabase
          .from("asset_buyers")
          .select("id, purchase_amount_cents, purchased_at")

        if (purchasesError) {
          console.error('Error loading purchases data:', purchasesError)
        }

        // Since generated_images table is specifically for AI-generated images, count all records
        // If we have data, all records are AI generations
        const aiGenerations = generatedData || []
        
        console.log('🔍 AI Generations count:', {
          totalImages: generatedData?.length || 0,
          aiGenerations: aiGenerations.length,
          sampleData: generatedData?.slice(0, 2).map(img => ({
            id: img.id,
            prompt: img.prompt,
            created_at: img.created_at
          }))
        })

        // Debug logging for AI generations
        console.log('🔍 AI Generations final result:', {
          totalImages: generatedData?.length || 0,
          aiGenerations: aiGenerations.length,
          success: !!generatedData && !generatedError
        })

        // Calculate asset stats
        const assetStats = {
          aiGenerations: aiGenerations.length || 0,
          uploads: uploadsData?.length || 0,
          purchases: purchasesData?.length || 0
        }

        // Get duplicate detection data
        const { data: duplicateData, error: duplicateError } = await supabase
          .from("duplicate_detections")
          .select("id, status")

        if (duplicateError) {
          console.error('Error loading duplicate data:', duplicateError)
        }

        // Calculate duplicate stats
        const duplicateStats = {
          pending: duplicateData?.filter(d => d.status === 'pending').length || 0,
          approved: duplicateData?.filter(d => d.status === 'approved').length || 0,
          rejected: duplicateData?.filter(d => d.status === 'rejected').length || 0,
          total: duplicateData?.length || 0
        }

        // Debug logging
        console.log('🔍 Admin Dashboard Data:', {
          users: userData?.length || 0,
          revenueRequests: revenueData?.length || 0,
          marketplaceListings: marketplaceData?.length || 0,
          totalRevenue: revenueData?.reduce((sum, req) => sum + (req.amount_cents || 0), 0) || 0,
          duplicateStats: duplicateStats,
          assetStats: assetStats,
          rawData: {
            userData: userData?.length,
            revenueData: revenueData?.length,
            marketplaceData: marketplaceData?.length,
            uploadsData: uploadsData?.length,
            generatedData: generatedData?.length,
            aiGenerations: aiGenerations.length,
            purchasesData: purchasesData?.length
          }
        })

        const finalStats = {
          users: userData?.length || 0,
          revenueRequests: revenueData?.length || 0,
          marketplaceListings: marketplaceData?.length || 0,
          totalRevenue: revenueData?.reduce((sum, req) => sum + (req.amount_cents || 0), 0) || 0,
          duplicateStats: duplicateStats,
          assetStats: assetStats
        }

        console.log('🔍 Final stats being set:', finalStats)
        setStats(finalStats)

      } catch (error) {
        console.error('Error loading admin stats:', error)
        setError('Failed to load admin statistics')
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-cyber-cyan animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cyber-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Dashboard Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
        </div>
      </div>
    )
  }

  // Show non-admin access message with sarcasm
  if (!loading && !isAdmin) {
    return (
      <div className="min-h-screen bg-cyber-black text-white flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-8">
          <div className="text-6xl mb-6">🎭</div>
          <h1 className="text-4xl font-bold text-cyber-pink mb-4">The Plot Twist!</h1>
          <h2 className="text-2xl font-bold text-white mb-4">Admin Dashboard</h2>
          <p className="text-gray-400 mb-6 text-lg">
            Oh snap! You thought you could just waltz in here and see all the admin secrets? 
            That's not how this story ends, my friend! 🎬
          </p>
          <div className="bg-cyber-dark/60 border border-cyber-pink/30 rounded-lg p-6 mb-6">
            <p className="text-cyber-pink font-mono text-sm">
              💡 <strong>Plot Spoiler:</strong> This dashboard is like an exclusive VIP club, 
              and you're currently on the "definitely not invited" list. 
              But hey, at least you tried! 🌟
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <Link href="/">
              <Button className="bg-cyber-cyan hover:bg-cyber-cyan/80 text-black font-semibold">
                ← Exit Stage Left
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline" className="border-cyber-pink/30 text-cyber-pink hover:bg-cyber-pink/10">
                Check Your Role
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cyber-black text-white px-6 pt-20 pb-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-cyber-cyan mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">Cardify Platform Analytics & Management</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/duplicates">
              <Button className="bg-cyber-pink hover:bg-cyber-pink/80 text-black font-semibold">
                <Eye className="w-4 w-4 mr-2" />
                Review Duplicates
                {stats.duplicateStats?.pending > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white">
                    {stats.duplicateStats.pending}
                  </Badge>
                )}
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <Card className="bg-cyber-dark/60 border border-cyber-cyan/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Users</p>
                  <p className="text-3xl font-bold text-white">{fmt(stats.users || 0)}</p>
                  {/* <p className="text-xs text-cyber-green">+{newUsersToday} today</p> */}
                </div>
                <Users className="h-8 w-8 text-cyber-cyan" />
              </div>
            </CardContent>
          </Card>

          {/* AI Generations */}
          <Card className="bg-cyber-dark/60 border border-cyber-cyan/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">AI Generations</p>
                  <p className="text-3xl font-bold text-white">{stats.assetStats?.aiGenerations || 0}</p>
                </div>
                <Sparkles className="h-8 w-8 text-cyber-pink" />
              </div>
            </CardContent>
          </Card>

          {/* File Uploads */}
          <Card className="bg-cyber-dark/60 border border-cyber-cyan/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">File Uploads</p>
                  <p className="text-3xl font-bold text-white">{stats.assetStats?.uploads || 0}</p>
                </div>
                <Upload className="h-8 w-8 text-cyber-green" />
              </div>
            </CardContent>
          </Card>

          {/* Purchases */}
          <Card className="bg-cyber-dark/60 border border-cyber-cyan/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Purchases</p>
                  <p className="text-3xl font-bold text-white">{stats.assetStats?.purchases || 0}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-cyber-orange" />
              </div>
            </CardContent>
          </Card>

          {/* Revenue Requests */}
          <Card className="bg-cyber-dark/60 border border-cyber-green/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Revenue Requests</p>
                  <p className="text-3xl font-bold text-white">{fmt(stats.revenueRequests || 0)}</p>
                  <p className="text-xs text-cyber-green">${((stats.totalRevenue || 0) / 100).toFixed(2)} total</p>
                </div>
                <Shield className="h-8 w-8 text-cyber-green" />
              </div>
            </CardContent>
          </Card>

          {/* Marketplace Listings */}
          <Card className="bg-cyber-dark/60 border border-cyber-orange/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Marketplace Listings</p>
                  <p className="text-3xl font-bold text-white">{fmt(stats.marketplaceListings || 0)}</p>
                  <p className="text-xs text-cyber-orange">Active listings</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-cyber-orange" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Duplicate Detection Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-cyber-dark/60 border border-amber-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Pending Review</p>
                  <p className="text-2xl font-bold text-amber-400">{stats.duplicateStats?.pending || 0}</p>
                </div>
                <AlertTriangle className="h-6 w-6 text-amber-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-cyber-dark/60 border border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Approved</p>
                  <p className="text-2xl font-bold text-green-400">{stats.duplicateStats?.approved || 0}</p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-cyber-dark/60 border border-red-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Rejected</p>
                  <p className="text-2xl font-bold text-red-400">{stats.duplicateStats?.rejected || 0}</p>
                </div>
                <XCircle className="h-6 w-6 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-cyber-dark/60 border border-cyber-cyan/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Detected</p>
                  <p className="text-2xl font-bold text-cyber-cyan">{stats.duplicateStats?.total || 0}</p>
                </div>
                <Eye className="h-6 w-6 text-cyber-cyan" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-cyber-dark/60 border border-cyber-cyan/30">
          <CardHeader>
            <CardTitle className="text-cyber-cyan">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/admin/duplicates">
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Review Duplicate Images
                </Button>
              </Link>
              <Link href="/admin/manage">
                <Button className="w-full bg-cyber-cyan hover:bg-cyber-cyan/80 text-black font-semibold">
                  <Shield className="w-4 h-4 mr-2" />
                  Manage Admin Users
                </Button>
              </Link>
              <Link href="/admin/analytics">
                <Button className="w-full bg-cyber-pink hover:bg-cyber-pink/80 text-black font-semibold">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Detailed Analytics
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
