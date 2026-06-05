'use client'
import { cn } from '@/lib/utils'
import { TAGS, getTagsByGroup } from '@/lib/tags'

interface TagPickerProps {
  selected: string[]
  onChange: (tags: string[]) => void
  className?: string
}

export function TagPicker({ selected, onChange, className }: TagPickerProps) {
  const grouped = getTagsByGroup()

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter(t => t !== id)
        : [...selected, id]
    )
  }

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {Array.from(grouped.entries()).map(([group, tags]) => (
        <div key={group}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2.5">
            {group}
          </p>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => {
              const active = selected.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggle(tag.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border text-xs font-semibold px-3 py-1.5 transition-all duration-150 hover:scale-105 active:scale-95',
                    active
                      ? cn(tag.color, 'ring-2 ring-offset-1 ring-current')
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                  )}
                  aria-pressed={active}
                >
                  <span className="material-symbols-outlined text-sm">{tag.icon}</span>
                  {tag.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {selected.length > 0 && (
        <p className="text-xs text-gray-400">
          {selected.length} caratteristic{selected.length === 1 ? 'a' : 'he'} selezionat{selected.length === 1 ? 'a' : 'e'}
          {' · '}
          <button type="button" onClick={() => onChange([])}
            className="text-red-400 hover:text-red-600 transition-colors">
            Rimuovi tutte
          </button>
        </p>
      )}
    </div>
  )
}
