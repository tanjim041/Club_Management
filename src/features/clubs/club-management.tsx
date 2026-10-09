import { useState, useRef } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'
import {
  Archive,
  CheckCircle2,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { getSupabaseClient } from '../../supabase/client'
import type { ClubOrganization } from '../dashboard/dashboard-api'

const optionalUrl = z.union([z.literal(''), z.string().url().startsWith('https://')])

const profileSchema = z.object({
  tagline: z.string().trim().max(240),
  category: z.string().trim().max(100),
  description: z.string().trim().max(5000),
  coverImageUrl: optionalUrl,
  logoUrl: optionalUrl,
  websiteUrl: optionalUrl,
  facebookUrl: z.union([
    z.literal(''),
    z.string().url().startsWith('https://').refine((value) => {
      const host = new URL(value).hostname.toLowerCase()
      return ['facebook.com', 'www.facebook.com', 'fb.com', 'www.fb.com'].includes(host)
    }, 'Use a Facebook or fb.com URL.'),
  ]),
  isPublicProfile: z.boolean(),
})

type ProfileForm = z.infer<typeof profileSchema>

/**
 * Uploads an image file to the scoped `club-assets` bucket under `clubId/` path.
 * Enforces the Supabase Storage RLS policy checking organizer privileges for `clubId`.
 */
async function uploadClubAsset(clubId: string, file: File, prefix = 'asset'): Promise<string> {
  const supabase = getSupabaseClient()
  const cleanExt = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const filePath = `${clubId}/${prefix}-${Date.now()}-${randomSuffix}.${cleanExt}`

  const { error: uploadError } = await supabase.storage.from('club-assets').upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  const { data: publicUrlData } = supabase.storage.from('club-assets').getPublicUrl(filePath)
  return publicUrlData.publicUrl
}

export function ClubProfileEditor({ club }: { club: ClubOrganization }) {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      tagline: club.tagline || '',
      category: club.category ?? '',
      description: club.description || '',
      coverImageUrl: club.cover_image_url ?? '',
      logoUrl: club.logo_url ?? '',
      websiteUrl: club.website_url ?? '',
      facebookUrl: club.facebook_url ?? '',
      isPublicProfile: club.is_public_profile,
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: ProfileForm) => {
      const { data, error } = await getSupabaseClient()
        .from('organizations')
        .update({
          tagline: values.tagline,
          category: values.category || null,
          description: values.description,
          cover_image_url: values.coverImageUrl || null,
          logo_url: values.logoUrl || null,
          website_url: values.websiteUrl || null,
          facebook_url: values.facebookUrl || null,
          is_public_profile: values.isPublicProfile,
        })
        .eq('id', club.id)
        .select('id')
        .single()
      if (error || !data) throw new Error(error?.message || 'Could not save this club profile.')
    },
    onSuccess: async () => {
      setSaved(true)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organizer', 'clubs'] }),
        queryClient.invalidateQueries({ queryKey: ['landing', 'clubs'] }),
        queryClient.invalidateQueries({ queryKey: ['club'] }),
        queryClient.invalidateQueries({ queryKey: ['public-directory'] }),
      ])
    },
  })

  const quickTogglePublish = useMutation({
    mutationFn: async (newStatus: boolean) => {
      const { error } = await getSupabaseClient()
        .from('organizations')
        .update({ is_public_profile: newStatus })
        .eq('id', club.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async (_, newStatus) => {
      form.setValue('isPublicProfile', newStatus)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organizer', 'clubs'] }),
        queryClient.invalidateQueries({ queryKey: ['landing', 'clubs'] }),
        queryClient.invalidateQueries({ queryKey: ['club'] }),
      ])
    },
  })

  const handleFileUpload = async (field: 'coverImageUrl' | 'logoUrl', file: File) => {
    try {
      setUploadingField(field)
      const url = await uploadClubAsset(club.id, file, field === 'coverImageUrl' ? 'banner' : 'logo')
      form.setValue(field, url, { shouldValidate: true, shouldDirty: true })
    } catch (err) {
      form.setError(field, { message: err instanceof Error ? err.message : 'Upload failed' })
    } finally {
      setUploadingField(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile Status Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                club.is_public_profile
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
              }`}
            >
              {club.is_public_profile ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {club.is_public_profile ? 'Public Profile Published' : 'Profile Archived / Private'}
            </span>
          </div>
          <h3 className="font-heading mt-2 text-lg font-bold text-[var(--color-text-primary)]">{club.name} Profile Settings</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Manage branding, activity category, contact URLs, and publication status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={quickTogglePublish.isPending}
            onClick={() => quickTogglePublish.mutate(!club.is_public_profile)}
          >
            {club.is_public_profile ? (
              <>
                <Archive className="mr-1.5 h-3.5 w-3.5 text-amber-300" /> Archive Profile
              </>
            ) : (
              <>
                <Eye className="mr-1.5 h-3.5 w-3.5 text-emerald-300" /> Publish Profile
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Profile Form */}
      <form
        onSubmit={form.handleSubmit((values) => {
          setSaved(false)
          mutation.mutate(values)
        })}
        className="space-y-5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Tagline" registration={form.register('tagline')} error={form.formState.errors.tagline?.message} />
          <TextField label="Category" registration={form.register('category')} error={form.formState.errors.category?.message} />

          {/* Cover / Banner image URL + Upload */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--color-text-primary)]">Banner / Cover Image</label>
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingField === 'coverImageUrl'}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
              >
                <Upload className="h-3 w-3" />
                {uploadingField === 'coverImageUrl' ? 'Uploading…' : 'Upload to Storage'}
              </button>
            </div>
            <input
              type="file"
              ref={coverInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleFileUpload('coverImageUrl', f)
              }}
            />
            <input
              type="text"
              placeholder="https://..."
              {...form.register('coverImageUrl')}
              className={fieldClassName}
            />
            {form.formState.errors.coverImageUrl && (
              <span className="mt-1 block text-xs text-rose-300">{form.formState.errors.coverImageUrl.message}</span>
            )}
          </div>

          {/* Logo URL + Upload */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--color-text-primary)]">Logo Image</label>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingField === 'logoUrl'}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
              >
                <Upload className="h-3 w-3" />
                {uploadingField === 'logoUrl' ? 'Uploading…' : 'Upload to Storage'}
              </button>
            </div>
            <input
              type="file"
              ref={logoInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleFileUpload('logoUrl', f)
              }}
            />
            <input
              type="text"
              placeholder="https://..."
              {...form.register('logoUrl')}
              className={fieldClassName}
            />
            {form.formState.errors.logoUrl && (
              <span className="mt-1 block text-xs text-rose-300">{form.formState.errors.logoUrl.message}</span>
            )}
          </div>

          <TextField label="Website URL" registration={form.register('websiteUrl')} error={form.formState.errors.websiteUrl?.message} />
          <TextField
            label="Facebook URL (leave blank if unavailable)"
            registration={form.register('facebookUrl')}
            error={form.formState.errors.facebookUrl?.message}
          />

          <label className="sm:col-span-2 block text-xs font-semibold text-[var(--color-text-primary)]">
            Description & Mission
            <textarea {...form.register('description')} rows={5} className={fieldClassName} />
            {form.formState.errors.description && (
              <span className="mt-1 block text-rose-300">{form.formState.errors.description.message}</span>
            )}
          </label>
        </div>

        <Controller
          name="isPublicProfile"
          control={form.control}
          render={({ field }) => (
            <label className="flex items-center gap-3 text-xs text-[var(--color-text-body)] cursor-pointer">
              <input
                type="checkbox"
                checked={field.value}
                onChange={field.onChange}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              Publish this club profile to the public campus directory
            </label>
          )}
        />

        {mutation.isError && (
          <p role="alert" className="text-xs text-rose-300">
            {mutation.error instanceof Error ? mutation.error.message : 'Could not save the profile.'}
          </p>
        )}
        {saved && (
          <p role="status" className="flex items-center gap-1.5 text-xs text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Profile successfully saved
          </p>
        )}
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          Save club profile
        </Button>
      </form>
    </div>
  )
}

type ContentKind = 'segments' | 'achievements' | 'showcases' | 'gallery'

type ContentItem = {
  id: string
  title: string
  description: string
  imageUrl: string
  isPublished: boolean
  date: string
  awardedBy: string
  showcaseType: 'event' | 'competition' | 'project' | 'award' | 'recap'
  externalUrl: string
}

const contentSchema = z.object({
  title: z.string().trim().min(1, 'Add a title or image description.').max(160),
  description: z.string().trim().max(2000),
  imageUrl: optionalUrl,
  date: z.string(),
  awardedBy: z.string().trim().max(200),
  showcaseType: z.enum(['event', 'competition', 'project', 'award', 'recap']),
  externalUrl: optionalUrl,
  isPublished: z.boolean(),
})

type ContentForm = z.infer<typeof contentSchema>

const blankContent: ContentForm = {
  title: '',
  description: '',
  imageUrl: '',
  date: '',
  awardedBy: '',
  showcaseType: 'event',
  externalUrl: '',
  isPublished: true,
}

async function fetchContent(kind: ContentKind, organizationId: string): Promise<ContentItem[]> {
  const supabase = getSupabaseClient()
  switch (kind) {
    case 'segments': {
      const { data, error } = await supabase
        .from('club_segments')
        .select('id, title, description, image_url, is_published')
        .eq('organization_id', organizationId)
        .order('sort_order')
      if (error) throw new Error(error.message)
      return (data ?? []).map((row) => ({
        ...blankContent,
        id: row.id,
        title: row.title,
        description: row.description,
        imageUrl: row.image_url ?? '',
        isPublished: row.is_published,
      }))
    }
    case 'achievements': {
      const { data, error } = await supabase
        .from('club_achievements')
        .select('id, title, description, image_url, achieved_on, awarded_by, is_published')
        .eq('organization_id', organizationId)
        .order('sort_order')
      if (error) throw new Error(error.message)
      return (data ?? []).map((row) => ({
        ...blankContent,
        id: row.id,
        title: row.title,
        description: row.description,
        imageUrl: row.image_url ?? '',
        date: row.achieved_on ?? '',
        awardedBy: row.awarded_by ?? '',
        isPublished: row.is_published,
      }))
    }
    case 'showcases': {
      const { data, error } = await supabase
        .from('club_showcases')
        .select('id, title, description, cover_image_url, occurred_on, showcase_type, external_url, is_published')
        .eq('organization_id', organizationId)
        .order('sort_order')
      if (error) throw new Error(error.message)
      return (data ?? []).map((row) => ({
        ...blankContent,
        id: row.id,
        title: row.title,
        description: row.description,
        imageUrl: row.cover_image_url ?? '',
        date: row.occurred_on ?? '',
        showcaseType: row.showcase_type as ContentForm['showcaseType'],
        externalUrl: row.external_url ?? '',
        isPublished: row.is_published,
      }))
    }
    case 'gallery': {
      const { data, error } = await supabase
        .from('club_gallery_items')
        .select('id, image_url, alt_text, caption, is_published')
        .eq('organization_id', organizationId)
        .order('sort_order')
      if (error) throw new Error(error.message)
      return (data ?? []).map((row) => ({
        ...blankContent,
        id: row.id,
        title: row.alt_text,
        description: row.caption ?? '',
        imageUrl: row.image_url,
        isPublished: row.is_published,
      }))
    }
  }
}

async function saveContent(
  kind: ContentKind,
  organizationId: string,
  values: ContentForm,
  id?: string,
): Promise<void> {
  const supabase = getSupabaseClient()
  const shared = { organization_id: organizationId, is_published: values.isPublished }
  let error: { message: string } | null = null

  switch (kind) {
    case 'segments': {
      const payload = {
        ...shared,
        title: values.title,
        description: values.description,
        image_url: values.imageUrl || null,
      }
      const response = id
        ? await supabase.from('club_segments').update(payload).eq('id', id).eq('organization_id', organizationId).select('id').single()
        : await supabase.from('club_segments').insert(payload).select('id').single()
      error = response.error
      break
    }
    case 'achievements': {
      const payload = {
        ...shared,
        title: values.title,
        description: values.description,
        image_url: values.imageUrl || null,
        achieved_on: values.date || null,
        awarded_by: values.awardedBy || null,
      }
      const response = id
        ? await supabase.from('club_achievements').update(payload).eq('id', id).eq('organization_id', organizationId).select('id').single()
        : await supabase.from('club_achievements').insert(payload).select('id').single()
      error = response.error
      break
    }
    case 'showcases': {
      const payload = {
        ...shared,
        title: values.title,
        description: values.description,
        cover_image_url: values.imageUrl || null,
        occurred_on: values.date || null,
        showcase_type: values.showcaseType,
        external_url: values.externalUrl || null,
      }
      const response = id
        ? await supabase.from('club_showcases').update(payload).eq('id', id).eq('organization_id', organizationId).select('id').single()
        : await supabase.from('club_showcases').insert(payload).select('id').single()
      error = response.error
      break
    }
    case 'gallery': {
      const payload = {
        ...shared,
        alt_text: values.title,
        caption: values.description || null,
        image_url: values.imageUrl,
      }
      const response = id
        ? await supabase.from('club_gallery_items').update(payload).eq('id', id).eq('organization_id', organizationId).select('id').single()
        : await supabase.from('club_gallery_items').insert(payload).select('id').single()
      error = response.error
      break
    }
  }

  if (error) throw new Error(error.message)
}

async function togglePublishContent(
  kind: ContentKind,
  organizationId: string,
  id: string,
  currentPublished: boolean,
): Promise<void> {
  const supabase = getSupabaseClient()
  const table = {
    segments: 'club_segments',
    achievements: 'club_achievements',
    showcases: 'club_showcases',
    gallery: 'club_gallery_items',
  }[kind]

  const { error } = await supabase
    .from(table as never)
    .update({ is_published: !currentPublished } as never)
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) throw new Error(error.message)
}

async function deleteContentItem(
  kind: ContentKind,
  organizationId: string,
  id: string,
): Promise<void> {
  const supabase = getSupabaseClient()
  const table = {
    segments: 'club_segments',
    achievements: 'club_achievements',
    showcases: 'club_showcases',
    gallery: 'club_gallery_items',
  }[kind]

  const { error } = await supabase
    .from(table as never)
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) throw new Error(error.message)
}

export function ClubContentEditor({ club, kind }: { club: ClubOrganization; kind: ContentKind }) {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | undefined>()
  const [saved, setSaved] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const { data: items = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['organizer', 'club-content', club.id, kind],
    queryFn: () => fetchContent(kind, club.id),
    staleTime: 30_000,
  })

  const form = useForm<ContentForm>({
    resolver: zodResolver(contentSchema),
    defaultValues: blankContent,
  })

  const saveMutation = useMutation({
    mutationFn: (values: ContentForm) => saveContent(kind, club.id, values, editingId),
    onSuccess: async () => {
      setSaved(true)
      setEditingId(undefined)
      form.reset(blankContent)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organizer', 'club-content', club.id, kind] }),
        queryClient.invalidateQueries({ queryKey: ['club', 'public-profile', club.slug] }),
      ])
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      togglePublishContent(kind, club.id, id, isPublished),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organizer', 'club-content', club.id, kind] }),
        queryClient.invalidateQueries({ queryKey: ['club', 'public-profile', club.slug] }),
      ])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteContentItem(kind, club.id, id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organizer', 'club-content', club.id, kind] }),
        queryClient.invalidateQueries({ queryKey: ['club', 'public-profile', club.slug] }),
      ])
    },
  })

  const heading = {
    segments: 'Activity Segments',
    achievements: 'Achievements',
    showcases: 'Past Events & Competitions',
    gallery: 'Gallery Items',
  }[kind]

  function edit(item: ContentItem) {
    setEditingId(item.id)
    setSaved(false)
    form.reset({
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl,
      date: item.date,
      awardedBy: item.awardedBy,
      showcaseType: item.showcaseType,
      externalUrl: item.externalUrl,
      isPublished: item.isPublished,
    })
  }

  const handleFileUpload = async (file: File) => {
    try {
      setUploadingImage(true)
      const url = await uploadClubAsset(club.id, file, kind)
      form.setValue('imageUrl', url, { shouldValidate: true, shouldDirty: true })
    } catch (err) {
      form.setError('imageUrl', { message: err instanceof Error ? err.message : 'Upload failed' })
    } finally {
      setUploadingImage(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Existing Items Catalog */}
      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-border-subtle)] pb-4">
          <div>
            <h3 className="font-heading text-base font-semibold text-[var(--color-text-primary)]">{heading}</h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Manage records for {club.name}. Published items appear immediately on the public profile.
            </p>
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {isLoading ? (
          <p className="mt-5 text-xs text-[var(--color-text-muted)]">Loading content…</p>
        ) : isError ? (
          <div role="alert" className="mt-5 flex items-center justify-between gap-3 text-xs text-rose-300">
            <span>{error instanceof Error ? error.message : 'Could not load content.'}</span>
            <Button variant="secondary" size="sm" onClick={() => { void refetch() }}>
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-[var(--color-border-subtle)] p-6 text-center text-xs text-[var(--color-text-muted)]">
            No {heading.toLowerCase()} have been created yet. Use the form below to add one.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <article
                key={item.id}
                className="flex flex-col justify-between rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4 transition-all hover:border-[var(--color-accent)]/40"
              >
                <div>
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="mb-3 aspect-video w-full rounded-lg object-cover"
                    />
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-heading text-sm font-semibold text-[var(--color-text-primary)]">{item.title}</h4>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        item.isPublished
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {item.isPublished ? 'Published' : 'Archived / Draft'}
                    </span>
                  </div>

                  {item.description && (
                    <p className="mt-2 line-clamp-2 text-xs leading-[1.6] text-[var(--color-text-body)]">
                      {item.description}
                    </p>
                  )}

                  {(item.date || item.awardedBy) && (
                    <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
                      {[item.date, item.awardedBy].filter(Boolean).join(' • ')}
                    </p>
                  )}
                </div>

                {/* Actions Toolbar */}
                <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-3 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => edit(item)}
                      className="inline-flex items-center gap-1 font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      type="button"
                      disabled={toggleMutation.isPending}
                      onClick={() => toggleMutation.mutate({ id: item.id, isPublished: item.isPublished })}
                      className="inline-flex items-center gap-1 font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"
                    >
                      {item.isPublished ? (
                        <>
                          <Archive className="h-3 w-3 text-amber-300" /> Archive
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3 text-emerald-300" /> Publish
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (window.confirm(`Delete "${item.title}"?`)) {
                        deleteMutation.mutate(item.id)
                      }
                    }}
                    className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Form */}
      <form
        onSubmit={form.handleSubmit((values) => {
          if (kind === 'gallery' && !values.imageUrl) {
            form.setError('imageUrl', { message: 'Add an image URL or upload an image.' })
            return
          }
          setSaved(false)
          saveMutation.mutate(values)
        })}
        className="space-y-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-3">
          <h4 className="font-heading text-sm font-semibold text-[var(--color-text-primary)]">
            {editingId ? `Edit ${kind === 'gallery' ? 'Image' : 'Entry'}` : `Add New ${kind === 'gallery' ? 'Image' : 'Entry'}`}
          </h4>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(undefined)
                form.reset(blankContent)
              }}
              className="text-xs text-[var(--color-accent)] hover:underline cursor-pointer"
            >
              Cancel Edit & Create New
            </button>
          )}
        </div>

        <TextField
          label={kind === 'gallery' ? 'Image Caption / Description' : 'Title'}
          registration={form.register('title')}
          error={form.formState.errors.title?.message}
        />

        <label className="block text-xs font-semibold text-[var(--color-text-primary)]">
          {kind === 'gallery' ? 'Extended Caption' : 'Description'}
          <textarea {...form.register('description')} rows={3} className={fieldClassName} />
          {form.formState.errors.description && (
            <span className="mt-1 block text-rose-300">{form.formState.errors.description.message}</span>
          )}
        </label>

        {/* Image URL + Storage Upload */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--color-text-primary)]">
              {kind === 'gallery' ? 'Image URL (required)' : 'Image URL (optional)'}
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
            >
              <Upload className="h-3 w-3" />
              {uploadingImage ? 'Uploading…' : 'Upload File to Storage'}
            </button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFileUpload(f)
            }}
          />
          <input
            type="text"
            placeholder="https://..."
            {...form.register('imageUrl')}
            className={fieldClassName}
          />
          {form.formState.errors.imageUrl && (
            <span className="mt-1 block text-xs text-rose-300">{form.formState.errors.imageUrl.message}</span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {(kind === 'achievements' || kind === 'showcases') && (
            <label className="block text-xs font-semibold text-[var(--color-text-primary)]">
              Date
              <input type="date" {...form.register('date')} className={fieldClassName} />
            </label>
          )}
          {kind === 'achievements' && (
            <TextField
              label="Awarded by"
              registration={form.register('awardedBy')}
              error={form.formState.errors.awardedBy?.message}
            />
          )}
          {kind === 'showcases' && (
            <>
              <label className="block text-xs font-semibold text-[var(--color-text-primary)]">
                Showcase Type
                <select {...form.register('showcaseType')} className={fieldClassName}>
                  <option value="event">Event</option>
                  <option value="competition">Competition</option>
                  <option value="project">Project</option>
                  <option value="award">Award</option>
                  <option value="recap">Recap</option>
                </select>
              </label>
              <TextField
                label="External URL"
                registration={form.register('externalUrl')}
                error={form.formState.errors.externalUrl?.message}
              />
            </>
          )}
        </div>

        <Controller
          name="isPublished"
          control={form.control}
          render={({ field }) => (
            <label className="flex items-center gap-3 text-xs text-[var(--color-text-body)] cursor-pointer">
              <input
                type="checkbox"
                checked={field.value}
                onChange={field.onChange}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              Publish immediately (visible to campus on public profile)
            </label>
          )}
        />

        {saveMutation.isError && (
          <p role="alert" className="text-xs text-rose-300">
            {saveMutation.error instanceof Error ? saveMutation.error.message : 'Could not save this entry.'}
          </p>
        )}
        {saved && (
          <p role="status" className="flex items-center gap-1.5 text-xs text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Entry successfully saved
          </p>
        )}

        <Button type="submit" size="sm" disabled={saveMutation.isPending}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          {editingId ? 'Save changes' : 'Add entry'}
        </Button>
      </form>
    </div>
  )
}

const fieldClassName =
  'mt-1.5 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-3 py-2.5 text-sm font-normal text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]'

function TextField({
  label,
  registration,
  error,
}: {
  label: string
  registration: UseFormRegisterReturn
  error?: string
}) {
  return (
    <label className="block text-xs font-semibold text-[var(--color-text-primary)]">
      {label}
      <input type="text" {...registration} className={fieldClassName} />
      {error && <span className="mt-1 block text-rose-300">{error}</span>}
    </label>
  )
}
