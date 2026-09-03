create table if not exists rooms (
  id           serial primary key,
  room_no      text not null unique,
  location_id  integer not null,
  token        text not null,
  active       boolean not null default true,
  fetched_at   timestamptz
);

create table if not exists sessions (
  id         serial primary key,
  room_id    integer not null references rooms(id) on delete cascade,
  day        date not null,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  course     text,
  unique (room_id, starts_at)
);

create index if not exists sessions_room_day_idx on sessions (room_id, day);

create table if not exists refresh_runs (
  id     serial primary key,
  ran_at timestamptz not null default now(),
  ok     integer not null default 0,
  failed integer not null default 0,
  ms     integer not null default 0
);
