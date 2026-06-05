import Link from 'next/link'
import { Avatar } from './ui/Avatar'
import { StarsDisplay } from './ui/Stars'
import { formatDate } from '@/lib/utils'
import type { Review } from '@/lib/types'

interface ReviewCardProps {
  review: Review
  /** Mostra il link alla corsa come contesto */
  showRun?: boolean
}

export function ReviewCard({ review, showRun = true }: ReviewCardProps) {
  const reviewer = review.reviewer
  if (!reviewer) return null

  return (
    <div className="flex flex-col gap-3 py-5 border-b border-gray-100 last:border-0">
      {/* Header: avatar + nome + stelle + data */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/profilo/${review.reviewer_id}`}>
            <Avatar name={reviewer.full_name} src={reviewer.avatar_url} size="sm" />
          </Link>
          <div>
            <Link
              href={`/profilo/${review.reviewer_id}`}
              className="text-sm font-bold text-gray-900 hover:text-primary transition-colors"
            >
              {reviewer.full_name}
            </Link>
            {reviewer.city && (
              <p className="text-xs text-gray-400">{reviewer.city}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StarsDisplay rating={review.rating} size="sm" />
          <time className="text-xs text-gray-400">
            {formatDate(review.created_at.split('T')[0])}
          </time>
        </div>
      </div>

      {/* Testo recensione */}
      {review.body && (
        <p className="text-sm text-gray-600 leading-relaxed pl-11">
          &ldquo;{review.body}&rdquo;
        </p>
      )}

      {/* Contesto corsa */}
      {showRun && review.run && (
        <div className="pl-11">
          <Link
            href={`/corse/${review.run_id}`}
            className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full"
          >
            <span className="material-symbols-outlined text-sm">directions_run</span>
            {review.run.title}
            {review.run.city && <span className="text-gray-400">· {review.run.city}</span>}
          </Link>
        </div>
      )}
    </div>
  )
}
