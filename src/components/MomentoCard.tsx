import Link from 'next/link'
import { Avatar } from './ui/Avatar'
import { formatDate } from '@/lib/utils'
import type { Momento } from '@/lib/types'

interface Props {
  momento: Momento
  showRun?: boolean
  size?: 'sm' | 'md'
}

export function MomentoCard({ momento, showRun = false, size = 'md' }: Props) {
  const author = momento.author
  if (!author) return null

  if (size === 'sm') {
    return (
      <Link href={`/corse/${momento.run_id}`}
        className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 block">
        {momento.photo_url ? (
          <img src={momento.photo_url} alt="Momento"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
            <p className="text-xs font-medium text-orange-800 text-center leading-snug line-clamp-4">
              &ldquo;{momento.body}&rdquo;
            </p>
          </div>
        )}
        <div className="absolute inset-0 bg-gray-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          {momento.body && (
            <p className="text-xs text-white line-clamp-2 leading-snug">{momento.body}</p>
          )}
        </div>
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <span className="material-symbols-filled text-[10px]">photo_camera</span>
            Momento
          </span>
        </div>
      </Link>
    )
  }

  return (
    <div className="flex flex-col gap-3 py-5 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/profilo/${momento.author_id}`}>
            <Avatar name={author.full_name} src={author.avatar_url} size="sm" />
          </Link>
          <div>
            <Link href={`/profilo/${momento.author_id}`}
              className="text-sm font-bold text-gray-900 hover:text-primary transition-colors">
              {author.full_name}
            </Link>
            {author.city && <p className="text-xs text-gray-400">{author.city}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showRun && momento.run && (
            <Link href={`/corse/${momento.run_id}`}
              className="text-xs text-primary font-medium hover:underline hidden sm:block">
              {momento.run.title}
            </Link>
          )}
          <time className="text-xs text-gray-400">
            {formatDate(momento.created_at.split('T')[0])}
          </time>
        </div>
      </div>

      {momento.photo_url && (
        <div className="rounded-2xl overflow-hidden aspect-video bg-gray-100">
          <img src={momento.photo_url} alt="Foto del Momento"
            className="w-full h-full object-cover" />
        </div>
      )}

      {momento.body && (
        <p className="text-sm text-gray-700 leading-relaxed">&ldquo;{momento.body}&rdquo;</p>
      )}
    </div>
  )
}
