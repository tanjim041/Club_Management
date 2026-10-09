import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '../../supabase/client'
import { useAuth } from '../auth'
import { Button } from '../../components/ui/button'
import { EmptyState, ErrorState, LoadingState } from '../../components/states/page-states'

export function NotificationsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['notifications', user?.id], enabled: Boolean(user), refetchInterval: 30_000, queryFn: async () => {
    const { data, error } = await getSupabaseClient().from('notifications').select('id,title,body,kind,read_at,created_at').eq('recipient_id', user!.id).order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    return data ?? []
  } })
  async function markRead(id: string) {
    const { error } = await getSupabaseClient().from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('recipient_id', user!.id)
    if (error) throw error
    await queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
  }
  if (query.isLoading) return <LoadingState label="Loading notifications..." />
  if (query.isError) return <div className="content-container py-10"><ErrorState title="Notifications unavailable" description={query.error.message} onRetry={() => { void query.refetch() }} /></div>
  return <main className="content-container space-y-6 py-8 sm:py-10"><header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Your updates</p><h1 className="font-heading mt-2 text-3xl font-bold text-text-primary">Notifications</h1><p className="mt-2 text-sm text-text-body">Private announcements and registration updates appear here.</p></header>{query.data?.length ? <ul className="space-y-3">{query.data.map((item) => <li key={item.id} className="rounded-2xl border border-border-subtle bg-surface p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-text-muted">{item.kind.replace('_',' ')} · {new Date(item.created_at).toLocaleString()} {item.read_at ? '· Read' : '· Unread'}</p><h2 className="mt-1 font-semibold text-text-primary">{item.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm text-text-body">{item.body}</p></div>{!item.read_at && <Button size="sm" variant="secondary" onClick={() => { void markRead(item.id).catch((error: unknown) => window.alert(error instanceof Error ? error.message : 'Could not mark read')) }}>Mark read</Button>}</div></li>)}</ul> : <EmptyState title="No notifications" description="You are all caught up." />}</main>
}
