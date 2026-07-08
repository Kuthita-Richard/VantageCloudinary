/**
 * lib/cloudinary.ts — Image upload via Cloudinary
 *
 * WHY CLOUDINARY OVER VERCEL BLOB:
 *   Vercel Blob only works when hosted on Vercel. The moment you move
 *   to Namecheap, a VPS, or any other host the upload feature breaks.
 *   Cloudinary is host-agnostic — it works everywhere.
 *
 * FREE TIER (no credit card required):
 *   25 GB storage · 25 GB bandwidth/month · Soft limits (email warning, no hard cutoff)
 *   Commercial use allowed on free tier.
 *   More than enough for org logos and favicons indefinitely.
 *
 * SETUP (3 steps, ~5 minutes):
 *   1. Create a free account at cloudinary.com
 *   2. Go to Dashboard — copy Cloud Name, API Key, API Secret
 *   3. Add to .env.local:
 *        CLOUDINARY_CLOUD_NAME=your-cloud-name
 *        CLOUDINARY_API_KEY=your-api-key
 *        CLOUDINARY_API_SECRET=your-api-secret
 *
 * USAGE:
 *   const result = await uploadToCloudinary(file, 'branding/logo-light')
 *   // result.url → permanent CDN URL, stored in Google Sheets Settings tab
 */

import { v2 as cloudinary } from 'cloudinary'

// ── Configure once at module load ─────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
})

export interface UploadResult {
  url:       string   // permanent HTTPS CDN URL
  publicId:  string   // Cloudinary public ID (for future deletion/replacement)
  width?:    number
  height?:   number
  format?:   string
}

/**
 * Upload a File object to Cloudinary.
 *
 * Files are stored in the 'vantage/branding' folder in your Cloudinary account.
 * The public_id is deterministic (based on the field name) so re-uploading a logo
 * replaces the old one automatically — no orphaned files accumulate.
 *
 * @param file      The File object from a form upload
 * @param publicId  Stable identifier e.g. 'branding/logo-light'
 */
export async function uploadToCloudinary(
  file:     File,
  publicId: string
): Promise<UploadResult> {
  // Verify credentials are configured
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error(
      'Cloudinary not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, ' +
      'and CLOUDINARY_API_SECRET to your .env.local file. ' +
      'Get them free at cloudinary.com (no credit card required).'
    )
  }

  // Convert File → Buffer (Cloudinary SDK needs Buffer or base64)
  const arrayBuffer = await file.arrayBuffer()
  const buffer      = Buffer.from(arrayBuffer)
  const base64      = `data:${file.type};base64,${buffer.toString('base64')}`

  const result = await cloudinary.uploader.upload(base64, {
    public_id:      `vantage/${publicId}`,
    overwrite:      true,       // Replace existing file with same public_id
    invalidate:     true,       // Purge CDN cache on overwrite
    resource_type:  'image',
    allowed_formats: ['png', 'jpg', 'jpeg', 'svg', 'webp', 'ico'],
    transformation: [
      { quality: 'auto', fetch_format: 'auto' }, // Auto-optimize format + quality
    ],
  })

  return {
    url:      result.secure_url,
    publicId: result.public_id,
    width:    result.width,
    height:   result.height,
    format:   result.format,
  }
}

/**
 * Delete an image from Cloudinary by its public ID.
 * Called when a user replaces a logo (cleanup of old file).
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId)
  } catch {
    // Non-blocking — deletion failure should not break the upload flow
  }
}
