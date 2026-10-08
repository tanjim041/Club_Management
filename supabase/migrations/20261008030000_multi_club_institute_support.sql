-- Multi-club within institute support, storage policies, and index refinements.
--
-- Preserves all existing real records and RLS rules while enabling
-- multi-club isolation, storage bucket enforcement, and scoped dashboard queries.

begin;

-- 1. Ensure club-assets storage bucket exists
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'club-assets',
  'club-assets',
  true,
  10485760, -- 10MB limit
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

-- 2. Storage RLS Policies for club-assets
-- Public can read all uploaded assets
drop policy if exists "club_assets_public_select" on storage.objects;
create policy "club_assets_public_select"
  on storage.objects for select
  using (bucket_id = 'club-assets');

-- Organizers can only insert into their own club's folder: club-assets/{organization_id}/...
drop policy if exists "club_assets_organizer_insert" on storage.objects;
create policy "club_assets_organizer_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'club-assets'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.current_user_is_organizer(((storage.foldername(name))[1])::uuid)
  );

-- Organizers can only update files in their own club's folder
drop policy if exists "club_assets_organizer_update" on storage.objects;
create policy "club_assets_organizer_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'club-assets'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.current_user_is_organizer(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'club-assets'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.current_user_is_organizer(((storage.foldername(name))[1])::uuid)
  );

-- Organizers can only delete files in their own club's folder
drop policy if exists "club_assets_organizer_delete" on storage.objects;
create policy "club_assets_organizer_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'club-assets'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.current_user_is_organizer(((storage.foldername(name))[1])::uuid)
  );

-- 3. Composite Indexes for multi-club operations
create index if not exists organizations_institute_active_idx
  on public.organizations (institute_id, is_active, is_public_profile);

create index if not exists organization_memberships_user_role_idx
  on public.organization_memberships (user_id, role, is_active);

commit;
