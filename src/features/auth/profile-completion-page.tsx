import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, ClipboardCheck } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { ErrorState, LoadingState } from '../../components/states/page-states'
import { completeParticipantProfile } from './auth-api'
import { AuthPageFrame, FormField, FormMessage, TextInput, authInputClassName } from './auth-components'
import { formatList, profileCompletionSchema, type ProfileCompletionValues } from './auth-schemas'
import { useAuth } from './auth-context'
import { getPostAuthenticationPath } from './auth-types'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'We could not save your profile. Please try again.'
}

function ProfileCompletionForm({ redirectTarget }: { redirectTarget: string | null }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const profile = auth.profile
  const user = auth.user
  const form = useForm<ProfileCompletionValues>({
    resolver: zodResolver(profileCompletionSchema),
    defaultValues: {
      fullName: profile?.full_name ?? (typeof user?.user_metadata.full_name === 'string' ? user.user_metadata.full_name : ''),
      institution: profile?.institution ?? '',
      phone: profile?.phone ?? '',
      experienceLevel: profile?.experience_level ?? undefined,
      interests: formatList(profile?.interests),
      skills: formatList(profile?.skills),
    },
  })

  useEffect(() => {
    form.reset({
      fullName: profile?.full_name ?? (typeof user?.user_metadata.full_name === 'string' ? user.user_metadata.full_name : ''),
      institution: profile?.institution ?? '',
      phone: profile?.phone ?? '',
      experienceLevel: profile?.experience_level ?? undefined,
      interests: formatList(profile?.interests),
      skills: formatList(profile?.skills),
    })
  }, [form, profile, user?.user_metadata.full_name])

  if (!user) return null

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors('root')
    try {
      await completeParticipantProfile(user.id, values)
      const snapshot = await auth.refresh()
      if (!snapshot.isProfileComplete) throw new Error('Your details were saved, but Festivo could not confirm that your profile is complete. Please try again.')
      navigate(redirectTarget || getPostAuthenticationPath(snapshot), { replace: true })
    } catch (error) {
      form.setError('root', { message: errorMessage(error) })
    }
  })

  return <AuthPageFrame eyebrow="Participant profile" title="Tell us a little about you" description="This helps Festivo tailor event discovery and ensure organizers have the information they need.">
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      {form.formState.errors.root?.message ? <FormMessage>{form.formState.errors.root.message}</FormMessage> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Full name" htmlFor="profile-full-name" error={form.formState.errors.fullName?.message}>
          <TextInput id="profile-full-name" autoComplete="name" placeholder="Your name" disabled={form.formState.isSubmitting} aria-invalid={Boolean(form.formState.errors.fullName)} {...form.register('fullName')} />
        </FormField>
        <FormField label="Institution" htmlFor="profile-institution" error={form.formState.errors.institution?.message}>
          <TextInput id="profile-institution" autoComplete="organization" placeholder="University or college" disabled={form.formState.isSubmitting} aria-invalid={Boolean(form.formState.errors.institution)} {...form.register('institution')} />
        </FormField>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Phone number" htmlFor="profile-phone" hint="Optional — used only where an organizer needs to contact you." error={form.formState.errors.phone?.message}>
          <TextInput id="profile-phone" type="tel" autoComplete="tel" placeholder="+880 …" disabled={form.formState.isSubmitting} aria-invalid={Boolean(form.formState.errors.phone)} {...form.register('phone')} />
        </FormField>
        <FormField label="Experience level" htmlFor="profile-experience" error={form.formState.errors.experienceLevel?.message}>
          <select id="profile-experience" className={authInputClassName} disabled={form.formState.isSubmitting} aria-invalid={Boolean(form.formState.errors.experienceLevel)} {...form.register('experienceLevel')}>
            <option value="">Select a level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </FormField>
      </div>
      <FormField label="Interests" htmlFor="profile-interests" hint="Optional. Separate topics with commas, for example: robotics, debate, music." error={form.formState.errors.interests?.message}>
        <TextInput id="profile-interests" placeholder="What would you like to explore?" disabled={form.formState.isSubmitting} aria-invalid={Boolean(form.formState.errors.interests)} {...form.register('interests')} />
      </FormField>
      <FormField label="Skills" htmlFor="profile-skills" hint="Optional. Separate skills with commas, for example: design, public speaking." error={form.formState.errors.skills?.message}>
        <TextInput id="profile-skills" placeholder="What do you bring to a team?" disabled={form.formState.isSubmitting} aria-invalid={Boolean(form.formState.errors.skills)} {...form.register('skills')} />
      </FormField>
      <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Saving profile…' : <><ClipboardCheck className="mr-2 h-4 w-4" />Save and continue</>}
      </Button>
    </form>
    <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs leading-5 text-slate-500">You can update these details later from your account settings. <ArrowRight className="h-3.5 w-3.5" /></p>
  </AuthPageFrame>
}

export function ProfileCompletionPage() {
  const auth = useAuth()
  const [searchParams] = useSearchParams()
  const requestedRedirect = searchParams.get('redirect')
  const redirectTarget = requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//') ? requestedRedirect : null
  if (auth.status === 'loading') return <LoadingState label="Loading your participant profile…" />
  if (auth.configurationError) return <ErrorState title="Supabase needs configuration" description={auth.configurationError} />
  if (!auth.user) return <Navigate to="/login" replace />
  if (auth.role !== 'participant') return <Navigate to={getPostAuthenticationPath(auth)} replace />
  if (auth.isProfileComplete) return <Navigate to={redirectTarget || getPostAuthenticationPath(auth)} replace />
  return <ProfileCompletionForm redirectTarget={redirectTarget} />
}
