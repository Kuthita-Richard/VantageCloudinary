import { getOrgSettings } from '@/lib/sheets'
import UploadClient from './UploadClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Import Data' }

export default async function UploadPage() {
  const settings = await getOrgSettings()
  return <UploadClient settings={settings} />
}
