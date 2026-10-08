import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, LogIn } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { signInWithPassword } from './auth-api'
import { AuthPageFrame, FormField, FormMessage, PasswordInput, TextInput } from './auth-components'
import { signInSchema, type SignInValues } from './auth-schemas'
import { useAuth } from './auth-context'
import { getPostAuthenticationPath } from './auth-types'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'We could not sign you in. Please try again.'
}

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTarget = searchParams.get('redirect')

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })

  const getDestination = (snapshot: Parameters<typeof getPostAuthenticationPath>[0]) => {
    if (redirectTarget && redirectTarget.startsWith('/') && !redirectTarget.startsWith('//')) {
      return redirectTarget
    }
    return getPostAuthenticationPath(snapshot)
  }

  if (auth.user && auth.status === 'authenticated') {
    return <Navigate to={getDestination(auth)} replace />
  }

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors('root')
    try {
      await signInWithPassword(values)
      const snapshot = await auth.refresh()
      if (!snapshot.user) {
        throw new Error(
          snapshot.error ?? 'Your session could not be established. Please try again.',
        )
      }
      navigate(getDestination(snapshot), { replace: true })
    } catch (error) {
      form.setError('root', { message: errorMessage(error) })
    }
  })

  return (
    <AuthPageFrame
      eyebrow="Welcome back"
      title="Sign in to Festivo"
      description="Use your account to manage your registrations, operational work, and organization access."
    >
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        {auth.configurationError ? <FormMessage>{auth.configurationError}</FormMessage> : null}
        {form.formState.errors.root?.message ? (
          <FormMessage>{form.formState.errors.root.message}</FormMessage>
        ) : null}
        <FormField
          label="Email address"
          htmlFor="login-email"
          error={form.formState.errors.email?.message}
        >
          <TextInput
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@campus.edu"
            disabled={form.formState.isSubmitting || Boolean(auth.configurationError)}
            aria-invalid={Boolean(form.formState.errors.email)}
            {...form.register('email')}
          />
        </FormField>
        <FormField
          label="Password"
          htmlFor="login-password"
          error={form.formState.errors.password?.message}
        >
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            placeholder="Enter your password"
            disabled={form.formState.isSubmitting || Boolean(auth.configurationError)}
            invalid={Boolean(form.formState.errors.password)}
            {...form.register('password')}
          />
        </FormField>
        <Button
          className="w-full"
          type="submit"
          size="lg"
          disabled={form.formState.isSubmitting || Boolean(auth.configurationError)}
        >
          {form.formState.isSubmitting ? (
            'Signing inâ€¦'
          ) : (
            <>
              <LogIn className="mr-2 h-4 w-4" />
              Sign in
            </>
          )}
        </Button>
      </form>
      <p className="mt-7 text-center text-sm text-[var(--color-text-body)]">
        New to Festivo?{' '}
        <Link className="font-semibold text-[var(--color-accent)] hover:underline" to="/signup">
          Create an account <ArrowRight className="inline h-3.5 w-3.5" />
        </Link>
      </p>
    </AuthPageFrame>
  )
}
