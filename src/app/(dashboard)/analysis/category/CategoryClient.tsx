'use client'

import { useRouter } from 'next/navigation'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { formatCurrencyCompact, formatPct } from '@/lib/utils'
import type { OrgSettings } from '@/types'
import { ArrowLeft } from 'lucide-react'

interface CatRow {
  category: string; actual: number; target: number
  variancePct: number; achievementPct: number; recordCount: number
}
interface Props { data: CatRow[]; settings: OrgSettings; drillFilter: string | null }

export default function CategoryClient({ data, settings, drillFilter }: Props) {
  const router = useRouter()
  const sym    = settings.currencySymbol

  return (
    <div className="space-y-5">

      {/* Drill-through back banner */}
      {drillFilter && (
        <div className="flex items-center gap-3 p-3 rounded-xl border"
          style={{ background: 'color-mix(in oklch, var(--primary) 8%, transparent)', borderColor: 'color-mix(in oklch, var(--primary) 30%, transparent)' }}>
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ background: 'var(--primary)', color: 'white' }}>
            <ArrowLeft size={12} /> Back to Dashboard
          </button>
          <p className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
            Drilled through from: <strong>{drillFilter}</strong>
          </p>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
          {settings.categoryLabel} Analysis
          {drillFilter && <span className="ml-2 text-base font-normal" style={{ color: 'var(--muted-fg)' }}>— {drillFilter}</span>}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-fg)' }}>
          Variance and achievement by {settings.categoryLabel.toLowerCase()}.
        </p>
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl border p-16 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>No data for this selection.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--muted-fg)' }}>
              Variance % by {settings.categoryLabel}
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} margin={{ top: 18, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="category" tick={{ fill: 'var(--muted-fg)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-fg)', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v.toFixed(0)}%`} />
                <Tooltip
                  formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, 'Variance']}
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}
                  labelStyle={{ color: 'var(--fg)', fontWeight: 600 }} />
                <Bar dataKey="variancePct" name="Variance %" radius={[3, 3, 0, 0]}
                  label={{ position: 'top', fill: 'var(--muted-fg)', fontSize: 9,
                    formatter: (v: unknown) => `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(1)}%` }}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.variancePct >= 0 ? '#217346' : '#c0392b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  {[settings.categoryLabel, `Actual (${sym})`, `Target (${sym})`, 'Achievement', 'Variance %', 'Records'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]"
                      style={{ color: 'var(--muted-fg)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={row.category}
                    style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--card)' : 'var(--input)' }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--fg)' }}>{row.category}</td>
                    <td className="px-4 py-3 tabular-nums font-medium" style={{ color: 'var(--fg)' }}>{formatCurrencyCompact(row.actual, sym)}</td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--muted-fg)' }}>{formatCurrencyCompact(row.target, sym)}</td>
                    <td className="px-4 py-3 tabular-nums font-bold"
                      style={{ color: row.achievementPct >= 100 ? '#16a34a' : '#dc2626' }}>
                      {formatPct(row.achievementPct)}
                    </td>
                    <td className="px-4 py-3 tabular-nums"
                      style={{ color: row.variancePct >= 0 ? '#16a34a' : '#dc2626' }}>
                      {row.variancePct >= 0 ? '+' : ''}{formatPct(row.variancePct)}
                    </td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--muted-fg)' }}>{row.recordCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
