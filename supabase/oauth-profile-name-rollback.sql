-- Rollback di oauth-profile-name.sql (#48): ripristina handle_new_user() com'era
-- in trigger-new-user.sql (full_name oppure 'Nuovo runner').
-- I profili già creati con il nome preso dal provider restano com'sono.

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
    coalesce(new.raw_user_meta_data->>'full_name', 'Nuovo runner'),
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
