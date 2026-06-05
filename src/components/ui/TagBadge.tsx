import { cn } from '@/lib/utils'
import { getTag } from '@/lib/tags'

interface TagBadgeProps {
  tagId: string
  size?: 'sm' | 'md'
  className?: string
}

export function TagBadge({ tagId, size = 'sm', className }: TagBadgeProps) {
  const tag = getTag(tagId)
  if (!tag) return null

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border font-semibold',
      size === 'sm'
        ? 'text-[11px] px-2 py-0.5'
        : 'text-xs px-2.5 py-1',
      tag.color,
      className
    )}>
      <span className={cn(
        'material-symbols-outlined',
        size === 'sm' ? 'text-[11px]' : 'text-sm'
      )}>
        {tag.icon}
      </span>
      {tag.label}
    </span>
  )
}

/** Mostra max N tag + badge "+X" se ce ne sono di più */
export function TagBadgeList({
  tags, max = 3, size = 'sm', className,
}: {
  tags: string[]
  max?: number
  size?: 'sm' | 'md'
  className?: string
}) {
  if (!tags || tags.length === 0) return null
  const visible  = tags.slice(0, max)
  const overflow = tags.length - max

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {visible.map(id => <TagBadge key={id} tagId={id} size={size} />)}
      {overflow > 0 && (
        <span className="inline-flex items-center rounded-full border bg-gray-50 text-gray-500 border-gray-200 text-[11px] px-2 py-0.5 font-semibold">
          +{overflow}
        </span>
      )}
    </div>
  )
}
