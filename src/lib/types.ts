export type RunLevel = 'principiante' | 'intermedio' | 'avanzato' | 'tutti'
export type ProfileLevel = RunLevel | 'amatore_gare' | 'atleta'
export type RunStatus = 'aperta' | 'completa' | 'annullata'
export type RunType = 'allenamento' | 'gara'
export type RaceDistance = '5k' | '10k' | '21k' | '42k'
export type ParticipationStatus = 'in_attesa' | 'approvata' | 'rifiutata'
export type RecurrenceType = 'settimanale' | 'bisettimanale' | 'mensile'

export interface Profile {
  id: string
  full_name: string
  city: string | null
  level: ProfileLevel | null
  pace_min: number | null
  pace_max: number | null
  bio: string | null
  strava_url: string | null
  garmin_url: string | null
  instagram_url: string | null
  avatar_url: string | null
  created_at: string
  // Nuovi campi profilo
  age: number | null
  why_i_run: string[]
  pb_5k: string | null
  pb_10k: string | null
  pb_21k: string | null
  pb_42k: string | null
  filter_by_city: boolean
  // Preferenze email
  email_prefs: { immediate: boolean; digest: boolean; reminders: boolean } | null
  last_seen_at: string | null
  // Affidabilità organizzatore (materializzata da trigger)
  reliability_score:     number | null
  reliability_eligible:  number
  reliability_confirmed: number
}

export interface Run {
  id: string
  organizer_id: string
  organizer: Profile
  title: string
  description: string | null
  date: string
  time: string
  location: string
  city: string
  distance_km: number | null
  pace_target: string | null
  level: RunLevel
  max_participants: number | null
  status: RunStatus
  is_no_drop: boolean
  series_id: string | null
  series?: Series
  created_at: string
  participants_count?: number
  interests_count?: number
  my_participation?: Participation | null
  my_interest?: boolean
  location_public?: boolean
  // Campi gara (type='gara')
  type?: RunType
  race_name?: string | null
  race_distance?: RaceDistance | null
  race_target_time?: string | null
  race_registered?: boolean
  looking_for?: string[]
  tags?: string[]
}

export interface Series {
  id: string
  organizer_id: string
  organizer: Profile
  title: string
  description: string | null
  location: string
  city: string
  distance_km: number | null
  pace_target: string | null
  level: RunLevel
  max_participants: number | null
  is_no_drop: boolean
  recurrence_type: RecurrenceType
  recurrence_day: number
  recurrence_time: string
  start_date: string
  end_date: string | null
  created_at: string
  upcoming_runs?: Run[]
}

export interface Momento {
  id: string
  run_id: string
  run?: Pick<Run, 'id' | 'title' | 'date' | 'city'>
  author_id: string
  author?: Profile
  body: string | null
  photo_url: string | null
  created_at: string
}

export interface Momento {
  id: string
  run_id: string
  run?: Pick<Run, 'id' | 'title' | 'date' | 'city'>
  author_id: string
  author?: Profile
  photo_url: string | null
  body: string | null
  created_at: string
}

export type NotificationType =
  | 'nuova_richiesta'
  | 'richiesta_approvata'
  | 'richiesta_rifiutata'
  | 'nuovo_messaggio'
  | 'promemoria_corsa'
  | 'corsa_annullata'
  | 'corsa_modificata'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  run_id: string | null
  actor_id: string | null
  actor?: Profile
  read: boolean
  show_after: string
  created_at: string
}

export interface Review {
  id: string
  run_id: string
  run?: Pick<Run, 'id' | 'title' | 'date' | 'city'>
  reviewer_id: string
  reviewer?: Profile
  reviewed_id: string
  rating: number          // 1–5
  body: string | null
  created_at: string
  updated_at: string
}

export interface ReviewStats {
  average: number
  count: number
}

export interface Message {
  id: string
  run_id: string | null
  run?: Run
  sender_id: string
  sender?: Profile
  recipient_id: string
  recipient?: Profile
  body: string
  read_at: string | null
  created_at: string
}

export interface MessageThread {
  run_id: string | null
  run?: Pick<Run, 'id' | 'title' | 'date' | 'city'>
  other_user: Profile
  last_message: Message
  unread_count: number
}

export interface CheckIn {
  id: string
  run_id: string
  user_id: string
  checked_in_at: string
}

export interface Interest {
  id: string
  run_id: string
  user_id: string
  created_at: string
}

export interface RunChatMessage {
  id: string
  run_id: string
  author_id: string
  author?: Profile
  body: string
  created_at: string
}

export interface RunConfirmation {
  id: string
  run_id: string
  user_id: string
  confirmed: boolean
  created_at: string
}

export type CrewType = 'training_group' | 'running_club' | 'friends'
export type CrewVisibility = 'public' | 'private'
export type CrewMemberRole = 'owner' | 'admin' | 'member'
export type CrewMemberStatus = 'active' | 'pending' | 'rejected'
export type RunVisibility = 'public' | 'crew_only' | 'invite_only'

export interface Crew {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  owner_id: string
  owner?: Profile
  crew_type: CrewType
  visibility: CrewVisibility
  whatsapp_group_link: string | null
  created_at: string
}

export interface CrewMember {
  id: string
  crew_id: string
  user_id: string
  user?: Profile
  role: CrewMemberRole
  status: CrewMemberStatus
  joined_at: string
}

export const CREW_TYPE_LABELS: Record<CrewType, { name: string; ownerLabel: string; adminLabel: string; memberLabel: string; description: string }> = {
  training_group: {
    name: 'Squadra di allenamento',
    ownerLabel: 'Coach',
    adminLabel: 'Coach',
    memberLabel: 'Atleta',
    description: 'Allenamenti strutturati con un programma definito',
  },
  running_club: {
    name: 'Running club',
    ownerLabel: 'Leader',
    adminLabel: 'Leader',
    memberLabel: 'Membro',
    description: 'Club organizzato per uscite e gare di gruppo',
  },
  friends: {
    name: 'Gruppo di amici',
    ownerLabel: 'Admin',
    adminLabel: 'Admin',
    memberLabel: 'Membro',
    description: 'Gruppo informale per correre insieme',
  },
}

export interface Participation {
  id: string
  run_id: string
  user_id: string
  user?: Profile
  status: ParticipationStatus
  message: string | null
  created_at: string
}
