create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text not null unique,
  password_hash text not null,
  country text not null,
  security_question_id integer not null,
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
