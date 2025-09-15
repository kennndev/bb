"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

type Props = {
  uid: string
  initialUrl?: string | null
  onUpdated?: (url: string | null) => void
  size?: number
}

const FALLBACK_DATA_URL =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="100%" height="100%" fill="%23121a21"/><circle cx="128" cy="96" r="48" fill="%231e2b33"/><rect x="64" y="160" width="128" height="56" rx="28" fill="%231e2b33"/></svg>'

/** Pull best-guess Google/OAuth avatar from the current session metadata. */
async function fetchGoogleAvatar(supabase: ReturnType<typeof createClientComponentClient>): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  const meta: any = session?.user?.user_metadata ?? {}

  // Common places providers put the picture:
  const m1 = (meta.avatar_url as string | undefined) || (meta.picture as string | undefined)

  // Sometimes it’s nested under identities[0].identity_data
  const id0: any = (session?.user as any)?.identities?.[0]?.identity_data ?? {}
  const i1 = (id0?.avatar_url as string | undefined) || (id0?.picture as string | undefined)

  const url = m1 || i1 || null
  if (!url) return null

  // Cache-bust to avoid stale cached photo from Google
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}r=${Date.now()}`
}

export default function AvatarUploader({ uid, initialUrl, onUpdated, size = 96 }: Props) {
  const supabase = createClientComponentClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // If parent provided a starting image, cache-bust it once on mount:
  const bootUrl = useMemo(() => {
    if (!initialUrl) return null
    const sep = initialUrl.includes("?") ? "&" : "?"
    return `${initialUrl}${sep}r=${Date.now()}`
  }, [initialUrl])

  const [url, setUrl] = useState<string | null>(bootUrl)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  // Keep url in sync with parent prop:
  useEffect(() => {
    if (!initialUrl) return
    const sep = initialUrl.includes("?") ? "&" : "?"
    setUrl(`${initialUrl}${sep}r=${Date.now()}`)
  }, [initialUrl])

  // If there is no uploaded image, try to show Google/OAuth avatar automatically.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (url) return // already have an uploaded/public avatar
      const g = await fetchGoogleAvatar(supabase)
      if (!cancelled) setUrl(g) // may be null; UI will fall back to SVG
    })()
    return () => { cancelled = true }
  }, [url, supabase])

  const pickFile = () => fileInputRef.current?.click()

  const cropAndCompress = async (file: File, target = 512): Promise<Blob> => {
    const bmp = await createImageBitmap(file)
    const side = Math.min(bmp.width, bmp.height)
    const sx = Math.floor((bmp.width - side) / 2)
    const sy = Math.floor((bmp.height - side) / 2)
    const canvas = document.createElement("canvas")
    canvas.width = target
    canvas.height = target
    const ctx = canvas.getContext("2d")!
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(bmp, sx, sy, side, side, 0, 0, target, target)
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error("canvas.toBlob failed"))), "image/webp", 0.9)
    )
    return blob
  }

  const onFile = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith("image/")) return
    if (file.size > 5 * 1024 * 1024) {
      console.error("Avatar too large (>5MB)")
      return
    }

    const controller = new AbortController()
    const kill = setTimeout(() => controller.abort(), 30_000)

    try {
      setBusy(true)
      setStatus("Processing image…")

      await supabase.auth.refreshSession()

      const blob = await cropAndCompress(file, 512)
      const path = `users/${uid}/avatar.webp`

      setStatus("Uploading…")
      // @ts-expect-error upsert is supported in supabase-js v2
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, {
          upsert: true,
          cacheControl: "0",
          contentType: blob.type || "image/webp",
          signal: controller.signal,
        })
      if (upErr) throw upErr

      const { data } = supabase.storage.from("avatars").getPublicUrl(path)
      const publicUrl = data?.publicUrl ? `${data.publicUrl}?v=${Date.now()}` : null
      if (!publicUrl) throw new Error("No public URL returned")

      setStatus("Saving profile…")
      await supabase.from("profiles").upsert({ id: uid, avatar_url: publicUrl }, { onConflict: "id" }) // Updated table name

      // Sync auth metadata (helps other pages pick it up)
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl, picture: null } })

      setUrl(publicUrl)
      onUpdated?.(publicUrl)
      setStatus("Done")
    } catch (e: any) {
      const msg = e?.name === "AbortError" ? "Upload timed out after 30s" : (e?.message ?? "Upload failed")
      console.error("Avatar upload failed:", msg)
      setStatus(msg)
    } finally {
      clearTimeout(kill)
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
      setTimeout(() => setStatus(null), 3500)
    }
  }

  const removeAvatar = async () => {
    const controller = new AbortController()
    const kill = setTimeout(() => controller.abort(), 30_000)

    try {
      setBusy(true)
      setStatus("Removing…")
      const path = `users/${uid}/avatar.webp`
      await supabase.storage.from("avatars").remove([path])
      await supabase.from("profiles").upsert({ id: uid, avatar_url: null }, { onConflict: "id" }) // Updated table name
      await supabase.auth.updateUser({ data: { avatar_url: null } })

      // After removing the uploaded avatar, fall back to Google photo if available
      const g = await fetchGoogleAvatar(supabase)
      setUrl(g) // may be null; UI falls back to SVG
      onUpdated?.(g ?? null)

      setStatus("Removed")
    } catch (e: any) {
      const msg = e?.message ?? "Remove failed"
      console.error("Remove avatar failed:", msg)
      setStatus(msg)
    } finally {
      clearTimeout(kill)
      setBusy(false)
      setTimeout(() => setStatus(null), 3500)
    }
  }

  return (
    <div className="relative select-none group" style={{ width: size }}>
      <div className="relative rounded-full overflow-hidden border-2 border-cyber-cyan/50 hover:border-cyber-cyan transition-colors duration-300" style={{ width: size, height: size }}>
        <Image
          src={url || FALLBACK_DATA_URL}
          alt="Profile"
          fill
          sizes={`${size}px`}
          className="object-cover"
          priority
          onError={(e) => ((e.currentTarget as any).src = FALLBACK_DATA_URL)}
        />
        
        {/* Status overlay - only shows when busy */}
        {busy && (
          <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
            <span className="text-xs text-cyber-cyan animate-pulse text-center px-2">{status || "Working…"}</span>
          </div>
        )}
      </div>

      {/* Edit button - positioned at bottom right corner */}
      {!busy && (
        <button
          onClick={pickFile}
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-cyber-dark border-2 border-cyber-cyan/50 hover:border-cyber-cyan transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-cyber-cyan/30"
          title="Change avatar"
          aria-label="Change avatar"
        >
          <svg 
            className="w-4 h-4 text-cyber-cyan transition-colors" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}
      
      {/* Delete button - shows on group hover when there's a custom avatar */}
      {!busy && url && !url.includes('googleusercontent.com') && !url.includes('lh3.googleusercontent.com') && (
        <button
          onClick={removeAvatar}
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-cyber-dark border border-red-500/50 hover:border-red-500 transition-all duration-300 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Remove avatar"
          aria-label="Remove avatar"
        >
          <svg 
            className="w-3 h-3 text-red-400 hover:text-red-500 transition-colors" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Status message below avatar */}
      {status && !busy && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs text-cyber-cyan/80 bg-cyber-dark/90 px-2 py-1 rounded border border-cyber-cyan/30">
            {status}
          </span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] || undefined)}
      />
    </div>
  )
}
