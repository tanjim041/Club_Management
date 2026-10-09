import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { signUpParticipant } from './auth-api'
import { AuthPageFrame, FormField, FormMessage, PasswordInput, TextInput } from './auth-components'
import { signUpSchema, type SignUpValues } from './auth-schemas'
import { useAuth } from './auth-context'
import { getPostAuthenticationPath } from './auth-types'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'We could not create your account. Please try again.'
}

export function SignUpPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedRedirect = searchParams.get('redirect')
  const redirectTarget = requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//') ? requestedRedirect : null
  const loginPath = redirectTarget ? `/login?redirect=${encodeURIComponent(redirectTarget)}` : '/login'
  const [confirmationSent, setConfirmationSent] = useState(false)
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  })

  if (auth.user && auth.status === 'authenticated') {
    return <Navigate to={redirectTarget || getPostAuthenticationPath(auth)} replace />
  }

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors('root')
    try {
      const result = await signUpParticipant(values)
      if (result.session) {
        const snapshot = await auth.refresh()
        navigate(redirectTarget || getPostAuthenticationPath(snapshot), { replace: true })
        return
      }
      setConfirmationSent(true)
    } catch (error) {
      form.setError('root', { message: errorMessage(error) })
    }
  })

  if (confirmationSent) {
    return (
      <AuthPageFrame
        eyebrow="One more step"
        title="Check your inbox"
        description="We sent a confirmation link to your email address. Open it to activate your Festivo account."
      >
        <FormMessage tone="success">
          After confirmation, return here and sign in to finish your participant profile{redirectTarget ? ' and answer your team invitation' : ''}.
        </FormMessage>
        <Link
          className="mt-6 inline-flex items-center text-sm font-semibold text-[var(--color-accent)] hover:underline"
          to={loginPath}
        >
          Go to sign in <ArrowRight className="ml-1.5 h-4 w-4" />
        </Link>
      </AuthPageFrame>
    )
  }

  return (
    <AuthPageFrame
      eyebrow="Join Festivo"
      title="Create your account"
      description="Self-created accounts begin as participant accounts. Authorized clubs can assign operational access later."
    >
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        {auth.configurationError ? <FormMessage>{auth.configurationError}</FormMessage> : null}
        {form.formState.errors.root?.message ? (
          <FormMessage>{form.formState.errors.root.message}</FormMessage>
        ) : null}
        <FormField
          label="Full name"
          htmlFor="signup-name"
          error={form.formState.errors.fullName?.message}
        >
          <TextInput
            id="signup-name"
            type="text"
            autoComplete="name"
            placeholder="Jane Doe"
            disabled={form.formState.isSubmitting || Boolean(auth.configurationError)}
            aria-invalid={Boolean(form.formState.errors.fullName)}
            {...form.register('fullName')}
          />
        </FormField>
        <FormField
          label="Email address"
          htmlFor="signup-email"
          error={form.formState.errors.email?.message}
        >
          <TextInput
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@campus.edu"
            disabled={form.formState.isSubmitting || Boolean(auth.configurationError)}
            aria-invalid={Boolean(form.formState.errors.email)}
            {...form.register('email')}
          />
        </FormField>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Password"
            htmlFor="signup-password"
            error={form.formState.errors.password?.message}
          >
            <PasswordInput
              id="signup-password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              disabled={form.formState.isSubmitting || Boolean(auth.configurationError)}
              invalid={Boolean(form.formState.errors.password)}
              {...form.register('password')}
            />
          </FormField>
          <FormField
            label="Confirm password"
            htmlFor="signup-confirm-password"
            error={form.formState.errors.confirmPassword?.message}
          >
            <PasswordInput
              id="signup-confirm-password"
              autoComplete="new-password"
              placeholder="Repeat password"
              disabled={form.formState.isSubmitting || Boolean(auth.configurationError)}
              invalid={Boolean(form.formState.errors.confirmPassword)}
              {...form.register('confirmPassword')}
            />
          </FormField>
        </div>
        <Button
          className="w-full"
          type="submit"
          size="lg"
          disabled={form.formState.isSubmitting || Boolean(auth.configurationError)}
        >
          {form.formState.isSubmitting ? (
            'Creating account…'
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Create participant account
            </>
          )}
        </Button>
      </form>
      <p className="mt-7 text-center text-sm text-[var(--color-text-body)]">
        Already have an account?{' '}
        <Link className="font-semibold text-[var(--color-accent)] hover:underline" to={loginPath}>
          Sign in <ArrowRight className="inline h-3.5 w-3.5" />
        </Link>
      </p>
    </AuthPageFrame>
  )
}
