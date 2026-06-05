export type RunLevel = 'principiante' | 'intermedio' | 'avanzato' | 'tutti'
export type RunStatus = 'aperta' | 'completa' | 'annullata'
export type ParticipationStatus = 'in_attesa' | 'approvata' | 'rifiutata'
export type RecurrenceType = 'settimanale' | 'bisettimanale' | 'mensile'

export interface Profile {
  id: string
  full_name: string
  city: string | null
  level: RunLevel | null
  pace_min: number | null
  pace_max: number | null
  bio: string | null
  strava_url: string | null
  garmin_url: string | null
  instagram_url: string | null
  avatar_url: string | null
  created_at: string
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
  my_participation?: Participation | null
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

export interface Participation {
  id: string
  run_id: string
  user_id: string
  user?: Profile
  status: ParticipationStatus
  message: string | null
  created_at: string
}
