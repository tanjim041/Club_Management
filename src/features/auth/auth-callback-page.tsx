import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { getSupabaseClient } from '../../supabase/client'
import { AuthPageFrame, FormMessage } from './auth-components'
import { useAuth } from './auth-context'
import { getPostAuthenticationPath } from './auth-types'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'We could not finish confirming your account.'
}

export function AuthCallbackPage() {
  const auth = useAuth()
  const { refresh } = auth
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function completeCallback() {
      try {
        const code = new URLSearchParams(window.location.search).get('code')
        if (code) {
          const { error: exchangeError } = await getSupabaseClient().auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
        }
        const snapshot = await refresh()
        if (snapshot.user) {
          navigate(getPostAuthenticationPath(snapshot), { replace: true })
          return
        }
        if (active) setError('Your email is confirmed. Sign in to continue to Festivo.')
      } catch (callbackError) {
        if (active) setError(errorMessage(callbackError))
      }
    }
    void completeCallback()
    return () => { active = false }
  }, [navigate, refresh])

  return <AuthPageFrame eyebrow="Confirming account" title="Setting up your session" description="We are securely connecting your confirmed account to Festivo.">
    {error ? <>
      <FormMessage tone={error.startsWith('Your email is confirmed') ? 'success' : 'error'}>{error}</FormMessage>
      <Link className="mt-6 inline-block" to="/login"><Button>Continue to sign in</Button></Link>
    </> : <div className="flex items-center gap-3 rounded-xl border border-indigo-400/20 bg-indigo-400/10 px-4 py-4 text-sm text-indigo-100"><CheckCircle2 className="h-5 w-5 text-indigo-300" />Confirming your account…</div>}
  </AuthPageFrame>
}
