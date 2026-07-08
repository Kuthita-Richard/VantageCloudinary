/**
 * POST /api/upload
 *
 * Handles image uploads to Cloudinary (replaces Vercel Blob).
 * Works on any hosting provider — Vercel, Namecheap, VPS, Docker.
 *
 * Accepts: multipart/form-data with a 'file' field
 * Returns: { url: string } on success
 *
 * Auth: Admin role required (checked via session cookie)
 * Constraints: image types only, max 2MB (enforced before upload)
 */
import { NextResponse } from 'next/server'
import { auth }         from '@/lib/auth'
import { uploadToCloudinary } from '@/lib/cloudinary'

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file     = formData.get('file')     as File   | null
  const field    = formData.get('field')    as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/x-icon']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'File must be PNG, JPG, SVG, WEBP or ICO' },
      { status: 400 }
    )
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 2MB' }, { status: 400 })
  }

  try {
    const result = await uploadToCloudinary(file, `branding/${field ?? 'misc'}`)
    return NextResponse.json({ url: result.url })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
