-- Production integrity, privacy, and query-safety improvements.

begin;

-- Keep the full question set available even when upgrading an older database.
insert into security_questions (id, question, is_active) values
  (1, 'What was the name of your first pet?', true),
  (2, 'What city were you born in?', true),
  (3, 'What was the name of your first school?', true),
  (4, 'What is your favorite movie?', true),
  (5, 'What was your childhood nickname?', true),
  (6, 'What is the name of your favorite teacher?', true),
  (7, 'What is your favorite food?', true),
  (8, 'What was the model of your first car?', true),
  (9, 'What is your favorite book?', true),
  (10, 'What was the name of the street where you grew up?', true)
on conflict (id) do update
set question = excluded.question, is_active = excluded.is_active;

-- Existing rows receive safe timestamp values before NOT NULL is enforced.
update users set created_at = now() where created_at is null;
update users set updated_at = coalesce(created_at, now()) where updated_at is null;
update watch_history set progress_seconds = 0 where progress_seconds is null;
update watch_history set duration_seconds = 0 where duration_seconds is null;
update watch_history set last_watched_at = now() where last_watched_at is null;
update favorites set created_at = now() where created_at is null;
update movie_lists set created_at = now() where created_at is null;
update movie_list_items set created_at = now() where created_at is null;
update search_history set created_at = now() where created_at is null;

alter table users alter column created_at set not null;
alter table users alter column updated_at set not null;
alter table watch_history alter column progress_seconds set not null;
alter table watch_history alter column duration_seconds set not null;
alter table watch_history alter column last_watched_at set not null;
alter table favorites alter column created_at set not null;
alter table movie_lists alter column created_at set not null;
alter table movie_list_items alter column created_at set not null;
alter table search_history alter column created_at set not null;

alter table search_history add column if not exists last_searched_at timestamptz;
update search_history set last_searched_at = created_at where last_searched_at is null;
alter table search_history alter column last_searched_at set default now();
alter table search_history alter column last_searched_at set not null;

-- Keep the newest copy of each case-insensitive search before adding uniqueness.
with ranked as (
  select id, row_number() over (
    partition by user_id, lower(trim(search_text))
    order by last_searched_at desc, created_at desc, id desc
  ) as row_number
  from search_history
)
delete from search_history where id in (select id from ranked where row_number > 1);

create unique index if not exists search_history_user_text_ci_uidx
on search_history (user_id, lower(search_text));
create index if not exists search_history_user_recent_idx
on search_history (user_id, last_searched_at desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_username_length_check') then
    alter table users add constraint users_username_length_check
      check (char_length(trim(username)) between 3 and 30);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'users_email_length_check') then
    alter table users add constraint users_email_length_check
      check (char_length(trim(email)) between 5 and 254);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'users_country_length_check') then
    alter table users add constraint users_country_length_check
      check (char_length(trim(country)) between 2 and 80);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'users_language_check') then
    alter table users add constraint users_language_check
      check (language in ('en', 'ar', 'es', 'ja', 'it', 'de', 'fr'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'users_session_version_positive_check') then
    alter table users add constraint users_session_version_positive_check
      check (session_version > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'watch_history_movie_id_check') then
    alter table watch_history add constraint watch_history_movie_id_check
      check (char_length(trim(movie_id)) between 1 and 64);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'watch_history_progress_duration_check') then
    alter table watch_history add constraint watch_history_progress_duration_check
      check (duration_seconds = 0 or progress_seconds <= duration_seconds);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'favorites_movie_id_check') then
    alter table favorites add constraint favorites_movie_id_check
      check (char_length(trim(movie_id)) between 1 and 64);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'movie_lists_name_length_check') then
    alter table movie_lists add constraint movie_lists_name_length_check
      check (char_length(trim(name)) between 1 and 60);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'movie_list_items_movie_id_check') then
    alter table movie_list_items add constraint movie_list_items_movie_id_check
      check (char_length(trim(movie_id)) between 1 and 64);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'search_history_text_length_check') then
    alter table search_history add constraint search_history_text_length_check
      check (char_length(trim(search_text)) between 1 and 200);
  end if;
end $$;

create index if not exists movie_lists_user_created_at_idx
on movie_lists (user_id, created_at desc);
create index if not exists movie_list_items_list_created_at_idx
on movie_list_items (list_id, created_at desc);

-- Supabase exposes the public schema through its Data API. PeakFlix uses only
-- the Express backend, so browser roles must not query these tables directly.
alter table users enable row level security;
alter table security_questions enable row level security;
alter table watch_history enable row level security;
alter table favorites enable row level security;
alter table movie_lists enable row level security;
alter table movie_list_items enable row level security;
alter table search_history enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on users, security_questions, watch_history, favorites, movie_lists, movie_list_items, search_history from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on users, security_questions, watch_history, favorites, movie_lists, movie_list_items, search_history from authenticated;
  end if;
end $$;

commit;
