-- Pocket Plus auto-confirm: bank SMS often has the payer's name in Arabic while the user types it in English.
-- Compare names by a rough sound "skeleton" (consonants only) that is the same in both scripts. Additive: new helper, updated functions.
create or replace function public.pocket_plus_skel(w text) returns text language plpgsql immutable set search_path = '' as $$
declare s text := lower(coalesce(w, ''));
begin
  s := regexp_replace(s, '^(ال|al|el)(?=..)', '');
  s := replace(replace(replace(replace(s, 'kh', 'k'), 'sh', 's'), 'th', 't'), 'gh', 'g');
  s := replace(s, 'ou', 'w');
  s := translate(s, 'بتثجحخدذرزسشصضطظعغفقكلمنهوي' || 'ةءأإآاىئؤ', 'btsghkdzrzsssdtzagfkklmnhwy' || '');
  s := translate(s, 'pqcjvx', 'bkkgfk');
  s := regexp_replace(s, '[aeiouwy]', '', 'g');
  s := regexp_replace(s, '(.)\1+', '\1', 'g');
  return s;
end $$;

create or replace function public.pocket_plus_names_match(a text, b text) returns boolean language plpgsql immutable set search_path = '' as $$
declare x text := public.pocket_plus_name(a); y text := public.pocket_plus_name(b); wa text[]; wb text[]; sa text[]; sb text[];
begin
  if x = '' or y = '' then return false; end if;
  wa := string_to_array(x, ' '); wb := string_to_array(y, ' ');
  if array_length(wa,1) > array_length(wb,1) then declare t text[] := wa; begin wa := wb; wb := t; end; end if;
  select array_agg(public.pocket_plus_skel(v)) into sa from unnest(wa) v;
  select array_agg(public.pocket_plus_skel(v)) into sb from unnest(wb) v;
  if length(coalesce(sa[1],'')) < 2 then return false; end if;
  return sa[1] = any(sb) and (array_length(sa,1) = 1 or (length(sa[array_length(sa,1)]) >= 1 and sa[array_length(sa,1)] = any(sb)));
end $$;

-- Let the SMS name patterns read Arabic names too (applied in place on pocket_plus_try_match).
do $$
declare d text;
begin
  d := pg_get_functiondef('public.pocket_plus_try_match'::regproc);
  d := replace(d, $q$substring(body from 'من\s+([A-Za-z][A-Za-z .''-]{1,60}?)\s+في\s')$q$, $q$substring(body from 'من\s+([A-Za-z؀-ۿ][A-Za-z؀-ۿ .''-]{1,60}?)\s+في\s')$q$);
  d := replace(d, $q$substring(body from 'المسجل باسم\s*([A-Za-z][A-Za-z .''-]{1,60}?)\s*(?:بنجاح|\.|$|\n|استخدم)')$q$, $q$substring(body from 'المسجل باسم\s*([A-Za-z؀-ۿ][A-Za-z؀-ۿ .''-]{1,60}?)\s*(?:بنجاح|\.|$|\n|استخدم)')$q$);
  execute d;
end $$;
