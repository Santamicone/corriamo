-- ============================================================================
-- #48 — Nome del profilo per gli account creati con Google / Facebook
-- ============================================================================
-- handle_new_user() leggeva solo raw_user_meta_data->>'full_name'. Il form di
-- registrazione con email lo valorizza, ma i provider OAuth no (o non sempre):
-- Google manda 'full_name' + 'name', Facebook manda 'name'. Senza questa
-- modifica, chi si registra con Facebook finirebbe con il nome "Nuovo runner".
--
-- Cambia SOLO come viene scelto full_name (full_name → name → 'Nuovo runner').
-- Il resto della funzione è identico a trigger-new-user.sql: città vuota, livello
-- 'tutti' e gli altri campi nulli, che l'utente completa dal profilo (banner
-- "profilo incompleto").
--
-- Non si usa la parte locale dell'email come ripiego: il nome è pubblico.
-- Non si importa la foto del provider: l'avatar resta una scelta dell'utente.
--
-- Sicuro da rieseguire (create or replace). Il trigger on_auth_user_created non
-- viene toccato. Rollback: oauth-profile-name-rollback.sql
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    full_name,
    city,
    level,
    pace_min,
    pace_max,
    bio,
    strava_url,
    garmin_url,
    instagram_url
  ) values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data->>'name'), ''),
      'Nuovo runner'
    ),
    nullif(new.raw_user_meta_data->>'city', ''),
    coalesce(new.raw_user_meta_data->>'level', 'tutti'),
    case when new.raw_user_meta_data->>'pace_min' != '' then (new.raw_user_meta_data->>'pace_min')::numeric else null end,
    case when new.raw_user_meta_data->>'pace_max' != '' then (new.raw_user_meta_data->>'pace_max')::numeric else null end,
    nullif(new.raw_user_meta_data->>'bio', ''),
    nullif(new.raw_user_meta_data->>'strava_url', ''),
    nullif(new.raw_user_meta_data->>'garmin_url', ''),
    nullif(new.raw_user_meta_data->>'instagram_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Verifica (sola lettura): la definizione ora contiene 'name'
-- select pg_get_functiondef('public.handle_new_user'::regproc);
