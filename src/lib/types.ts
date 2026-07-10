export type RunLevel = 'principiante' | 'intermedio' | 'avanzato' | 'tutti'
export type ProfileLevel = RunLevel | 'amatore_gare' | 'atleta'
export type RunStatus = 'aperta' | 'completa' | 'annullata'
export type RunType = 'allenamento' | 'gara'
export type RaceDistance = '5k' | '10k' | '21k' | '42k'
// Distanze del catalogo gare (estende RaceDistance con trail/ultra/other)
export type CatalogDistance = RaceDistance | 'trail' | 'ultra' | 'other'
export type RaceType = 'competitiva' | 'non_competitiva' | 'federale' | 'internazionale' | 'charity'
export type RaceRegistration = 'aperte' | 'chiuse' | 'da_verificare'
export type RaceCircuit = 'major' | 'superhalfs' | 'wa_label' | 'aims'
export type RaceSource = 'editoriale' | 'utente' | 'aims' | 'fidal'
export type RaceStatus = 'published' | 'pending' | 'rejected'
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
  // Strava — condivide le attività con le proprie crew private
  strava_share_activities?: boolean
  // Strava — mostra le attività sul profilo pubblico (opt-in)
  strava_public_profile?: boolean
  // Preferenze email
  email_prefs: { immediate: boolean; digest: boolean; reminders: boolean } | null
  last_seen_at: string | null
  // Affidabilità organizzatore (materializzata da trigger)
  reliability_score:     number | null
  reliability_eligible:  number
  reliability_confirmed: number
  // Affidabilità come partecipante (presenze, SQL #32)
  attendance_score?:     number | null
  attendance_eligible?:  number
  attendance_confirmed?: number
  // Moderazione (calendario gare)
  is_admin?: boolean
  // Moderazione utenti (sezione admin, SQL #28)
  moderation_status?: 'active' | 'warned' | 'suspended' | 'banned'
  warned_count?: number
  moderation_until?: string | null
}

// --- Sezione admin (SQL #28) -------------------------------------------------
export type ModerationAction = 'warning' | 'suspension' | 'ban'
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed'

export interface UserModeration {
  id: string
  user_id: string
  admin_id: string | null
  action: ModerationAction
  reason: string
  note: string | null
  expires_at: string | null
  created_at: string
  revoked_at: string | null
  revoked_by: string | null
}

export interface AdminAction {
  id: string
  admin_id: string | null
  action_type: string
  entity_table: string | null
  entity_id: string | null
  reason: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Report {
  id: string
  reporter_id: string
  entity_table: string
  entity_id: string
  reported_user_id: string | null
  reason: string
  status: ReportStatus
  resolved_by: string | null
  resolution_note: string | null
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
  // Ponte al catalogo gare (public.races)
  race_id?: string | null
}

// Catalogo gare (public.races) — evento reale, distinto dai post community type='gara'
export interface Race {
  id: string
  slug: string
  name: string
  city: string
  region: string | null
  country: string
  event_date: string
  end_date: string | null
  distances: CatalogDistance[]
  race_type: RaceType
  level_hint: ProfileLevel | null
  elevation_m: number | null
  course_profile: string[]
  participants_est: number | null
  official_url: string | null
  registration_status: RaceRegistration
  circuit: RaceCircuit | null
  tags: string[]
  gpx_path: string | null
  featured: boolean
  source: RaceSource
  external_ref: string | null
  status: RaceStatus
  created_by: string | null
  created_at: string
  updated_at: string
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
  | 'presenza_confermata'

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
  source?: 'manual' | 'strava'
  created_at: string
}

export type CrewType = 'training_group' | 'running_club' | 'friends'
export type CrewVisibility = 'public' | 'private'
export type CrewMemberRole = 'owner' | 'admin' | 'member'
export type CrewMemberStatus = 'active' | 'pending' | 'rejected'
export type RunVisibility = 'public' | 'crew_only' | 'invite_only'

export interface Crew {
  id: string
  slug: string | null
  name: string
  description: string | null
  avatar_url: string | null
  cover_url: string | null
  owner_id: string
  owner?: Profile
  crew_type: CrewType
  visibility: CrewVisibility
  whatsapp_group_link: string | null
  created_at: string
}

export interface CrewPost {
  id: string
  crew_id: string
  author_id: string
  author?: Profile
  body: string
  pinned: boolean
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

export const CREW_TYPE_LABELS: Record<CrewType, { name: string; ownerLabel: string; adminLabel: string; memberLabel: string; memberLabelPlural: string; description: string }> = {
  training_group: {
    name: 'Squadra di allenamento',
    ownerLabel: 'Coach',
    adminLabel: 'Coach',
    memberLabel: 'Atleta',
    memberLabelPlural: 'Atleti',
    description: 'Allenamenti strutturati con un programma definito',
  },
  running_club: {
    name: 'Running club',
    ownerLabel: 'Leader',
    adminLabel: 'Leader',
    memberLabel: 'Membro',
    memberLabelPlural: 'Membri',
    description: 'Club organizzato per uscite e gare di gruppo',
  },
  friends: {
    name: 'Gruppo di amici',
    ownerLabel: 'Admin',
    adminLabel: 'Admin',
    memberLabel: 'Membro',
    memberLabelPlural: 'Membri',
    description: 'Gruppo informale per correre insieme',
  },
}

// --- Strava (connessione account + feed attività crew private, SQL #29) ------
export interface StravaConnection {
  id: string
  user_id: string
  strava_athlete_id: number
  scope: string | null
  connected_at: string
}

export interface StravaActivity {
  id: string
  user_id: string
  user?: Profile
  strava_activity_id: number
  name: string | null
  distance_m: number | null
  moving_time_s: number | null
  elapsed_time_s: number | null
  total_elevation_gain_m: number | null
  activity_type: string | null   // 'Run' | 'TrailRun'
  start_date: string
  avg_pace_s_per_km: number | null
  avg_heartrate_bpm: number | null
  start_lat: number | null
  start_lng: number | null
  created_at: string
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
