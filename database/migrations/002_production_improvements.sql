-- Safe production upgrade migration for existing PeakFlix schema.
-- This migration preserves existing data and uses safe, rerunnable operations.

begin;

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

-- Detect case-insensitive conflicts before creating unique indexes.
do $$
declare
  username_conflicts text;
  email_conflicts text;
begin
  select string_agg(format('%s (%s)', lower(trim(username)), cnt), ', ')
    into username_conflicts
  from (
    select lower(trim(username)) as normalized_username, count(*) as cnt
    from users
    where username is not null
    group by lower(trim(username))
    having count(*) > 1
  ) q;

  if username_conflicts is not null then
    raise exception 'Cannot create case-insensitive username uniqueness because duplicate usernames exist: %', username_conflicts;
  end if;

  select string_agg(format('%s (%s)', lower(trim(email)), cnt), ', ')
    into email_conflicts
  from (
    select lower(trim(email)) as normalized_email, count(*) as cnt
    from users
    where email is not null
    group by lower(trim(email))
    having count(*) > 1
  ) q;

  if email_conflicts is not null then
    raise exception 'Cannot create case-insensitive email uniqueness because duplicate emails exist: %', email_conflicts;
  end if;
end $$;

create unique index if not exists users_username_ci_idx on users (lower(trim(username)));
create unique index if not exists users_email_ci_idx on users (lower(trim(email)));

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

do $$
begin
  if not exists (
    select 1 from information_schema.columns where table_name = 'users' and column_name = 'security_question_id'
  ) then
    return;
  end if;

  if exists (
    select 1
    from users u
    left join security_questions sq on sq.id = u.security_question_id
    where u.security_question_id is not null and sq.id is null
  ) then
    raise notice 'Skipping foreign key creation because some users reference unknown security_question_id values.';
    return;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'users_security_question_id_fkey'
  ) then
    alter table users
      add constraint users_security_question_id_fkey
      foreign key (security_question_id) references security_questions(id);
  end if;
end $$;

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
end;

-- Constraint creation is rerunnable via pg_constraint checks.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'watch_history_media_type_check') then
    alter table watch_history add constraint watch_history_media_type_check
      check (media_type in ('movie', 'tv'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'watch_history_progress_nonnegative_check') then
    alter table watch_history add constraint watch_history_progress_nonnegative_check
      check (progress_seconds >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'watch_history_duration_nonnegative_check') then
    alter table watch_history add constraint watch_history_duration_nonnegative_check
      check (duration_seconds >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'watch_history_season_positive_check') then
    alter table watch_history add constraint watch_history_season_positive_check
      check (season_number is null or season_number > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'watch_history_episode_positive_check') then
    alter table watch_history add constraint watch_history_episode_positive_check
      check (episode_number is null or episode_number > 0);
  end if;
end $$;

-- Deduplicate watch history by keeping the newest and most advanced row.
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, media_type, movie_id, coalesce(season_number, 0), coalesce(episode_number, 0)
      order by last_watched_at desc, progress_seconds desc, updated_at desc, id desc
    ) as rn
  from watch_history
)
delete from watch_history
where id in (select id from ranked where rn > 1);

create unique index if not exists watch_history_logical_key_uidx
on watch_history (user_id, media_type, movie_id, coalesce(season_number, 0), coalesce(episode_number, 0));

-- Favorites upgrades
alter table favorites add column if not exists media_type varchar(10) not null default 'movie';
update favorites set media_type = 'movie' where media_type is null or media_type = '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'favorites_user_id_movie_id_key') then
    -- no-op when the old constraint is already gone
    null;
  end if;
end $$;

alter table favorites drop constraint if exists favorites_user_id_movie_id_key;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'favorites_media_type_check') then
    alter table favorites add constraint favorites_media_type_check
      check (media_type in ('movie', 'tv'));
  end if;
end $$;

create unique index if not exists favorites_user_media_movie_uidx on favorites (user_id, media_type, movie_id);
create index if not exists favorites_user_id_idx on favorites (user_id);
create index if not exists favorites_user_created_at_idx on favorites (user_id, created_at desc);

-- Lists upgrades
alter table movie_lists add column if not exists updated_at timestamptz not null default now();

-- Detect case-insensitive duplicate list names before creating a unique index.
do $$
declare
  duplicate_lists text;
begin
  select string_agg(format('%s (%s)', lower(trim(name)), cnt), ', ')
    into duplicate_lists
  from (
    select user_id, lower(trim(name)) as normalized_name, count(*) as cnt
    from movie_lists
    where name is not null
    group by user_id, lower(trim(name))
    having count(*) > 1
  ) q;

  if duplicate_lists is not null then
    raise exception 'Cannot create case-insensitive list name uniqueness because duplicate list names exist: %', duplicate_lists;
  end if;
end $$;

create unique index if not exists movie_lists_user_name_ci_idx on movie_lists (user_id, lower(trim(name)));
create index if not exists movie_lists_user_id_idx on movie_lists (user_id);

alter table movie_list_items add column if not exists media_type varchar(10) not null default 'movie';
update movie_list_items set media_type = 'movie' where media_type is null or media_type = '';

alter table movie_list_items drop constraint if exists movie_list_items_list_id_movie_id_key;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'movie_list_items_media_type_check') then
    alter table movie_list_items add constraint movie_list_items_media_type_check
      check (media_type in ('movie', 'tv'));
  end if;
end $$;

create unique index if not exists movie_list_items_list_media_movie_uidx on movie_list_items (list_id, media_type, movie_id);
create index if not exists movie_list_items_list_id_idx on movie_list_items (list_id);

-- Additional indexes
create index if not exists watch_history_user_id_idx on watch_history (user_id);
create index if not exists watch_history_user_last_watched_idx on watch_history (user_id, last_watched_at desc);
create index if not exists search_history_user_created_at_idx on search_history (user_id, created_at desc);

commit;
