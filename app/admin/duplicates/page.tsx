'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle, CheckCircle, XCircle, Eye, User, Calendar, Image as ImageIcon, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
type DuplicateDetection = {
  id: string
  asset_id: string
  user_id: string
  similarity_score: number
  matched_asset_id: string
  matched_user_id: string
  detection_method: string
  status: string
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  asset: {
    id: string
    title: string
    image_url: string
    user_id: string
    asset_type: string
    storage_path: string
    profile?: {
      id: string
      display_name: string
      email: string
      avatar_url?: string
    }
  }
  matched_asset: {
    id: string
    title: string
    image_url: string
    user_id: string
    asset_type: string
    storage_path: string
    profile?: {
      id: string
      display_name: string
      email: string
      avatar_url?: string
    }
  }
}

export default function DuplicateReviewPage() {
  return <DuplicateReviewContent />
}

function DuplicateReviewContent() {
  const [detections, setDetections] = useState<DuplicateDetection[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkAdminAndFetch()
  }, [statusFilter])

  async function checkAdminAndFetch() {
    try {
      // First check if current user is admin
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: "Error",
          description: "Authentication required",
          variant: "destructive"
        })
        return
      }
      
      // Check if user exists in admins table
      const { data: adminProfile, error: adminError } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .single()
      
      if (adminError || !adminProfile) {
        console.log('User is not admin, cannot access duplicate review')
        setIsAdmin(false)
        setLoading(false)
        return
      }
      
      // User is admin, proceed to fetch detections
      setIsAdmin(true)
      await fetchDetections()
    } catch (error) {
      console.error('Error checking admin status:', error)
      setLoading(false)
    }
  }

  async function fetchDetections() {
    try {
      console.log('🔍 Fetching duplicate detections directly from Supabase...')
      console.log('🔧 Status Filter:', statusFilter)
      
      // Build query based on status filter
      let query = supabase
        .from("duplicate_detections")
        .select("*")
        .order('created_at', { ascending: false })
      
      // Apply status filter if not 'all'
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
        console.log(`🔍 Filtering for status: ${statusFilter}`)
      } else {
        console.log('🔍 Showing all statuses')
      }

      const { data: duplicateData, error: duplicateError } = await query

      if (duplicateError) {
        console.error('❌ Error fetching duplicate detections:', duplicateError)
        toast({
          title: "Error",
          description: `Failed to fetch detections: ${duplicateError.message}`,
          variant: "destructive"
        })
        return
      }
      
      // Debug: Check for null values in asset IDs
      if (duplicateData && duplicateData.length > 0) {
        const nullAssetIds = duplicateData.filter(d => d.asset_id === null || d.matched_asset_id === null)
        if (nullAssetIds.length > 0) {
          console.log('⚠️ Found duplicate detections with null asset IDs:', nullAssetIds.length)
          console.log('⚠️ Null asset ID records:', nullAssetIds)
        }
        
        // Log each detection's similarity score for debugging
        console.log('🔍 Individual detection scores:')
        duplicateData.forEach((detection, index) => {
          console.log(`  Detection ${index + 1}:`, {
            id: detection.id,
            asset_id: detection.asset_id,
            matched_asset_id: detection.matched_asset_id,
            similarity_score: detection.similarity_score,
            similarity_percentage: getSimilarityPercentage(detection.similarity_score),
            status: detection.status,
            created_at: detection.created_at
          })
        })
      }
      
      if (duplicateData && duplicateData.length > 0) {
        
        // Get all unique asset IDs, filtering out null values
        const assetIds = [...new Set([
          ...duplicateData.map(d => d.asset_id).filter(id => id !== null),
          ...duplicateData.map(d => d.matched_asset_id).filter(id => id !== null)
        ])]
        
        console.log('🔍 Asset IDs to fetch:', assetIds)
        console.log('🔍 Asset IDs count:', assetIds.length)
        
        // Only fetch if we have valid asset IDs
        let assetData = []
        let assetError = null
        
        if (assetIds.length > 0) {
          // Fetch asset details including images
          const result = await supabase
            .from("user_assets")
            .select(`
              id,
              title,
              image_url,
              storage_path,
              asset_type,
              user_id
            `)
            .in('id', assetIds)
          
          assetData = result.data
          assetError = result.error
        } else {
          console.log('⚠️ No valid asset IDs found, skipping asset fetch')
        }
        
        if (assetError) {
          console.error('❌ Error fetching asset data:', assetError)
        }
        
        // Create a map for quick asset lookup
        const assetMap = new Map()
        if (assetData) {
          assetData.forEach(asset => {
            assetMap.set(asset.id, asset)
          })
        }
        
        console.log('📊 Asset data fetched:', assetData?.length || 0, 'assets')
        
        // Map detections with real asset data
        const enrichedDetections = duplicateData.map(detection => {
          const asset = assetMap.get(detection.asset_id)
          const matchedAsset = assetMap.get(detection.matched_asset_id)
          
          return {
            ...detection,
                         asset: asset ? {
               id: asset.id,
               title: asset.title || `Asset ${asset.id ? asset.id.slice(0, 8) : 'Unknown'}...`,
               image_url: asset.image_url || asset.storage_path || '/placeholder.jpg',
               user_id: asset.user_id,
               asset_type: asset.asset_type || 'uploaded',
               storage_path: asset.storage_path || '',
               profile: null
             } : {
               id: detection.asset_id,
               title: `Asset ${detection.asset_id ? detection.asset_id.slice(0, 8) : 'Unknown'}...`,
               image_url: '/placeholder.jpg',
               user_id: detection.user_id,
               asset_type: 'uploaded',
               storage_path: '',
               profile: null
             },
             matched_asset: matchedAsset ? {
               id: matchedAsset.id,
               title: matchedAsset.title || `Asset ${matchedAsset.id ? matchedAsset.id.slice(0, 8) : 'Unknown'}...`,
               image_url: matchedAsset.image_url || matchedAsset.storage_path || '/placeholder.jpg',
               user_id: matchedAsset.user_id,
               asset_type: matchedAsset.asset_type || 'uploaded',
               storage_path: matchedAsset.storage_path || '',
               profile: null
             } : {
               id: detection.matched_asset_id,
               title: `Asset ${detection.matched_asset_id ? detection.matched_asset_id.slice(0, 8) : 'Unknown'}...`,
               image_url: '/placeholder.jpg',
               user_id: detection.matched_user_id || detection.user_id,
               asset_type: 'uploaded',
               storage_path: '',
               profile: null
             }
          }
        })
        
        setDetections(enrichedDetections)
      } else {
        setDetections([])
      }
    } catch (error) {
      console.error('💥 Fetch error:', error)
      toast({
        title: "Error",
        description: "Failed to fetch detections",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleReview(detectionId: string, action: 'approved' | 'rejected') {
    setReviewing(detectionId)
    
    try {
      const response = await fetch('/api/admin/duplicate-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          detectionId,
          action,
          notes: notes[detectionId]?.trim() || null
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `Detection ${action} successfully`,
          variant: "default"
        })
        
        // Refresh the detections list instead of just removing from local state
        // This ensures we get the updated list from the server
        await fetchDetections()
        // Clear notes for this specific detection
        setNotes(prev => {
          const newNotes = { ...prev }
          delete newNotes[detectionId]
          return newNotes
        })
      } else {
        toast({
          title: "Error",
          description: data.error || `Failed to ${action} detection`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error reviewing detection:', error)
      toast({
        title: "Error",
        description: `Failed to ${action} detection`,
        variant: "destructive"
      })
    } finally {
      setReviewing(null)
    }
  }

  async function handleCleanupDuplicates() {
    try {
      setLoading(true)
      
      // Get current user's auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast({
          title: "Error",
          description: "Authentication required",
          variant: "destructive"
        })
        return
      }

      const response = await fetch('/api/admin/cleanup-duplicates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `Cleanup completed! Deleted ${data.results.recordsDeleted} duplicate records`,
          variant: "default"
        })
        
        // Refresh the detections list
        await fetchDetections()
      } else {
        toast({
          title: "Error",
          description: data.error || 'Failed to cleanup duplicates',
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error cleaning up duplicates:', error)
      toast({
        title: "Error",
        description: "Failed to cleanup duplicates",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  function getSimilarityColor(score: number) {
    if (score > 0.8) return 'text-red-400'
    if (score > 0.6) return 'text-orange-400'
    if (score > 0.4) return 'text-yellow-400'
    return 'text-green-400'
  }

  function getSimilarityLabel(score: number) {
    if (score > 0.8) return 'Very Low'
    if (score > 0.6) return 'Low'
    if (score > 0.4) return 'Medium'
    return 'High'
  }

  function getSimilarityPercentage(score: number) {
    // LPIPS is a distance metric: lower = more similar
    // Convert to similarity percentage: (1 - score) * 100
    // But clamp it to reasonable bounds to avoid confusion
    const percentage = Math.round((1 - score) * 100)
    return Math.max(0, Math.min(100, percentage))
  }

  // Show non-admin access message with sarcasm
  if (!loading && !isAdmin) {
    return (
      <div className="min-h-screen bg-cyber-black text-white flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-8">
          <div className="text-6xl mb-6">🤖</div>
          <h1 className="text-4xl font-bold text-cyber-pink mb-4">Nice Try, Human!</h1>
          <h2 className="text-2xl font-bold text-white mb-4">Duplicate Review Area</h2>
          <p className="text-gray-400 mb-6 text-lg">
            Oh look, another user who thinks they're special enough to review duplicate images! 
            How adorable. 🥺
          </p>
          <div className="bg-cyber-dark/60 border border-cyber-pink/30 rounded-lg p-6 mb-6">
            <p className="text-cyber-pink font-mono text-sm">
              💡 <strong>Pro Tip:</strong> If you want to play admin, you'll need to actually 
              <span className="text-cyber-cyan"> BE </span> an admin. Revolutionary concept, I know! 🚀
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <a href="/" className="inline-block">
              <button className="bg-cyber-cyan hover:bg-cyber-cyan/80 text-black font-semibold px-6 py-3 rounded">
                ← Back to Reality
              </button>
            </a>
            <a href="/profile" className="inline-block">
              <button className="border border-cyber-pink/30 text-cyber-pink hover:bg-cyber-pink/10 px-6 py-3 rounded">
                Check Your Privileges
              </button>
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black text-white px-6 pt-20 pb-10">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyber-cyan mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading duplicate detections...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cyber-black text-white px-6 pt-20 pb-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-0 mb-6 lg:mb-8">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-cyber-cyan mb-2">
              <span className="block sm:inline">Duplicate Image Review</span>
              {statusFilter !== 'all' && (
                <span className="text-lg sm:text-xl lg:text-2xl font-normal text-gray-400 ml-0 sm:ml-3 block sm:inline mt-1 sm:mt-0">
                  ({statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)})
                </span>
              )}
            </h1>
            <p className="text-sm sm:text-base text-gray-400 mb-2">
              {statusFilter === 'all' 
                ? 'Review and manage all duplicate image detections' 
                : `Review ${statusFilter} duplicate image detections`}
            </p>
            <p className="text-xs text-amber-400">
              💡 Use the Cleanup button to remove duplicate detection records with incorrect matched_asset_id values
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-cyber-cyan flex-shrink-0" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32 border-cyber-cyan/30 text-cyber-cyan bg-transparent h-10 touch-manipulation">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-cyber-dark text-white border-cyber-cyan/30">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 sm:gap-4">
              <Button
                onClick={fetchDetections}
                disabled={loading}
                variant="outline"
                className="border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan/10 h-10 px-3 sm:px-4 touch-manipulation flex-1 sm:flex-none"
              >
                <div className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}>
                  {loading ? (
                    <div className="rounded-full h-4 w-4 border-b-2 border-cyber-cyan"></div>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </div>
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">↻</span>
              </Button>
              
              <Button
                onClick={handleCleanupDuplicates}
                disabled={loading}
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-10 px-3 sm:px-4 touch-manipulation flex-1 sm:flex-none"
              >
                <span className="hidden sm:inline">🧹 Cleanup</span>
                <span className="sm:hidden">🧹</span>
              </Button>
            </div>
            
            <Badge className={`${statusFilter === 'pending' ? 'bg-amber-500' : statusFilter === 'approved' ? 'bg-green-500' : statusFilter === 'rejected' ? 'bg-red-500' : 'bg-cyber-cyan'} text-black font-semibold px-3 py-2 text-center sm:text-left`}>
              <span className="text-sm sm:text-base">
                {detections.length} {statusFilter === 'all' ? 'Total' : statusFilter === 'pending' ? 'Pending' : statusFilter === 'approved' ? 'Approved' : statusFilter === 'rejected' ? 'Rejected' : 'Items'}
              </span>
            </Badge>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-cyber-dark/60 border border-cyber-cyan/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">
                {detections.filter(d => d.status === 'pending').length}
              </div>
              <p className="text-sm text-gray-400">Pending Review</p>
            </CardContent>
          </Card>
          <Card className="bg-cyber-dark/60 border border-cyber-cyan/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                {detections.filter(d => d.status === 'approved').length}
              </div>
              <p className="text-sm text-gray-400">Approved</p>
            </CardContent>
          </Card>
          <Card className="bg-cyber-dark/60 border border-cyber-cyan/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-400">
                {detections.filter(d => d.status === 'rejected').length}
              </div>
              <p className="text-sm text-gray-400">Rejected</p>
            </CardContent>
          </Card>
          <Card className="bg-cyber-dark/60 border border-cyber-cyan/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-cyber-cyan">
                {detections.length}
              </div>
              <p className="text-sm text-gray-400">Total</p>
            </CardContent>
          </Card>
        </div>

        {detections.length === 0 ? (
          <Card className="bg-cyber-dark/60 border border-cyber-cyan/30">
            <CardContent className="p-12 text-center">
              {statusFilter === 'pending' ? (
                <>
                  <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">All Caught Up!</h3>
                  <p className="text-gray-400">No duplicate images pending review.</p>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-16 w-16 text-amber-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No {statusFilter} Duplicates</h3>
                  <p className="text-gray-400">No duplicate images with {statusFilter} status found.</p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {detections.map((detection) => (
              <Card key={detection.id} className="bg-cyber-dark/60 border border-cyber-cyan/30">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400 flex-shrink-0" />
                      <div>
                        <CardTitle className="text-white text-lg sm:text-xl">Duplicate Detection</CardTitle>
                        <p className="text-sm text-gray-400">
                          Detected on {new Date(detection.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:text-right gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`${getSimilarityColor(detection.similarity_score)} bg-transparent border text-xs sm:text-sm`}>
                          {getSimilarityLabel(detection.similarity_score)} Similarity
                        </Badge>
                        <Badge className={`${
                          detection.status === 'pending' ? 'bg-amber-500' : 
                          detection.status === 'approved' ? 'bg-green-500' : 
                          'bg-red-500'
                        } text-black font-semibold text-xs sm:text-sm`}>
                          {detection.status.charAt(0).toUpperCase() + detection.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400">
                        {getSimilarityPercentage(detection.similarity_score)}% similar
                        <span className="text-xs text-gray-400 ml-2">
                          (LPIPS: {detection.similarity_score.toFixed(4)})
                        </span>
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="px-4 sm:px-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                    {/* Original Image */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-cyber-cyan flex items-center gap-2 text-sm sm:text-base">
                        <ImageIcon className="h-4 w-4 flex-shrink-0" />
                        Original Image
                      </h4>
                      <div className="relative">
                        <Image
                          src={detection.asset.image_url}
                          alt={detection.asset.title || 'Original Image'}
                          width={300}
                          height={200}
                          className="rounded-lg object-cover w-full h-40 sm:h-48"
                          onError={(e) => {
                            // Fallback to placeholder if image fails to load
                            const target = e.target as HTMLImageElement
                            target.src = '/placeholder.jpg'
                          }}
                        />
                        {!detection.asset.image_url || detection.asset.image_url === '/placeholder.jpg' && (
                          <div className="absolute inset-0 bg-gray-800 rounded-lg flex items-center justify-center">
                            <div className="text-center text-gray-400">
                              <ImageIcon className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
                              <p className="text-xs sm:text-sm">Image not available</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="bg-cyber-dark/40 p-3 rounded-lg">
                        <p className="font-medium text-white text-sm sm:text-base">{detection.asset.title || 'Untitled'}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <p className="text-xs sm:text-sm text-gray-400 break-all">
                            User ID: {detection.asset.user_id ? detection.asset.user_id.slice(0, 8) : 'Unknown'}...
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{detection.asset.asset_type}</p>
                        <p className="text-xs text-gray-500 break-all">ID: {detection.asset.id ? detection.asset.id.slice(0, 8) : 'Unknown'}...</p>
                      </div>
                    </div>

                    {/* Matched Image */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-cyber-pink flex items-center gap-2 text-sm sm:text-base">
                        <ImageIcon className="h-4 w-4 flex-shrink-0" />
                        Matched Image
                      </h4>
                      <div className="relative">
                        <Image
                          src={detection.matched_asset.image_url}
                          alt={detection.matched_asset.title || 'Matched Image'}
                          width={300}
                          height={200}
                          className="rounded-lg object-cover w-full h-40 sm:h-48"
                          onError={(e) => {
                            // Fallback to placeholder if image fails to load
                            const target = e.target as HTMLImageElement
                            target.src = '/placeholder.jpg'
                          }}
                        />
                        {!detection.matched_asset.image_url || detection.matched_asset.image_url === '/placeholder.jpg' && (
                          <div className="absolute inset-0 bg-gray-800 rounded-lg flex items-center justify-center">
                            <div className="text-center text-gray-400">
                              <ImageIcon className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
                              <p className="text-xs sm:text-sm">Image not available</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="bg-cyber-dark/40 p-3 rounded-lg">
                        <p className="font-medium text-white text-sm sm:text-base">{detection.matched_asset.title || 'Untitled'}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <p className="text-xs sm:text-sm text-gray-400 break-all">
                            User ID: {detection.matched_asset.user_id ? detection.matched_asset.user_id.slice(0, 8) : 'Unknown'}...
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{detection.matched_asset.asset_type}</p>
                        <p className="text-xs text-gray-500 break-all">ID: {detection.matched_asset.id ? detection.matched_asset.id.slice(0, 8) : 'Unknown'}...</p>
                      </div>
                    </div>
                  </div>

                  {/* Admin Notes - Only show for pending duplicates */}
                  {detection.status === 'pending' && (
                    <div className="mb-4 sm:mb-6">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Admin Notes (Optional)
                      </label>
                      <Textarea
                        value={notes[detection.id] || ''}
                        onChange={(e) => setNotes(prev => ({
                          ...prev,
                          [detection.id]: e.target.value
                        }))}
                        placeholder="Add notes about your decision..."
                        className="bg-cyber-dark/40 border-cyber-cyan/30 text-white placeholder-gray-500 min-h-[80px] sm:min-h-[100px]"
                        rows={3}
                      />
                    </div>
                  )}

                  {/* Status Display or Action Buttons */}
                  {detection.status === 'pending' ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={() => handleReview(detection.id, 'approved')}
                        disabled={reviewing === detection.id}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold h-10 sm:h-9 touch-manipulation flex-1 sm:flex-none"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReview(detection.id, 'rejected')}
                        disabled={reviewing === detection.id}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold h-10 sm:h-9 touch-manipulation flex-1 sm:flex-none"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      {reviewing === detection.id && (
                        <div className="flex items-center justify-center text-gray-400 py-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyber-cyan mr-2"></div>
                          <span className="text-sm">Processing...</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <Badge className={`${
                        detection.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                      } text-black font-semibold text-sm px-3 py-1 w-fit`}>
                        {detection.status === 'approved' ? 'Approved' : 'Rejected'}
                      </Badge>
                      {detection.reviewed_at && (
                        <span className="text-xs sm:text-sm text-gray-400">
                          Reviewed on {new Date(detection.reviewed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
