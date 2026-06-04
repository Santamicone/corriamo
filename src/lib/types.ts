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

export interface Participation {
  id: string
  run_id: string
  user_id: string
  user?: Profile
  status: ParticipationStatus
  message: string | null
  created_at: string
}
