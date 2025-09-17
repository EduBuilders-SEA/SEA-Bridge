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
  created_at timestamp with time zone default now(),
  label text
);

-- Enforce uniqueness of parent-teacher links
create unique index if not exists contacts_parent_teacher_uidx
  on public.contacts(parent_id, teacher_id);

-- Bind it as a named constraint (idempotent pattern)
do $$
begin
  alter table public.contacts
    add constraint contacts_unique_parent_teacher
    unique using index contacts_parent_teacher_uidx;
exception when duplicate_object then
  null;
end $$;

-- Create messages table - all communications between teacher and parent
create table messages (
  id uuid primary key default gen_random_uuid(),
  contact_link_id uuid not null references contacts(id),
  sender_id text not null references profiles(id),
  content text not null,
  message_type text default 'text'::text check (message_type = any (array['text'::text, 'voice'::text, 'image'::text, 'file'::text])),
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

-- Allow either side to delete their link (profile completeness enforced by restrictive policy below)
create policy "Parents can delete contacts where they are the parent"
  on contacts for delete
  using ( parent_id = auth.jwt() ->> 'sub' );

create policy "Teachers can delete contacts where they are the teacher"
  on contacts for delete
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

-- Add UPDATE policy for messages
CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.jwt() ->> 'sub')
  WITH CHECK (sender_id = auth.jwt() ->> 'sub');

-- Add DELETE policy for messages  
CREATE POLICY "Users can delete their own messages"
  ON messages FOR DELETE
  USING (sender_id = auth.jwt() ->> 'sub');

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

create policy "Users can view profiles of their contacts"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.contacts c
    where
      (c.parent_id = profiles.id and c.teacher_id = auth.jwt()->>'sub')
      or
      (c.teacher_id = profiles.id and c.parent_id = auth.jwt()->>'sub')
  )
);



create or replace function public.create_contact_by_phone(target_phone text, child_name text default null)
returns public.contacts
language plpgsql
security definer
set search_path = public
as $$
declare
  me_id   text := auth.jwt()->>'sub';
  me_role text;
  other_id text;
  inserted public.contacts%rowtype;
begin
  select role into me_role from public.profiles where id = me_id;
  if me_role is null then raise exception 'PROFILE_NOT_FOUND'; end if;

  if me_role = 'teacher' then
    if child_name is null or length(child_name)=0 then
      raise exception 'CHILD_NAME_REQUIRED';
    end if;

    select id into other_id
    from public.profiles
    where phone = target_phone and role = 'parent';

    if other_id is null then raise exception 'NO_TARGET'; end if;

    insert into public.contacts(parent_id, teacher_id, student_name, relationship)
    values (other_id, me_id, child_name, 'parent')
    on conflict (parent_id, teacher_id) do nothing
    returning * into inserted;

    if inserted is null then
      raise exception 'CONTACT_ALREADY_EXISTS';
    end if;

  else
    select id into other_id
    from public.profiles
    where phone = target_phone and role = 'teacher';

    if other_id is null then raise exception 'NO_TARGET'; end if;

    insert into public.contacts(parent_id, teacher_id, student_name, relationship)
    values (me_id, other_id, 'N/A', 'parent')
    on conflict (parent_id, teacher_id) do nothing
    returning * into inserted;

    if inserted is null then
      raise exception 'CONTACT_ALREADY_EXISTS';
    end if;
  end if;

  return inserted;
end;
$$;

grant execute on function public.create_contact_by_phone(text, text) to authenticated;

