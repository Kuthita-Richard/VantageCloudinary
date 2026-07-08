import { PageHeaderSkeleton, ChartFullSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
export default function CategoryLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <ChartFullSkeleton />
      <TableSkeleton rows={4} cols={6} />
    </div>
  )
}
