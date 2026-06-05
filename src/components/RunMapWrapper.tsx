'use client'
import dynamic from 'next/dynamic'
import type { Run } from '@/lib/types'

function MapSkeleton() {
  return (
    <div
      className="w-full rounded-2xl bg-gray-100 animate-pulse border border-gray-200 flex items-center justify-center"
      style={{ height: '520px' }}
    >
      <div className="flex flex-col items-center gap-2 text-gray-400">
        <span className="material-symbols-outlined text-3xl">map</span>
        <p className="text-sm font-medium">Carico la mappa…</p>
      </div>
    </div>
  )
}

const RunMap = dynamic(() => import('./RunMap'), {
  ssr: false,
  loading: MapSkeleton,
})

interface Props {
  runs: Run[]
  height?: string
}

export function RunMapWrapper({ runs, height = '520px' }: Props) {
  return <RunMap runs={runs} height={height} />
}
