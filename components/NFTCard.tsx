'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'
import { usePublicClient } from 'wagmi'
import { CONTRACTS } from '@/lib/contract'
import { BASE_SEPOLIA } from '@/hooks/useEnsureNetwork'

type Props = {
  collection: `0x${string}`
  id: bigint
  height?: number
}

const GATEWAYS = [
  (p: string) => `https://ipfs.io/ipfs/${p}`,
  (p: string) => `https://cloudflare-ipfs.com/ipfs/${p}`,
  (p: string) => `https://gateway.pinata.cloud/ipfs/${p}`,
  (p: string) => `https://dweb.link/ipfs/${p}`,
]

function ipfsToPath(u: string) {
  if (!u) return ''
  if (u.startsWith('ipfs://')) return u.slice('ipfs://'.length)
  if (u.startsWith('ipfs:/')) return u.slice('ipfs:/'.length)
  if (u.startsWith('ipfs://ipfs/')) return u.slice('ipfs://ipfs/'.length)
  return u
}

async function fetchWithFallback(pathOrHttp: string, timeoutMs = 6000): Promise<any> {
  const isHttp = pathOrHttp.startsWith('http')
  const candidates = isHttp
    ? [pathOrHttp]
    : GATEWAYS.map(fn => fn(ipfsToPath(pathOrHttp)))

  let lastErr: any
  for (const url of candidates) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' })
      clearTimeout(t)
      if (!res.ok) { lastErr = new Error(`${url} -> ${res.status}`); continue }
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('application/json')) return res.json()
      return res.blob()
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr ?? new Error('All IPFS gateways failed')
}

export default function NFTCard({ collection, id, height = 260 }: Props) {
  const client = usePublicClient({ chainId: BASE_SEPOLIA })
  const [img, setImg] = useState<string | null>(null)
  const [name, setName] = useState<string>('')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!client) return
    (async () => {
      try {
        const uri = await client.readContract({
          address: collection,
          abi: CONTRACTS.nftAbi,
          functionName: 'tokenURI',
          args: [id],
        }) as string

        const meta = await fetchWithFallback(uri)  // JSON
        let imageUrl: string = meta?.image || meta?.image_url || ''
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = GATEWAYS[0](ipfsToPath(imageUrl))
        }
        setImg(imageUrl || '')
        setName(meta?.name || `NFT #${id.toString()}`)
      } catch (e: any) {
        setErr(e?.message || 'Failed to load metadata')
      }
    })()
  }, [client, collection, id])

  if (err) {
    return (
      <div className="bg-cyber-dark/60 border border-cyber-cyan/30 rounded-lg p-3">
        <div className="aspect-[5/7] bg-gradient-to-br from-cyber-dark/40 to-cyber-dark/80 rounded-lg flex items-center justify-center">
          <span className="text-sm text-zinc-400">No preview</span>
        </div>
      </div>
    )
  }

  if (!img) return (
    <div className="bg-cyber-dark/60 border border-cyber-cyan/30 rounded-lg p-3">
      <Skeleton className="aspect-[5/7] rounded-lg" />
    </div>
  )

  return (
    <div className="bg-cyber-dark/60 border border-cyber-cyan/30 hover:border-cyber-cyan/60 transition-all duration-300 rounded-lg overflow-hidden group hover:shadow-[0_0_30px_rgba(34,211,238,0.3)]">
      <div className="p-3">
        {/* Card frame with trading card aspect ratio */}
        <div className="relative aspect-[5/7] bg-gradient-to-br from-cyber-dark/40 to-cyber-dark/80 rounded-lg overflow-hidden">
          <Image
            src={img}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-contain"
          />
          
          {/* Hover overlay with NFT badge and VIEW text */}
          <div className="absolute inset-0 bg-gradient-to-t from-cyber-dark/95 via-cyber-dark/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute top-3 left-3 right-3">
              <span className="inline-block bg-cyber-pink/20 backdrop-blur-sm border border-cyber-pink/40 text-cyber-pink text-xs px-2 py-1 rounded">
                NFT #{id.toString()}
              </span>
            </div>
            
            {/* Center view text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-cyber-cyan text-lg font-bold tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
                VIEW
              </span>
            </div>
          </div>
        </div>
        
        {/* Card info below */}
        <div className="mt-3">
          <h3 className="text-sm font-semibold text-white truncate" title={name}>
            {name}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            On-chain
          </p>
        </div>
      </div>
    </div>
  )
}
