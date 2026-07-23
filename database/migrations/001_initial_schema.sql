-- Initial PeakFlix PostgreSQL schema.
-- Later migrations upgrade this base without deleting user data.

begin;

create extension if not exists pgcrypto;

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
on conflict (id) do update
set question = excluded.question, is_active = true;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text not null unique,
  password_hash text not null,
  country text not null,
  security_question_id integer not null references security_questions(id),
  security_answer_hash text not null,
  language text default 'en',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  movie_id text not null,
  season_number integer,
  episode_number integer,
  progress_seconds integer default 0,
  duration_seconds integer default 0,
  last_watched_at timestamptz default now()
);

create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  movie_id text not null,
  created_at timestamptz default now(),
  unique (user_id, movie_id)
);

create table if not exists movie_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists movie_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references movie_lists(id) on delete cascade,
  movie_id text not null,
  created_at timestamptz default now(),
  unique (list_id, movie_id)
);

create table if not exists search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  search_text text not null,
  created_at timestamptz default now()
);

commit;
