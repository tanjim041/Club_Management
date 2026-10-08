import { Navigate } from 'react-router-dom'
import { LoadingState } from '../components/states/page-states'
import { getPostAuthenticationPath, useAuth } from '../features/auth'

export function DashboardRedirect() {
  const auth = useAuth()
  if (auth.status === 'loading') return <LoadingState label="Preparing your dashboard…" />
  if (!auth.user) return <Navigate to="/login" replace />
  return <Navigate to={getPostAuthenticationPath(auth)} replace />
}
