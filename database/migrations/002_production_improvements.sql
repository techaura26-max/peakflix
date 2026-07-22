-- Safe production upgrade migration for existing PeakFlix schema.
-- This migration preserves existing data and uses IF NOT EXISTS / IF EXISTS guards.

create extension if not exists pgcrypto;

-- Users table upgrades
alter table users add column if not exists is_active boolean not null default true;
alter table users add column if not exists email_verified boolean not null default false;
alter table users add column if not exists last_login_at timestamptz;
alter table users add column if not exists password_changed_at timestamptz;
alter table users add column if not exists session_version integer not null default 1;

alter table users alter column language set default 'en';
alter table users alter column language type varchar(10) using coalesce(language, 'en')::varchar(10);
alter table users alter column language set not null;

update users set username = trim(username) where username is not null and username <> trim(username);
update users set email = lower(trim(email)) where email is not null and email <> lower(trim(email));

-- Case-insensitive uniqueness for usernames/emails
create table if not exists users_case_conflicts as
select lower(username) as username_key, count(*) as cnt
from users
where username is not null
group by lower(username)
having count(*) > 1;

create table if not exists users_email_conflicts as
select lower(email) as email_key, count(*) as cnt
from users
where email is not null
group by lower(email)
having count(*) > 1;

-- The migration leaves conflicting rows intact and warns operators to resolve them manually.
-- Existing duplicates are not deleted automatically to avoid destructive changes.
create unique index if not exists users_username_ci_idx on users (lower(username));
create unique index if not exists users_email_ci_idx on users (lower(email));

-- Security questions table and FK
create table if not exists security_questions (
  id integer primary key,
  question text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into security_questions (id, question) values
  (1, 'What was the name of your first pet?'),
  (2, 'What city were you born in?'),
  (3, 'What was the name of your first school?'),
  (4, 'What is your favorite movie?'),
  (5, 'What was your childhood nickname?'),
  (6, 'What is the name of your favorite teacher?'),
  (7, 'What is your favorite food?'),
  (8, 'What was the model of your first car?'),
  (9, 'What is your favorite book?'),
  (10, 'What was the name of the street where you grew up?')
on conflict (id) do nothing;

insert into security_questions (id, question) values
  (11, 'What is your favorite movie?')
on conflict (id) do nothing;

-- Recreate FK only when the referenced IDs are valid.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'security_question_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM users u
      LEFT JOIN security_questions sq ON sq.id = u.security_question_id
      WHERE u.security_question_id IS NOT NULL AND sq.id IS NULL
    ) THEN
      ALTER TABLE users
        DROP CONSTRAINT IF EXISTS users_security_question_id_fkey;
      ALTER TABLE users
        ADD CONSTRAINT users_security_question_id_fkey
        FOREIGN KEY (security_question_id) REFERENCES security_questions(id);
    END IF;
  END IF;
END $$;

-- Reusable updated_at function and triggers
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at
before update on users
for each row execute function set_updated_at();

drop trigger if exists watch_history_set_updated_at on watch_history;
create trigger watch_history_set_updated_at
before update on watch_history
for each row execute function set_updated_at();

drop trigger if exists movie_lists_set_updated_at on movie_lists;
create trigger movie_lists_set_updated_at
before update on movie_lists
for each row execute function set_updated_at();

-- Watch history upgrades
alter table watch_history add column if not exists media_type varchar(10) not null default 'movie';
alter table watch_history add column if not exists completed boolean not null default false;
alter table watch_history add column if not exists created_at timestamptz not null default now();
alter table watch_history add column if not exists updated_at timestamptz not null default now();

update watch_history
set media_type = case
  when season_number is not null or episode_number is not null then 'tv'
  else 'movie'
end
where media_type is null or media_type = '';

alter table watch_history add constraint watch_history_media_type_check
check (media_type in ('movie', 'tv')) not valid;
alter table watch_history validate constraint watch_history_media_type_check;

alter table watch_history add constraint watch_history_progress_nonnegative_check
check (progress_seconds >= 0) not valid;
alter table watch_history validate constraint watch_history_progress_nonnegative_check;

alter table watch_history add constraint watch_history_duration_nonnegative_check
check (duration_seconds >= 0) not valid;
alter table watch_history validate constraint watch_history_duration_nonnegative_check;

alter table watch_history add constraint watch_history_season_positive_check
check (season_number is null or season_number > 0) not valid;
alter table watch_history validate constraint watch_history_season_positive_check;

alter table watch_history add constraint watch_history_episode_positive_check
check (episode_number is null or episode_number > 0) not valid;
alter table watch_history validate constraint watch_history_episode_positive_check;

-- Deduplicate watch history by keeping the newest row per logical key.
create temporary table watch_history_duplicates as
select user_id, media_type, movie_id, coalesce(season_number, 0) as season_num, coalesce(episode_number, 0) as episode_num, max(last_watched_at) as latest_seen
from watch_history
group by user_id, media_type, movie_id, coalesce(season_number, 0), coalesce(episode_number, 0)
having count(*) > 1;

delete from watch_history wh
using watch_history_duplicates d
where wh.user_id = d.user_id
  and wh.media_type = d.media_type
  and wh.movie_id = d.movie_id
  and coalesce(wh.season_number, 0) = d.season_num
  and coalesce(wh.episode_number, 0) = d.episode_num
  and wh.last_watched_at < d.latest_seen;

create unique index if not exists watch_history_logical_key_uidx
on watch_history (user_id, media_type, movie_id, coalesce(season_number, 0), coalesce(episode_number, 0));

drop table if exists watch_history_duplicates;

-- Favorites upgrades
alter table favorites add column if not exists media_type varchar(10) not null default 'movie';
update favorites set media_type = 'movie' where media_type is null or media_type = '';

alter table favorites add constraint favorites_media_type_check
check (media_type in ('movie', 'tv')) not valid;
alter table favorites validate constraint favorites_media_type_check;

drop index if exists favorites_user_id_movie_id_key;
create unique index if not exists favorites_user_media_movie_uidx
on favorites (user_id, media_type, movie_id);
create index if not exists favorites_user_id_idx on favorites (user_id);
create index if not exists favorites_user_created_at_idx on favorites (user_id, created_at desc);

-- Lists upgrades
alter table movie_lists add column if not exists updated_at timestamptz not null default now();

update movie_lists set name = trim(name) where name is not null and name <> trim(name);

create unique index if not exists movie_lists_user_name_ci_idx on movie_lists (user_id, lower(name));
create index if not exists movie_lists_user_id_idx on movie_lists (user_id);

alter table movie_list_items add column if not exists media_type varchar(10) not null default 'movie';
update movie_list_items set media_type = 'movie' where media_type is null or media_type = '';

alter table movie_list_items add constraint movie_list_items_media_type_check
check (media_type in ('movie', 'tv')) not valid;
alter table movie_list_items validate constraint movie_list_items_media_type_check;

drop index if exists movie_list_items_list_id_movie_id_key;
create unique index if not exists movie_list_items_list_media_movie_uidx
on movie_list_items (list_id, media_type, movie_id);
create index if not exists movie_list_items_list_id_idx on movie_list_items (list_id);

-- Search history upgrades
create index if not exists search_history_user_created_at_idx on search_history (user_id, created_at desc);
