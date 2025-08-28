-- Create a table for public profiles
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  role text,
  phone text,

  constraint role_length check (char_length(role) >= 3)
);
-- Set up Row Level Security (RLS)
-- See https://supabase.com/docs/guides/auth/row-level-security
alter table profiles
  enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- This trigger automatically creates a profile for new users
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, phone, role)
  values (new.id, new.phone, new.raw_user_meta_data->>'role');
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Set up Storage!
insert into storage.buckets (id, name, public)
  values ('files', 'files', false);

-- Set up access controls for storage
create policy "files_owner_select" on storage.objects for select
  using (auth.uid() = owner);

create policy "files_owner_insert" on storage.objects for insert
  with check (auth.uid() = owner);
