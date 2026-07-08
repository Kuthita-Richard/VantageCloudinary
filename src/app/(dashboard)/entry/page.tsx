import { getOrgSettings, getMetadata } from '@/lib/sheets'
import EntryForm from './EntryForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Data Entry' }

export default async function EntryPage() {
  const [settings, metadata] = await Promise.all([getOrgSettings(), getMetadata()])

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>New Entry</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-fg)' }}>
          Fill in the fields below. Achievement and performance flag are computed automatically.
        </p>
      </div>
      <EntryForm settings={settings} metadata={metadata} />
    </div>
  )
}
