'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { identitySettingsSchema } from '@/schemas'
import { updateSettingsAction, uploadLogoAction } from '@/actions'
import { toast } from 'sonner'
import { useState, useRef } from 'react'
import { Loader2, Upload, X, Save } from 'lucide-react'
import type { OrgSettings } from '@/types'
import Image from 'next/image'
import { z } from 'zod'

type IdentityInput = z.infer<typeof identitySettingsSchema>

interface Props { settings: OrgSettings }

export default function IdentitySettings({ settings }: Props) {
  const [saving, setSaving]               = useState(false)
  const [logoPreview, setLogoPreview]     = useState(settings.logoUrlLight)
  const [logoDarkPreview, setLogoDark]    = useState(settings.logoUrlDark)
  const [faviconPreview, setFaviconPrev]  = useState(settings.faviconUrl)
  const [uploadingField, setUploadingField] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<IdentityInput>({
    resolver: zodResolver(identitySettingsSchema),
    defaultValues: {
      orgName:      settings.orgName,
      orgLegalName: settings.orgLegalName,
      tagline:      settings.tagline,
      websiteUrl:   settings.websiteUrl,
    },
  })

  const onSubmit = async (data: IdentityInput) => {
    setSaving(true)
    const res = await updateSettingsAction(data)
    setSaving(false)
    res.success ? toast.success(res.message) : toast.error(res.message)
  }

  const handleImageUpload = async (
    file: File,
    field: 'logoUrlLight' | 'logoUrlDark' | 'faviconUrl',
    setPreview: (url: string) => void
  ) => {
    setUploadingField(field)
    const formData = new FormData()
    formData.append('file', file)
    const res = await uploadLogoAction(formData, field)
    setUploadingField(null)
    if (res.success && res.url) {
      setPreview(res.url)
      toast.success(res.message)
    } else {
      toast.error(res.message)
    }
  }

  const inputCls = `w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-all focus:border-[var(--primary)]`
  const inputStyle = { background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--fg)' }

  const Field = ({ label, error, children, hint }: {
    label: string; error?: string; children: React.ReactNode; hint?: string
  }) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium" style={{ color: 'var(--muted-fg)' }}>{label}</label>
      {children}
      {hint  && <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>{hint}</p>}
      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
    </div>
  )

  const ImageUploader = ({ label, preview, onUpload, hint }: {
    label: string; preview: string; hint: string;
    onUpload: (f: File) => void
  }) => {
    const ref = useRef<HTMLInputElement>(null)
    return (
      <div className="space-y-2">
        <label className="block text-xs font-medium" style={{ color: 'var(--muted-fg)' }}>{label}</label>
        <div
          className="flex items-center gap-4 p-4 rounded-xl border"
          style={{ background: 'var(--input)', borderColor: 'var(--border)' }}
        >
          {preview ? (
            <Image src={preview} alt={label} width={56} height={56}
              className="rounded-lg object-contain" style={{ background: 'var(--card)' }} />
          ) : (
            <div className="w-14 h-14 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--muted)' }}>
              <Upload size={20} style={{ color: 'var(--muted-fg)' }} />
            </div>
          )}
          <div className="flex-1">
            <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>{hint}</p>
            <button type="button" onClick={() => ref.current?.click()}
              disabled={!!uploadingField}
              className="mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-50"
              style={{ background: 'var(--primary)', color: 'white' }}>
              {uploadingField ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
              {preview ? 'Replace' : 'Upload'}
            </button>
            <input ref={ref} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
              className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
          Organisation Details
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Organisation Name *" error={errors.orgName?.message}>
            <input {...register('orgName')} className={inputCls} style={inputStyle} placeholder="Acme Corp" />
          </Field>
          <Field label="Legal / Full Name">
            <input {...register('orgLegalName')} className={inputCls} style={inputStyle} placeholder="Acme Corporation Ltd" />
          </Field>
        </div>
        <Field label="Tagline / Motto">
          <input {...register('tagline')} className={inputCls} style={inputStyle} placeholder="Performance Intelligence" />
        </Field>
        <Field label="Website URL" error={errors.websiteUrl?.message}>
          <input {...register('websiteUrl')} className={inputCls} style={inputStyle} placeholder="https://yourcompany.com" />
        </Field>
      </div>

      {/* Logo uploads */}
      <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
          Brand Assets (stored in Vercel Blob, URL saved to Settings)
        </p>
        <ImageUploader label="Logo — Light Background" preview={logoPreview}
          hint="Shown in sidebar and PDF. PNG, SVG, or WEBP, max 2MB."
          onUpload={f => handleImageUpload(f, 'logoUrlLight', setLogoPreview)} />
        <ImageUploader label="Logo — Dark Background" preview={logoDarkPreview}
          hint="Used when dark mode is active. Optional."
          onUpload={f => handleImageUpload(f, 'logoUrlDark', setLogoDark)} />
        <ImageUploader label="Favicon" preview={faviconPreview}
          hint="Browser tab icon. ICO, PNG, or SVG, 32×32px recommended."
          onUpload={f => handleImageUpload(f, 'faviconUrl', setFaviconPrev)} />
      </div>

      <button type="submit" disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: 'var(--primary)', color: 'white' }}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {saving ? 'Saving…' : 'Save Identity'}
      </button>
    </form>
  )
}
