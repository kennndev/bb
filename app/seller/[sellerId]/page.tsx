'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type AssetRow = {
  id: string
  user_id: string // Updated from owner_id
  title: string | null
  image_url: string | null
  storage_path: string | null
  mime_type: string | null
  file_size_bytes: number | null // Updated from size_bytes
  created_at: string | null
  is_public: boolean | null
}

type ListingRow = {
  id: string
  asset_id: string // Updated from source_id
  seller_id: string
  title: string
  image_url: string | null
  price_cents: number
  status: 'active' | 'inactive' // Updated status values
  created_at: string | null
}

type SellerMeta = {
  id: string
  display_name: string | null
  avatar_url: string | null
}

type UIItem = {
  id: string                // asset id when known; otherwise listing id prefixed
  file_name: string
  image_url: string
  mime_type?: string | null
  uploaded_at?: string | null
  size_mb?: number | null
  is_listed: boolean
  price_cents?: number
  listing_id?: string
  is_public: boolean
  listing_status?: string
}

const dollars = (cents: number) => (cents / 100).toFixed(2)
const initials = (name?: string | null) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || '?'

export default function SellerGalleryPage() {
  const supabase = createClientComponentClient()
  const { sellerId = '' } = useParams() as { sellerId?: string }

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<UIItem[]>([])
  const [seller, setSeller] = useState<SellerMeta | null>(null)
  
  // Modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<UIItem | null>(null)

  const titleId = useMemo(
    () => (sellerId ? `${sellerId.slice(0, 6)}…${sellerId.slice(-4)}` : '—'),
    [sellerId]
  )

  const load = useCallback(async () => {
    if (!sellerId) return
    setLoading(true)

    // Seller meta - try multiple approaches
    console.log('🔍 Fetching seller meta for ID:', sellerId)
    
    // First try: profiles table with all possible columns
    const { data: meta, error: metaError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sellerId)
      .maybeSingle()
    
    console.log('🔍 Profiles table result (all columns):', { meta, metaError })
    
    // If we got data, let's see what columns are available
    if (meta) {
      console.log('🔍 Available columns in profiles:', Object.keys(meta))
    }
    
    // If no profile found, try alternative table names
    if (!meta && !metaError) {
      console.log('🔍 No profile found, trying alternative tables...')
      
      // Try 'users' table
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('id', sellerId)
        .maybeSingle()
      
      console.log('🔍 Users table result:', { usersData, usersError })
      
      if (usersData) {
        console.log('🔍 Available columns in users:', Object.keys(usersData))
        
        // Map the data to our expected format
        const sellerData: SellerMeta = {
          id: usersData.id || sellerId,
          display_name: usersData.display_name || usersData.name || usersData.username || usersData.full_name || null,
          avatar_url: usersData.avatar_url || usersData.avatar || usersData.profile_image || null
        }
        
        setSeller(sellerData)
        console.log('✅ Seller meta set from users table:', sellerData)
        return // Exit early if we found data
      }
    }
    
    if (meta) {
      // Map the data to our expected format, handling different column names
      const sellerData: SellerMeta = {
        id: meta.id || sellerId,
        display_name: meta.display_name || meta.name || meta.username || meta.full_name || null,
        avatar_url: meta.avatar_url || meta.avatar || meta.profile_image || null
      }
      
      setSeller(sellerData)
      console.log('✅ Seller meta set:', sellerData)
    } else {
      console.log('⚠️ No seller meta found for ID:', sellerId)
      // Set a fallback seller object
      setSeller({
        id: sellerId,
        display_name: null,
        avatar_url: null
      })
    }

    // ALL uploads by this seller (public and private)
    const { data: allAssets } = await supabase
      .from('user_assets')
      .select('id, user_id, title, image_url, storage_path, mime_type, file_size_bytes, created_at, is_public') // Updated column names
      .eq('user_id', sellerId) // Updated column name
      .order('created_at', { ascending: false })
      .returns<AssetRow[]>()

    // ALL listings by this seller (active and inactive)
    const { data: listings } = await supabase
      .from('marketplace_listings') // Updated table name
      .select(`
        id, 
        asset_id, 
        seller_id, 
        title, 
        price_cents, 
        status, 
        created_at,
        user_assets!inner(
          image_url,
          title
        )
      `) // Updated to use JOIN with user_assets
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .returns<any[]>()

    // Get duplicate detection status for all assets
    const assetIds = [...(allAssets ?? []).map(a => a.id), ...(listings ?? []).map(l => l.asset_id)]
    const { data: duplicateDetections } = await supabase
      .from('duplicate_detections')
      .select('asset_id, status')
      .in('asset_id', assetIds)
      .in('status', ['pending', 'rejected']) // Include both pending and rejected items

    // Create a set of asset IDs that are under review or rejected
    const excludedAssetIds = new Set((duplicateDetections ?? []).map(d => d.asset_id))

    // Filter out assets that are under review or rejected
    const filteredAssets = (allAssets ?? []).filter(asset => !excludedAssetIds.has(asset.id))

    // Index listings by asset id
    const listingBySource = new Map<string, any>()
    for (const l of listings ?? []) {
      // Skip listings for assets that are under review or rejected
      if (excludedAssetIds.has(l.asset_id)) continue
      
      // Transform the joined data to match our expected structure
      const transformedListing = {
        id: l.id,
        asset_id: l.asset_id,
        seller_id: l.seller_id,
        title: l.title,
        image_url: l.user_assets?.image_url || null, // Get image_url from joined user_assets
        price_cents: l.price_cents,
        status: l.status,
        created_at: l.created_at
      }
      listingBySource.set(l.asset_id, transformedListing)
    }

    // 1) Start with filtered assets (public and private, excluding under review and rejected)
    const merged = new Map<string, UIItem>()
    for (const a of filteredAssets) {
      const fileName = (a.title && a.title.trim()) || a.storage_path?.split('/').pop() || 'file'
      const l = listingBySource.get(a.id)
      merged.set(a.id, {
        id: a.id,
        file_name: fileName,
        image_url: a.image_url || '/placeholder.svg',
        mime_type: a.mime_type,
        uploaded_at: a.created_at,
        size_mb: a.file_size_bytes != null ? Number((a.file_size_bytes / (1024 * 1024)).toFixed(2)) : null, // Updated column name
        is_listed: !!l,
        price_cents: l?.price_cents,
        listing_id: l?.id,
        is_public: a.is_public || false,
        listing_status: l?.status,
      })
    }

    // 2) Add any listed items whose asset is not public
    for (const l of listings ?? []) {
      if (!merged.has(l.asset_id)) { // Updated column name
        merged.set(`listing:${l.id}`, {
          id: `listing:${l.id}`,
          file_name: l.title,
          image_url: l.user_assets?.image_url || '/placeholder.svg', // Get image_url from joined user_assets
          is_listed: true,
          price_cents: l.price_cents,
          listing_id: l.id,
          is_public: false, // Listed items without assets are not public
          listing_status: l.status,
        })
      }
    }

    // Sort newest first using whatever timestamp we have
    const out = Array.from(merged.values()).sort((a, b) => {
      const ta = (a.uploaded_at ? Date.parse(a.uploaded_at) : 0)
      const tb = (b.uploaded_at ? Date.parse(b.uploaded_at) : 0)
      return tb - ta
    })

    setItems(out)
    setLoading(false)
  }, [sellerId, supabase])

  useEffect(() => { load() }, [load])

  // Open detail modal
  const openDetailModal = useCallback((item: UIItem) => {
    setSelectedItem(item)
    setDetailModalOpen(true)
  }, [])
  
  // Navigation functions for modal
  const navigateToNext = useCallback(() => {
    if (!selectedItem || items.length === 0) return
    const currentIndex = items.findIndex(i => i.id === selectedItem.id)
    const nextIndex = (currentIndex + 1) % items.length
    setSelectedItem(items[nextIndex])
  }, [selectedItem, items])
  
  const navigateToPrevious = useCallback(() => {
    if (!selectedItem || items.length === 0) return
    const currentIndex = items.findIndex(i => i.id === selectedItem.id)
    const prevIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1
    setSelectedItem(items[prevIndex])
  }, [selectedItem, items])
  
  // Get current position for indicator
  const currentPosition = useMemo(() => {
    if (!selectedItem || items.length === 0) return { current: 0, total: 0 }
    const index = items.findIndex(i => i.id === selectedItem.id)
    return { current: index + 1, total: items.length }
  }, [selectedItem, items])

  return (
    <div className="min-h-screen bg-cyber-black relative overflow-hidden font-mono">
      <div className="fixed inset-0 cyber-grid opacity-10 pointer-events-none" />
      <div className="fixed inset-0 scanlines opacity-20 pointer-events-none" />

      <div className="px-6 py-8 pt-24 relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-cyber-cyan grid place-items-center bg-cyber-dark">
              {seller?.avatar_url ? (
                <Image 
                  src={seller.avatar_url} 
                  alt={seller?.display_name || 'Seller'} 
                  fill 
                  sizes="56px" 
                  className="object-cover" 
                />
              ) : (
                <span className="text-cyber-cyan font-bold text-lg">
                  {seller?.display_name ? initials(seller.display_name) : (sellerId ? sellerId[0].toUpperCase() : 'S')}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-wider">
                {seller?.display_name ? (
                  <span className="text-cyber-cyan">{seller.display_name}</span>
                ) : (
                  <>Id • <span className="text-cyber-cyan">{titleId}</span></>
                )}
              </h1>
              <p className="text-gray-400">
                {seller?.display_name ? 'All cards from this seller' : `All cards from seller ${titleId}`}
              </p>
            </div>
          </div>

          <Link href="/marketplace">
            <Button className="h-12 bg-cyber-dark border-2 border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan/10 hover:border-cyber-cyan hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all duration-300">
              ← Back to Marketplace
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-cyber-dark/60 border border-cyber-cyan/30 rounded-lg p-3 animate-pulse">
                {/* Card skeleton with trading card aspect ratio */}
                <div className="relative aspect-[5/7] bg-gradient-to-br from-cyber-dark/40 to-cyber-dark/80 rounded-lg border-2 border-cyber-cyan/20">
                  <div className="absolute inset-0 bg-cyber-cyan/5 animate-pulse" />
                </div>
                {/* Title skeleton */}
                <div className="mt-3 space-y-2">
                  <div className="h-4 bg-cyber-cyan/10 rounded animate-pulse" />
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-16 bg-cyber-green/10 rounded animate-pulse" />
                    <div className="w-8 h-8 rounded-full bg-cyber-cyan/10 animate-pulse" />
                  </div>
                </div>
                {/* Button skeleton */}
                <div className="mt-3">
                  <div className="h-8 bg-cyber-cyan/10 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="bg-cyber-dark/60 border border-cyber-cyan/30">
            <CardContent className="p-6 text-center text-gray-400">No cards found for this seller.</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map((it) => (
              <Card
                key={it.id}
                className="bg-cyber-dark/60 border border-cyber-cyan/30 hover:border-cyber-cyan/60 transition-all duration-300 overflow-hidden hover:shadow-[0_0_30px_rgba(34,211,238,0.3)]"
              >
                <CardContent className="p-3">
                  {/* Card frame with trading card aspect ratio - clickable */}
                  <button
                    onClick={() => openDetailModal(it)}
                    className="block relative aspect-[5/7] bg-gradient-to-br from-cyber-dark/40 to-cyber-dark/80 rounded-lg overflow-hidden cursor-pointer group w-full border-2 border-cyber-cyan/50 transition-all duration-300 hover:border-cyber-cyan"
                  >
                    <Image
                      src={it.image_url || '/placeholder.svg'}
                      alt={it.file_name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-fill"
                      priority
                    />
                    
                    {/* Hover overlay with view text */}
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Background gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-cyber-dark/95 via-cyber-dark/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* View text in center on hover */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-cyber-cyan text-lg font-bold tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">VIEW</span>
                      </div>
                    </div>
                  </button>

                  {/* Card info below */}
                  <div className="mt-3 space-y-1">
                    <h3 className="text-sm font-semibold text-white truncate" title={it.file_name}>
                      {it.file_name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-end gap-2">
                        {it.is_listed ? (
                          <>
                            <span className="text-base font-bold text-cyber-green leading-none">${(it.price_cents! / 100).toFixed(0)}</span>
                            {/* Status indicator - aligned to bottom of price */}
                            <div className="flex items-center gap-1 pb-[1px] text-emerald-400">
                              <span className={`w-1.5 h-1.5 rounded-full ${it.listing_status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`} />
                              <span className="text-[10px] uppercase tracking-wider opacity-80 leading-none">
                                {it.listing_status === 'active' ? 'Available' : 'Inactive'}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-gray-400">Personal Collection</span>
                            <div className="flex items-center gap-1">
                              <span className={`w-1 h-1 rounded-full ${it.is_public ? 'bg-blue-400' : 'bg-gray-500'}`} />
                              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                                {it.is_public ? 'Public' : 'Private'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Seller avatar */}
                      <div className="relative grid place-items-center w-8 h-8 rounded-full overflow-hidden border border-cyber-cyan/50">
                        {seller?.avatar_url ? (
                          <Image
                            src={seller.avatar_url}
                            alt={seller?.display_name || 'Seller'}
                            fill
                            sizes="32px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-cyber-cyan text-xs font-bold">
                            {initials(seller?.display_name)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 space-y-2">
                    {it.is_listed ? (
                      it.listing_status === 'active' ? (
                        <Link href={`/checkout?listingId=${it.listing_id}`}>
                          <Button className="cyber-button w-full text-xs h-8" size="sm">
                            Buy Now
                          </Button>
                        </Link>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="w-full border-yellow-400/40 text-yellow-400 text-xs h-8" 
                          size="sm"
                          disabled
                        >
                          Listing Inactive
                        </Button>
                      )
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full border-cyber-cyan/40 text-cyber-cyan text-xs h-8" 
                        size="sm"
                        disabled
                      >
                        Not for sale
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Item Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-4xl bg-cyber-dark/95 border-2 border-cyber-cyan/50 text-white h-[85vh] max-h-[85vh] md:h-auto md:max-h-[85vh] flex flex-col p-0 gap-0 relative">
          {/* Navigation buttons - both mobile and desktop */}
          {items.length > 1 && (
            <>
              {/* Desktop buttons - outside modal when viewport > 1008px, further out on larger screens */}
              <button
                onClick={navigateToPrevious}
                className="hidden min-[1008px]:flex absolute -left-14 lg:-left-16 xl:-left-20 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-cyber-dark/90 backdrop-blur-sm border-2 border-cyber-cyan/50 hover:border-cyber-cyan hover:bg-gray-800/90 active:bg-gray-700/90 transition-all duration-300 items-center justify-center"
                aria-label="Previous card"
              >
                <ChevronLeft className="w-6 h-6 text-cyber-cyan" />
              </button>
              <button
                onClick={navigateToNext}
                className="hidden min-[1008px]:flex absolute -right-14 lg:-right-16 xl:-right-20 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-cyber-dark/90 backdrop-blur-sm border-2 border-cyber-cyan/50 hover:border-cyber-cyan hover:bg-gray-800/90 active:bg-gray-700/90 transition-all duration-300 items-center justify-center"
                aria-label="Next card"
              >
                <ChevronRight className="w-6 h-6 text-cyber-cyan" />
              </button>
              
              {/* Mobile/Tablet buttons - inside modal when viewport < 1008px */}
              <button
                onClick={navigateToPrevious}
                className="min-[1008px]:hidden absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-cyber-dark/90 backdrop-blur-sm border-2 border-cyber-cyan/50 hover:border-cyber-cyan hover:bg-gray-800/90 active:bg-gray-700/90 transition-all duration-300 flex items-center justify-center"
                aria-label="Previous card"
              >
                <ChevronLeft className="w-5 h-5 text-cyber-cyan" />
              </button>
              <button
                onClick={navigateToNext}
                className="min-[1008px]:hidden absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-cyber-dark/90 backdrop-blur-sm border-2 border-cyber-cyan/50 hover:border-cyber-cyan hover:bg-gray-800/90 active:bg-gray-700/90 transition-all duration-300 flex items-center justify-center"
                aria-label="Next card"
              >
                <ChevronRight className="w-5 h-5 text-cyber-cyan" />
              </button>
            </>
          )}
          {selectedItem && (
            <>
              {/* Mobile Layout - No Scroll */}
              <div className="md:hidden flex flex-col h-full p-3">
                {/* Card image container - maximized size */}
                <div className="flex-1 min-h-0 relative mb-3">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="relative bg-gradient-to-br from-cyber-dark/40 to-cyber-dark/80 rounded-2xl border-2 border-cyber-cyan/50 overflow-hidden"
                      style={{
                        width: 'min(100%, calc((100vh * 0.6) * 5/7))',
                        aspectRatio: '5/7'
                      }}
                    >
                      <Image
                        src={selectedItem.image_url || '/placeholder.svg'}
                        alt={selectedItem.file_name}
                        fill
                        sizes="100vw"
                        className="object-fill"
                        priority
                      />
                    </div>
                  </div>
                </div>
                  
                {/* Compact info section */}
                <div className="space-y-2 mb-3">
                  {/* Title and Price on same line */}
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-bold text-white leading-tight flex-1">
                      {selectedItem.file_name}
                    </h2>
                    {selectedItem.is_listed ? (
                      <div className="flex flex-col items-end">
                        <span className="text-xl font-bold text-cyber-green leading-none">
                          ${dollars(selectedItem.price_cents!)}
                        </span>
                        <div className="flex items-center gap-1 mt-1 text-emerald-400">
                          <span className={`w-1.5 h-1.5 rounded-full ${selectedItem.listing_status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`} />
                          <span className="text-[10px] uppercase tracking-wider leading-none">
                            {selectedItem.listing_status === 'active' ? 'For Sale' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className="text-sm text-gray-400">Personal Collection</span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${selectedItem.is_public ? 'bg-blue-400' : 'bg-gray-500'}`} />
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                            {selectedItem.is_public ? 'Public' : 'Private'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Seller Info - Super Compact */}
                  <div className="flex items-center gap-2">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-cyber-cyan/50 flex-shrink-0">
                      {seller?.avatar_url ? (
                        <Image
                          src={seller.avatar_url}
                          alt={seller.display_name || 'Seller'}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-cyber-dark grid place-items-center">
                          <span className="text-cyber-cyan text-xs font-bold">
                            {initials(seller?.display_name)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">Seller:</span>
                      <span className="text-sm text-white">
                        {seller?.display_name || titleId}
                      </span>
                    </div>
                  </div>
                  
                  {/* Metadata */}
                  {selectedItem.uploaded_at && (
                    <p className="text-xs text-gray-300">
                      Uploaded: {new Date(selectedItem.uploaded_at).toLocaleDateString()}
                    </p>
                  )}
                  {selectedItem.size_mb != null && (
                    <p className="text-xs text-gray-300">
                      Size: {selectedItem.size_mb} MB
                    </p>
                  )}
                </div>
                
                {/* Action buttons - no border, integrated */}
                <div className="flex gap-2 flex-shrink-0">
                  <Button 
                    variant="outline" 
                    onClick={() => setDetailModalOpen(false)}
                    className="flex-1 h-11 bg-transparent border border-cyber-pink text-cyber-pink hover:text-cyber-pink hover:border-cyber-pink/70 hover:bg-cyber-pink/10 transition-all"
                  >
                    Close
                  </Button>
                  {selectedItem.is_listed && selectedItem.listing_status === 'active' && (
                    <Link href={`/checkout?listingId=${selectedItem.listing_id}`} className="flex-1">
                      <Button className="w-full h-11 cyber-button text-base font-bold">
                        Buy Now
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
              
              {/* Desktop Layout */}
              <div className="hidden md:grid md:grid-cols-2 gap-6 p-6">
                {/* Left side - Image */}
                <div className="relative aspect-[5/7] bg-gradient-to-br from-cyber-dark/40 to-cyber-dark/80 rounded-2xl overflow-hidden border-2 border-cyber-cyan/50">
                  <Image
                    src={selectedItem.image_url || '/placeholder.svg'}
                    alt={selectedItem.file_name}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-fill"
                    priority
                  />
                </div>
                
                {/* Right side - Details */}
                <div className="flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-white mb-4">
                      {selectedItem.file_name}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="flex-1 space-y-4">
                    {/* Price and Status */}
                    {selectedItem.is_listed ? (
                      <div>
                        <h3 className="text-sm text-gray-400 mb-2">Price</h3>
                        <div className="flex items-end gap-3">
                          <span className="text-3xl font-bold text-cyber-green leading-none">
                            ${dollars(selectedItem.price_cents!)}
                          </span>
                          <div className="flex items-center gap-1 pb-[2px] text-emerald-400">
                            <span className={`w-2 h-2 rounded-full ${selectedItem.listing_status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`} />
                            <span className="text-sm uppercase tracking-wider leading-none">
                              {selectedItem.listing_status === 'active' ? 'For Sale' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-sm text-gray-400 mb-2">Status</h3>
                        <div className="flex items-center gap-3">
                          <span className="text-lg text-gray-300">Personal Collection</span>
                          <div className="flex items-center gap-1 pb-[2px]">
                            <span className={`w-2 h-2 rounded-full ${selectedItem.is_public ? 'bg-blue-400' : 'bg-gray-500'}`} />
                            <span className="text-sm text-gray-400 uppercase tracking-wider leading-none">
                              {selectedItem.is_public ? 'Public' : 'Private'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Seller Info */}
                    <div>
                      <h3 className="text-sm text-gray-400 mb-2">Seller</h3>
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-cyber-cyan">
                          {seller?.avatar_url ? (
                            <Image
                              src={seller.avatar_url}
                              alt={seller.display_name || 'Seller'}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-cyber-dark grid place-items-center">
                              <span className="text-cyber-cyan text-sm font-bold">
                                {initials(seller?.display_name)}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="text-white">
                          {seller?.display_name || titleId}
                        </span>
                      </div>
                    </div>
                    
                    {/* File Details */}
                    <div className="space-y-3">
                      {selectedItem.mime_type && (
                        <div>
                          <h3 className="text-sm text-gray-400 mb-1">Type</h3>
                          <p className="text-white">{selectedItem.mime_type}</p>
                        </div>
                      )}
                      {selectedItem.size_mb != null && (
                        <div>
                          <h3 className="text-sm text-gray-400 mb-1">Size</h3>
                          <p className="text-white">{selectedItem.size_mb} MB</p>
                        </div>
                      )}
                      {selectedItem.uploaded_at && (
                        <div>
                          <h3 className="text-sm text-gray-400 mb-1">Uploaded</h3>
                          <p className="text-white">
                            {new Date(selectedItem.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <DialogFooter className="mt-6 gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setDetailModalOpen(false)}
                      className="flex-1 bg-transparent border border-cyber-pink text-cyber-pink hover:text-cyber-pink hover:border-cyber-pink/70 hover:bg-cyber-pink/10 transition-all"
                    >
                      Close
                    </Button>
                    {selectedItem.is_listed && selectedItem.listing_status === 'active' && (
                      <Link href={`/checkout?listingId=${selectedItem.listing_id}`} className="flex-1">
                        <Button className="w-full cyber-button">
                          Buy Now • ${dollars(selectedItem.price_cents!)}
                        </Button>
                      </Link>
                    )}
                  </DialogFooter>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
