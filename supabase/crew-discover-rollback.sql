-- Rollback di #51 (crew-discover.sql). CANCELLA le richieste "Avvisami" già raccolte.
-- Ripristina lo stato di #50: l'app e il sito che usano la lista ordinata tornano alla query semplice.
DROP FUNCTION IF EXISTS public.crews_discover(text, text, integer);
DROP FUNCTION IF EXISTS public.crew_interest_count(uuid);
DROP TABLE    IF EXISTS public.crew_interests;
