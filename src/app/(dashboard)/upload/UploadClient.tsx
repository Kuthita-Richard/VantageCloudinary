'use client'

import { useState, useRef, useCallback } from 'react'
import { processExcelUploadAction } from '@/actions'
import { toast } from 'sonner'
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react'
import type { OrgSettings } from '@/types'

interface Props { settings: OrgSettings }

interface UploadResult {
  success: number
  failed: number
  errors: string[]
  message: string
}

export default function UploadClient({ settings }: Props) {
  const [file, setFile]           = useState<File | null>(null)
  const [dragging, setDragging]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult]       = useState<UploadResult | null>(null)
  const inputRef                  = useRef<HTMLInputElement>(null)

  const accepted = '.xlsx,.xls,.csv'

  const handleFile = (f: File) => {
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Only Excel (.xlsx, .xls) and CSV files are supported')
      return
    }
    setFile(f)
    setResult(null)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    const res = await processExcelUploadAction(formData)
    setUploading(false)
    setResult(res)
    if (res.success > 0) toast.success(`${res.success} records imported`)
    if (res.failed > 0)  toast.error(`${res.failed} rows failed`)
  }

  // Template download — generates a sample Excel in the browser
  const downloadTemplate = () => {
    const headers = ['date','region','category','salesRep','targetAmount','actualAmount','status','notes']
    const sample  = ['2024-01-15','North','Product A','Alice Johnson','50000','51200','Active','Good month']
    const csv     = [headers.join(','), sample.join(',')].join('\n')
    const blob    = new Blob([csv], { type: 'text/csv' })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a')
    a.href = url; a.download = 'vantage-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Import from Excel / CSV</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-fg)' }}>
            Upload an existing spreadsheet. Column names are matched automatically — flexible to your file format.
          </p>
        </div>
        <button onClick={downloadTemplate}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-70"
          style={{ border: '1px solid var(--border)', color: 'var(--muted-fg)' }}>
          <Download size={13} />
          Template
        </button>
      </div>

      {/* Accepted column guide */}
      <div className="rounded-xl border p-4 text-xs space-y-2" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <p className="font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>Accepted Column Names (any of these work)</p>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
          {[
            ['Date',          'date'],
            [settings.regionLabel,   'region, branch, territory, zone'],
            [settings.categoryLabel, 'category, product, service, department'],
            [settings.salesRepLabel, 'salesRep, rep, officer, agent, name'],
            ['Target Amount', 'targetAmount, target, targetAmt, goal'],
            ['Actual Amount', 'actualAmount, actual, actualAmt, sales, achieved'],
            ['Status',        'status (Active/Inactive, default: Active)'],
            ['Notes',         'notes, remarks, comments (optional)'],
          ].map(([field, aliases]) => (
            <div key={field}>
              <span className="font-medium" style={{ color: 'var(--fg)' }}>{field}: </span>
              <span style={{ color: 'var(--muted-fg)' }}>{aliases}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all"
        style={{
          borderColor: dragging ? 'var(--primary)' : file ? '#22c55e' : 'var(--border)',
          background:  dragging ? 'color-mix(in oklch, var(--primary) 6%, transparent)' : 'var(--card)',
        }}
      >
        <input ref={inputRef} type="file" accept={accepted} className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

        {file ? (
          <div className="flex flex-col items-center gap-3">
            <FileSpreadsheet size={40} color="#22c55e" />
            <div>
              <p className="font-semibold" style={{ color: 'var(--fg)' }}>{file.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button type="button"
              onClick={e => { e.stopPropagation(); setFile(null); setResult(null) }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
              style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>
              <X size={12} /> Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload size={36} style={{ color: 'var(--muted-fg)' }} />
            <div>
              <p className="font-medium" style={{ color: 'var(--fg)' }}>Drop your file here or click to browse</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-fg)' }}>Supports .xlsx, .xls, .csv</p>
            </div>
          </div>
        )}
      </div>

      {/* Import button */}
      {file && !result && (
        <button onClick={handleUpload} disabled={uploading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'white' }}>
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? 'Importing…' : 'Import Records'}
        </button>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border p-5 space-y-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="font-semibold" style={{ color: 'var(--fg)' }}>Import Complete</p>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} color="#22c55e" />
              <span className="text-sm" style={{ color: 'var(--fg)' }}>
                <strong>{result.success}</strong> records imported
              </span>
            </div>
            {result.failed > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle size={16} color="#ef4444" />
                <span className="text-sm" style={{ color: 'var(--fg)' }}>
                  <strong>{result.failed}</strong> rows failed
                </span>
              </div>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="rounded-lg p-3 space-y-1" style={{ background: 'var(--input)' }}>
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs" style={{ color: '#ef4444' }}>{e}</p>
              ))}
            </div>
          )}
          <button onClick={() => { setFile(null); setResult(null) }}
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: 'var(--primary)' }}>
            Import another file
          </button>
        </div>
      )}
    </div>
  )
}
