-- ================================
-- SEA-Bridge Database Schema
-- Parent-Teacher Communication Platform
-- ================================

-- Create a table for user profiles
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,  -- Firebase UID (no foreign key needed)
  role TEXT NOT NULL CHECK (role IN ('teacher', 'parent')),
  name TEXT,
  phone TEXT UNIQUE NOT NULL,
  preferred_language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contacts table - links teachers and parents through students
create table contacts (
  id uuid primary key default gen_random_uuid(),
  parent_id text not null references profiles(id),
  teacher_id text not null references profiles(id),
  student_name text not null,
  relationship text not null,
  created_at timestamp with time zone default now()
);

-- Create messages table - all communications between teacher and parent
create table messages (
  id uuid primary key default gen_random_uuid(),
  contact_link_id uuid not null references contacts(id),
  sender_id text not null references profiles(id),
  content text not null,
  message_type text default 'text'::text check (message_type = any (array['text'::text, 'voice'::text, 'image'::text])),
  file_url text,
  variants jsonb default '{}'::jsonb,
  sent_at timestamp with time zone default now()
);

-- Create attendance table - teachers track student attendance
create table attendance (
  id uuid primary key default gen_random_uuid(),
  contact_link_id uuid not null references contacts(id),
  date date not null,
  status text not null check (status = any (array['present'::text, 'absent'::text, 'late'::text, 'excused'::text])),
  notes text,
  recorded_by text not null references profiles(id),
  created_at timestamp with time zone default now()
);

-- ================================
-- ROW LEVEL SECURITY POLICIES
-- ================================

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table contacts enable row level security;
alter table messages enable row level security;
alter table attendance enable row level security;

-- PROFILES POLICIES
create policy "Users can view their own profile"
  on profiles for select
  using ( auth.jwt() ->> 'sub' = id );

create policy "Users can insert their own profile"
  on profiles for insert
  with check ( auth.jwt() ->> 'sub' = id );

create policy "Users can update their own profile"
  on profiles for update
  using ( auth.jwt() ->> 'sub' = id );

-- CONTACTS POLICIES  
create policy "Parents can view contacts where they are the parent"
  on contacts for select
  using ( parent_id = auth.jwt() ->> 'sub' );

create policy "Teachers can view contacts where they are the teacher"
  on contacts for select
  using ( teacher_id = auth.jwt() ->> 'sub' );

create policy "Parents can create contacts where they are the parent"
  on contacts for insert
  with check ( parent_id = auth.jwt() ->> 'sub' );

create policy "Teachers can create contacts where they are the teacher"
  on contacts for insert
  with check ( teacher_id = auth.jwt() ->> 'sub' );

create policy "Parents can update contacts where they are the parent"
  on contacts for update
  using ( parent_id = auth.jwt() ->> 'sub' );

create policy "Teachers can update contacts where they are the teacher"
  on contacts for update
  using ( teacher_id = auth.jwt() ->> 'sub' );

-- MESSAGES POLICIES
create policy "Users can view messages in their conversations"
  on messages for select
  using ( 
    exists (
      select 1 from contacts 
      where contacts.id = messages.contact_link_id 
      and (contacts.parent_id = auth.jwt() ->> 'sub' or contacts.teacher_id = auth.jwt() ->> 'sub')
    )
  );

create policy "Users can send messages in their conversations"
  on messages for insert
  with check ( 
    sender_id = auth.jwt() ->> 'sub' and
    exists (
      select 1 from contacts 
      where contacts.id = messages.contact_link_id 
      and (contacts.parent_id = auth.jwt() ->> 'sub' or contacts.teacher_id = auth.jwt() ->> 'sub')
    )
  );

-- ATTENDANCE POLICIES
create policy "Teachers can view attendance for their students"
  on attendance for select
  using ( 
    exists (
      select 1 from contacts 
      where contacts.id = attendance.contact_link_id 
      and contacts.teacher_id = auth.jwt() ->> 'sub'
    )
  );

create policy "Parents can view attendance for their children"
  on attendance for select
  using ( 
    exists (
      select 1 from contacts 
      where contacts.id = attendance.contact_link_id 
      and contacts.parent_id = auth.jwt() ->> 'sub'
    )
  );

create policy "Teachers can create attendance records for their students"
  on attendance for insert
  with check ( 
    recorded_by = auth.jwt() ->> 'sub' and
    exists (
      select 1 from contacts 
      where contacts.id = attendance.contact_link_id 
      and contacts.teacher_id = auth.jwt() ->> 'sub'
    )
  );

create policy "Teachers can update attendance records they created"
  on attendance for update
  using ( 
    recorded_by = auth.jwt() ->> 'sub' and
    exists (
      select 1 from contacts 
      where contacts.id = attendance.contact_link_id 
      and contacts.teacher_id = auth.jwt() ->> 'sub'
    )
  );

-- =================================
-- PROFILE COMPLETENESS ENFORCEMENT
-- Writes require profile.name to be set
-- =================================

-- Helper function: check if current user's profile has a non-null name
create or replace function public.profile_is_complete()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.jwt()->>'sub'
      and p.name is not null
  );
$$;

-- Gate writes on messages
create policy "Require complete profile for messages INSERT"
  on public.messages
  as restrictive
  for insert
  to authenticated
  with check (public.profile_is_complete());

create policy "Require complete profile for messages UPDATE"
  on public.messages
  as restrictive
  for update
  to authenticated
  using (public.profile_is_complete())
  with check (public.profile_is_complete());

create policy "Require complete profile for messages DELETE"
  on public.messages
  as restrictive
  for delete
  to authenticated
  using (public.profile_is_complete());

-- Gate writes on contacts
create policy "Require complete profile for contacts INSERT"
  on public.contacts
  as restrictive
  for insert
  to authenticated
  with check (public.profile_is_complete());

create policy "Require complete profile for contacts UPDATE"
  on public.contacts
  as restrictive
  for update
  to authenticated
  using (public.profile_is_complete())
  with check (public.profile_is_complete());

create policy "Require complete profile for contacts DELETE"
  on public.contacts
  as restrictive
  for delete
  to authenticated
  using (public.profile_is_complete());

-- Gate writes on attendance
create policy "Require complete profile for attendance INSERT"
  on public.attendance
  as restrictive
  for insert
  to authenticated
  with check (public.profile_is_complete());

create policy "Require complete profile for attendance UPDATE"
  on public.attendance
  as restrictive
  for update
  to authenticated
  using (public.profile_is_complete())
  with check (public.profile_is_complete());

create policy "Require complete profile for attendance DELETE"
  on public.attendance
  as restrictive
  for delete
  to authenticated
  using (public.profile_is_complete());
