'use client'
import dynamic from 'next/dynamic'
import type { CrewMapPoint } from '@/lib/crewMap'

function MapSkeleton() {
  return (
    <div
      className="w-full rounded-2xl bg-gray-100 animate-pulse border border-gray-200 flex items-center justify-center"
      style={{ height: '560px' }}
    >
      <div className="flex flex-col items-center gap-2 text-gray-400">
        <span className="material-symbols-outlined text-3xl">map</span>
        <p className="text-sm font-medium">Carico la mappa…</p>
      </div>
    </div>
  )
}

const CrewMap = dynamic(() => import('./CrewMap'), { ssr: false, loading: MapSkeleton })

export function CrewMapWrapper({ points, height }: { points: CrewMapPoint[]; height?: string }) {
  return <CrewMap points={points} height={height} />
}
