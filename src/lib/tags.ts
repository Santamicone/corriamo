export interface TagDef {
  id:    string
  label: string
  icon:  string   // Material Symbols name
  group: string
  color: string   // Tailwind border/bg/text classes
}

export const TAG_GROUPS = [
  'Ritmo e focus',
  'Dopo la corsa',
  'Percorso',
  'Partecipazione',
] as const

export const TAGS: TagDef[] = [
  /* ── Ritmo e focus ── */
  { id: 'no_chiacchiere',      label: 'No chiacchiere',         icon: 'do_not_disturb',   group: 'Ritmo e focus',   color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'ritmo_conversazione', label: 'Ritmo conversazione',    icon: 'chat_bubble',      group: 'Ritmo e focus',   color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'strutturato',         label: 'Allenamento strutturato', icon: 'fitness_center',  group: 'Ritmo e focus',   color: 'bg-red-50 text-red-700 border-red-200' },

  /* ── Dopo la corsa ── */
  { id: 'caffe_dopo',          label: 'Caffè dopo',             icon: 'local_cafe',       group: 'Dopo la corsa',   color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'colazione_dopo',      label: 'Colazione dopo',         icon: 'breakfast_dining', group: 'Dopo la corsa',   color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'aperitivo_dopo',      label: 'Aperitivo dopo',         icon: 'wine_bar',         group: 'Dopo la corsa',   color: 'bg-rose-50 text-rose-700 border-rose-200' },

  /* ── Percorso ── */
  { id: 'trail',               label: 'Trail / sterrato',       icon: 'forest',           group: 'Percorso',        color: 'bg-green-50 text-green-700 border-green-200' },
  { id: 'pista',               label: 'Pista',                  icon: 'sports_score',     group: 'Percorso',        color: 'bg-sky-50 text-sky-700 border-sky-200' },

  /* ── Partecipazione ── */
  { id: 'principianti',        label: 'Principianti benvenuti', icon: 'emoji_people',     group: 'Partecipazione',  color: 'bg-green-50 text-green-700 border-green-200' },
  { id: 'cani_benvenuti',      label: 'Cani benvenuti',         icon: 'pets',             group: 'Partecipazione',  color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { id: 'solo_donne',          label: 'Solo donne',             icon: 'female',           group: 'Partecipazione',  color: 'bg-pink-50 text-pink-700 border-pink-200' },
  { id: 'senior_friendly',     label: 'Senior-friendly',        icon: 'elderly',          group: 'Partecipazione',  color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },

]

export const TAG_MAP = new Map(TAGS.map(t => [t.id, t]))

export function getTag(id: string): TagDef | undefined {
  return TAG_MAP.get(id)
}

export function getTagsByGroup(): Map<string, TagDef[]> {
  const result = new Map<string, TagDef[]>()
  for (const group of TAG_GROUPS) result.set(group, [])
  for (const tag of TAGS) result.get(tag.group)?.push(tag)
  return result
}
