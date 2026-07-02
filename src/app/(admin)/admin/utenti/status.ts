export const MODERATION_BADGE = {
  active:    { label: 'Attivo',    cls: 'bg-green-100 text-green-700' },
  warned:    { label: 'Ammonito',  cls: 'bg-amber-100 text-amber-700' },
  suspended: { label: 'Sospeso',   cls: 'bg-orange-100 text-orange-700' },
  banned:    { label: 'Bloccato',  cls: 'bg-red-100 text-red-700' },
} as const
