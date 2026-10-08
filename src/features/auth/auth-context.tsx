import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ErrorState, LoadingState } from '../../components/states/page-states'
import { getSupabaseClient } from '../../supabase/client'
import { loadCurrentUserAccess, signOutCurrentUser } from './auth-api'
import {
  isParticipantProfileComplete,
  resolveAuthorizedRole,
  unauthenticatedSnapshot,
  type AuthSnapshot,
  type AuthorizedRole,
} from './auth-types'

type AuthContextValue = AuthSnapshot & {
  refresh: () => Promise<AuthSnapshot>
  signOut: () => Promise<void>
}

const loadingSnapshot: AuthSnapshot = { ...unauthenticatedSnapshot, status: 'loading' }
const AuthContext = createContext<AuthContextValue | null>(null)

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : 'We could not verify your account access. Please try again.'
}

function failedSnapshot(error: unknown): AuthSnapshot {
  const message = messageFromError(error)
  const isConfigurationIssue = message.startsWith('Supabase is not configured')
  return {
    ...unauthenticatedSnapshot,
    status: isConfigurationIssue ? 'configuration-error' : 'unauthenticated',
    configurationError: isConfigurationIssue ? message : null,
    error: message,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(loadingSnapshot)

  const refresh = useCallback(async (): Promise<AuthSnapshot> => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error

      const user = data.session?.user
      if (!user) {
        setSnapshot(unauthenticatedSnapshot)
        return unauthenticatedSnapshot
      }

      const { profile, membershipRoles } = await loadCurrentUserAccess(user.id)
      const nextSnapshot: AuthSnapshot = {
        status: 'authenticated',
        user,
        profile,
        role: resolveAuthorizedRole(membershipRoles),
        isProfileComplete: isParticipantProfileComplete(profile),
        configurationError: null,
        error: null,
      }
      setSnapshot(nextSnapshot)
      return nextSnapshot
    } catch (error) {
      const nextSnapshot = failedSnapshot(error)
      setSnapshot(nextSnapshot)
      return nextSnapshot
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    let unsubscribe: (() => void) | undefined

    const initialRefreshTimer = window.setTimeout(() => {
      if (isMounted) void refresh()
    }, 0)
    try {
      const supabase = getSupabaseClient()
      const listener = supabase.auth.onAuthStateChange(() => {
        // Auth event callbacks must return promptly; refresh outside the callback.
        window.setTimeout(() => {
          if (isMounted) void refresh()
        }, 0)
      })
      unsubscribe = () => listener.data.subscription.unsubscribe()
    } catch {
      // refresh already exposes configuration failures to the UI.
    }

    return () => {
      isMounted = false
      window.clearTimeout(initialRefreshTimer)
      unsubscribe?.()
    }
  }, [refresh])

  const signOut = useCallback(async () => {
    await signOutCurrentUser()
    setSnapshot(unauthenticatedSnapshot)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({ ...snapshot, refresh, signOut }), [refresh, signOut, snapshot])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}

export function RequireAuthentication({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const location = useLocation()
  if (auth.status === 'loading') return <LoadingState label="Checking your secure session…" />
  if (auth.configurationError) return <ErrorState title="Supabase needs configuration" description={auth.configurationError} />
  if (!auth.user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}

export function RequireRole({ allowedRoles, children }: { allowedRoles: AuthorizedRole[]; children: ReactNode }) {
  const auth = useAuth()
  if (auth.status === 'loading') return <LoadingState label="Checking your authorized role…" />
  if (auth.configurationError) return <ErrorState title="Supabase needs configuration" description={auth.configurationError} />
  if (!auth.user) return <Navigate to="/login" replace />
  if (auth.role === 'participant' && !auth.isProfileComplete) return <Navigate to="/complete-profile" replace />
  if (!allowedRoles.includes(auth.role)) return <Navigate to="/unauthorized" replace />
  return <>{children}</>
}