create or replace function public.delete_contact(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare me text := auth.jwt()->>'sub';
begin
  if not public.profile_is_complete() then
    raise exception 'PROFILE_INCOMPLETE';
  end if;

  delete from contacts
  where id = p_id
    and (parent_id = me or teacher_id = me);

  if not found then
    raise exception 'NOT_AUTHORIZED_OR_NOT_FOUND';
  end if;
end;
$$;

grant execute on function public.delete_contact(uuid) to authenticated;


-- STORAGE POLICIES

-- DELETE policy for chat-files bucket
-- ((bucket_id = 'chat-files'::text) AND (owner_id = (auth.jwt() ->> 'sub'::text)))
create policy "Users can delete their own files in chat-files bucket"
  on storage.objects for delete
  using (
    (bucket_id = 'chat-files'::text) AND (owner_id = (auth.jwt() ->> 'sub'::text))
  );

-- VIEW / DOWNLOAD policy for chat-files bucket
-- ((bucket_id = 'chat-files'::text) AND ((owner_id = (auth.jwt() ->> 'sub'::text)) OR (EXISTS ( SELECT 1
--    FROM (contacts c
--      JOIN messages m ON ((m.contact_link_id = c.id)))
--   WHERE ((m.file_url ~~ (('%'::text || objects.name) || '%'::text)) AND ((c.teacher_id = (auth.jwt() ->> 'sub'::text)) OR (c.parent_id = (auth.jwt() ->> 'sub'::text))))))))
create policy "Users can view/download their own files and files in their conversations in chat-files bucket"
  on storage.objects for select
  using (
    (bucket_id = 'chat-files'::text) AND ((owner_id = (auth.jwt() ->> 'sub'::text)) OR (EXISTS ( SELECT 1
       FROM (contacts c
         JOIN messages m ON ((m.contact_link_id = c.id)))
      WHERE ((m.file_url ~~ (('%'::text || objects.name) || '%'::text)) AND ((c.teacher_id = (auth.jwt() ->> 'sub'::text)) OR (c.parent_id = (auth.jwt() ->> 'sub'::text)))))))
  );

-- UPDATE policy for chat-files bucket
-- ((bucket_id = 'chat-files'::text) AND (owner_id = (auth.jwt() ->> 'sub'::text)))
create policy "Users can update their own files in chat-files bucket"
  on storage.objects for update
  using (
    (bucket_id = 'chat-files'::text) AND (owner_id = (auth.jwt() ->> 'sub'::text))
  );

-- UPLOAD policy for chat-files bucket
-- ((bucket_id = 'chat-files'::text) AND ((auth.jwt() ->> 'sub'::text) IS NOT NULL))
create policy "Users can upload files to chat-files bucket"
  on storage.objects for insert
  with check (
    (bucket_id = 'chat-files'::text) AND ((auth.jwt() ->> 'sub'::text) IS NOT NULL)
  );


-- Fix the translation_jobs table
DROP TABLE IF EXISTS translation_jobs CASCADE;

CREATE TABLE translation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  contact_link_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE, -- Added proper FK
  user_id TEXT NOT NULL, -- This should match auth.uid()::TEXT format
  
  -- AWS job details
  aws_job_id TEXT NOT NULL UNIQUE,
  job_name TEXT NOT NULL,
  
  -- Job configuration
  target_language TEXT NOT NULL,
  source_language TEXT DEFAULT 'auto',
  original_filename TEXT NOT NULL,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'SUBMITTED' 
    CHECK (status IN ('SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'STOPPED')),
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  
  -- Results
  translated_filename TEXT,
  download_url TEXT,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  estimated_completion_time TEXT,
  processing_time_ms INTEGER,
  word_count INTEGER,
  file_size_bytes INTEGER,
  user_notified BOOLEAN DEFAULT FALSE
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_translation_jobs_message_id ON translation_jobs(message_id);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_user_id ON translation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_status ON translation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_aws_job_id ON translation_jobs(aws_job_id);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_contact_link_id ON translation_jobs(contact_link_id);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_translation_jobs_user_status ON translation_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_message_lang ON translation_jobs(message_id, target_language);

-- Enable RLS
ALTER TABLE translation_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own translation jobs" ON translation_jobs;
DROP POLICY IF EXISTS "Users can create translation jobs" ON translation_jobs;
DROP POLICY IF EXISTS "Users can update own translation jobs" ON translation_jobs;
DROP POLICY IF EXISTS "Users can delete own translation jobs" ON translation_jobs;

-- -- Create consistent RLS policies using auth.jwt() ->> 'sub'
-- CREATE POLICY "Users can view own translation jobs"
--   ON translation_jobs FOR SELECT
--   USING (user_id = (auth.jwt() ->> 'sub'));

-- CREATE POLICY "Users can create translation jobs"
--   ON translation_jobs FOR INSERT
--   WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

-- CREATE POLICY "Users can update own translation jobs"
--   ON translation_jobs FOR UPDATE
--   USING (user_id = (auth.jwt() ->> 'sub'))
--   WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

-- -- Allow users to delete their own translation jobs
-- CREATE POLICY "Users can delete own translation jobs"
--   ON translation_jobs FOR DELETE
--   USING (user_id = (auth.jwt() ->> 'sub'));

-- -- Add restrictive policy to ensure profile completeness for translation jobs
-- CREATE POLICY "Require complete profile for translation jobs INSERT"
--   ON translation_jobs
--   AS RESTRICTIVE
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (public.profile_is_complete());

-- CREATE POLICY "Require complete profile for translation jobs UPDATE"
--   ON translation_jobs
--   AS RESTRICTIVE
--   FOR UPDATE
--   TO authenticated
--   USING (public.profile_is_complete())
--   WITH CHECK (public.profile_is_complete());

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_translation_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_translation_jobs_updated_at ON translation_jobs;
CREATE TRIGGER trigger_translation_jobs_updated_at
  BEFORE UPDATE ON translation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_translation_jobs_updated_at();

-- Add function to clean up old completed/failed jobs (optional)
CREATE OR REPLACE FUNCTION cleanup_old_translation_jobs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM translation_jobs 
  WHERE status IN ('COMPLETED', 'FAILED', 'STOPPED')
  AND updated_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_old_translation_jobs() TO authenticated;