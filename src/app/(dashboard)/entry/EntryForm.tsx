'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { salesEntrySchema, type SalesEntryInput } from '@/schemas'
import { createSalesEntryAction } from '@/actions'
import { toast } from 'sonner'
import { useState } from 'react'
import { Loader2, Save, RotateCcw } from 'lucide-react'
import type { OrgSettings, OrgMetadata } from '@/types'
import { MONTHS } from '@/lib/utils'

interface Props {
  settings: OrgSettings
  metadata: OrgMetadata
}

export default function EntryForm({ settings, metadata }: Props) {
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, watch,
    formState: { errors } } = useForm<SalesEntryInput>({
    resolver: zodResolver(salesEntrySchema),
    defaultValues: { status: 'Active', date: new Date().toISOString().slice(0, 10) },
  })

  const target = watch('targetAmount') || 0
  const actual = watch('actualAmount') || 0
  const achievement = target > 0 ? ((actual / target) * 100).toFixed(1) : '—'
  const variance = target > 0 ? actual - target : 0

  const onSubmit = async (data: SalesEntryInput) => {
    setSubmitting(true)
    const result = await createSalesEntryAction(data)
    setSubmitting(false)
    if (result.success) {
      toast.success(result.message, { description: `ID: ${result.id}` })
      reset({ status: 'Active', date: new Date().toISOString().slice(0, 10) })
    } else {
      toast.error(result.message)
    }
  }

  const Field = ({ label, error, children, required }: {
    label: string; error?: string; children: React.ReactNode; required?: boolean
  }) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium" style={{ color: 'var(--muted-fg)' }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
    </div>
  )

  const inputCls = `w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-all
    focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]`
  const inputStyle = { background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--fg)' }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">

      {/* Live preview */}
      {target > 0 && (
        <div className="rounded-xl border p-4 grid grid-cols-3 gap-4"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--muted-fg)' }}>Variance</p>
            <p className="text-lg font-bold tabular-nums"
              style={{ color: variance >= 0 ? '#22c55e' : '#ef4444' }}>
              {variance >= 0 ? '+' : ''}{settings.currencySymbol}{Math.abs(variance).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--muted-fg)' }}>Achievement</p>
            <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--primary)' }}>{achievement}%</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--muted-fg)' }}>Status</p>
            <p className="text-sm font-semibold" style={{ color: Number(achievement) >= 100 ? '#22c55e' : Number(achievement) >= 90 ? '#38bdf8' : '#ef4444' }}>
              {Number(achievement) >= settings.perfThresholdExceeding ? '🟢 Exceeding'
                : Number(achievement) >= settings.perfThresholdOnTrack ? '🔵 On Track'
                : Number(achievement) >= settings.perfThresholdAtRisk  ? '🟡 At Risk'
                : '🔴 Below Target'}
            </p>
          </div>
        </div>
      )}

      {/* Row 1 */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date" error={errors.date?.message} required>
          <input type="date" {...register('date')} className={inputCls} style={inputStyle} />
        </Field>
        <Field label="Status">
          <select {...register('status')} className={inputCls} style={inputStyle}>
            {metadata.statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 gap-4">
        <Field label={settings.regionLabel} error={errors.region?.message} required>
          <select {...register('region')} className={inputCls} style={inputStyle}>
            <option value="">Select {settings.regionLabel}</option>
            {metadata.regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label={settings.categoryLabel} error={errors.category?.message} required>
          <select {...register('category')} className={inputCls} style={inputStyle}>
            <option value="">Select {settings.categoryLabel}</option>
            {metadata.categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      {/* Row 3 */}
      <Field label={settings.salesRepLabel} error={errors.salesRep?.message} required>
        <select {...register('salesRep')} className={inputCls} style={inputStyle}>
          <option value="">Select {settings.salesRepLabel}</option>
          {metadata.salesReps.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>

      {/* Row 4 — Amounts */}
      <div className="grid grid-cols-2 gap-4">
        <Field label={`Target Amount (${settings.currencySymbol})`} error={errors.targetAmount?.message} required>
          <input type="number" step="0.01" min="0"
            {...register('targetAmount', { valueAsNumber: true })}
            placeholder="0.00" className={inputCls} style={inputStyle} />
        </Field>
        <Field label={`Actual Amount (${settings.currencySymbol})`} error={errors.actualAmount?.message} required>
          <input type="number" step="0.01" min="0"
            {...register('actualAmount', { valueAsNumber: true })}
            placeholder="0.00" className={inputCls} style={inputStyle} />
        </Field>
      </div>

      {/* Notes */}
      <Field label={`Notes${settings.requireEntryNotes ? '' : ' (optional)'}`} error={errors.notes?.message}>
        <textarea {...register('notes')} rows={3} placeholder="Any additional context…"
          className={inputCls} style={{ ...inputStyle, resize: 'vertical' }} />
      </Field>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={submitting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'white' }}>
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {submitting ? 'Saving…' : 'Save Record'}
        </button>
        <button type="button" onClick={() => reset({ status: 'Active', date: new Date().toISOString().slice(0, 10) })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-opacity hover:opacity-70"
          style={{ border: '1px solid var(--border)', color: 'var(--muted-fg)' }}>
          <RotateCcw size={13} />
          Reset
        </button>
      </div>
    </form>
  )
}
