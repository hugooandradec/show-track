create table if not exists public.show_track_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  library_payload jsonb not null default '[]'::jsonb,
  custom_lists_payload jsonb not null default '[]'::jsonb,
  updated_at_client timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.show_track_user_data enable row level security;

create policy "show_track_select_own_data"
on public.show_track_user_data
for select
to authenticated
using (auth.uid() = user_id);

create policy "show_track_insert_own_data"
on public.show_track_user_data
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "show_track_update_own_data"
on public.show_track_user_data
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.set_show_track_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_show_track_user_data_updated_at on public.show_track_user_data;

create trigger set_show_track_user_data_updated_at
before update on public.show_track_user_data
for each row
execute function public.set_show_track_updated_at();
