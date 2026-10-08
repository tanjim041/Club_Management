import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, CameraOff, CheckCircle2, QrCode, Search } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { ErrorState, LoadingState } from '../../components/states/page-states'
import { useAuth } from '../auth'
import { checkInPass, lookupStaffPasses, useCheckInMetricsQuery, useStaffEventsQuery, type CheckInResult, type StaffPass } from './pass-api'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function CheckInPage() {
  const { user } = useAuth()
  const client = useQueryClient()
  const events = useStaffEventsQuery(user?.id)
  const [eventId, setEventId] = useState('')
  const [registrationId, setRegistrationId] = useState('')
  const [manualMatches, setManualMatches] = useState<StaffPass[]>([])
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [result, setResult] = useState<CheckInResult | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerControls = useRef<{ stop: () => void } | null>(null)
  const scanning = useRef(false)

  const selectedEventId = eventId || events.data?.[0]?.id || ''
  const metrics = useCheckInMetricsQuery(selectedEventId || undefined)
  const checkIn = useMutation({
    mutationFn: (identifier: { token: string } | { passId: string }) => checkInPass(selectedEventId, identifier),
    onMutate: () => { setResult(null); setLookupError(null) },
    onSuccess: (saved) => {
      setResult(saved)
      setLookupError(null)
      void client.invalidateQueries({ queryKey: ['check-in', 'metrics', selectedEventId] })
      if (registrationId) void lookupStaffPasses(selectedEventId, registrationId).then(setManualMatches).catch(() => {})
    },
    onError: (error) => { setResult(null); setLookupError(error.message) },
  })

  useEffect(() => {
    if (!cameraOn || !videoRef.current) return
    let disposed = false
    const reader = new BrowserQRCodeReader()
    void reader.decodeFromVideoDevice(undefined, videoRef.current, (scanResult) => {
      if (!scanResult || scanning.current || disposed) return
      scanning.current = true
      scannerControls.current?.stop()
      setCameraOn(false)
      checkIn.mutate({ token: scanResult.getText() })
    }).then((controls) => {
      if (disposed) controls.stop()
      else scannerControls.current = controls
    }).catch((error: unknown) => {
      if (!disposed) { setCameraOn(false); setCameraError(error instanceof Error ? error.message : 'Camera unavailable. Use manual lookup.') }
    })
    return () => { disposed = true; scannerControls.current?.stop(); scannerControls.current = null }
    // The scanner starts only when the operator explicitly activates the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn, selectedEventId])

  async function lookup() {
    setResult(null)
    setManualMatches([])
    setLookupError(null)
    if (!uuidPattern.test(registrationId.trim())) { setLookupError('Enter the registration ID printed on the pass.'); return }
    try {
      const rows = await lookupStaffPasses(selectedEventId, registrationId.trim())
      setManualMatches(rows)
      if (!rows.length) setLookupError('No passes for this registration in the selected event.')
    } catch (error) { setLookupError(error instanceof Error ? error.message : 'Lookup failed.') }
  }

  if (events.isLoading) return <LoadingState label="Loading assigned events..." />
  if (events.isError) return <div className="content-container py-10"><ErrorState title="Could not load assigned events" description={events.error.message} onRetry={() => { void events.refetch() }} /></div>

  return <main className="content-container space-y-6 py-8 sm:py-10">
    <div className="border-b border-[var(--color-border-subtle)] pb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Gate operations</p>
      <h1 className="font-heading mt-2 text-3xl font-bold text-[var(--color-text-primary)]">Event Check-In</h1>
      <p className="mt-2 text-sm text-[var(--color-text-body)]">Verify an assigned event before scanning. Only backend-confirmed checks are recorded.</p>
    </div>
    {!events.data?.length ? <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-body)]">No events are assigned to your active club membership.</div> : <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
      <section className="space-y-5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 sm:p-7">
        <div><label htmlFor="checkin-event" className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">Event</label>
          <select id="checkin-event" value={selectedEventId} onChange={(event) => { setEventId(event.target.value); setResult(null); setManualMatches([]); setLookupError(null); setCameraOn(false) }} className="min-h-11 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-3 text-sm text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            {events.data.map((event) => <option key={event.id} value={event.id}>{event.title} · {event.fest_title}</option>)}
          </select></div>
        <div className="border-t border-[var(--color-border-subtle)] pt-5">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-[var(--color-text-primary)]"><QrCode className="h-5 w-5 text-accent" /> Scan QR</h2>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Camera access requires HTTPS or localhost. The QR contains no contact details.</p>
          <Button className="mt-4" type="button" variant="secondary" onClick={() => { scanning.current = false; setCameraError(null); setResult(null); setCameraOn(!cameraOn) }}>{cameraOn ? <><CameraOff className="mr-2 h-4 w-4" /> Stop camera</> : <><Camera className="mr-2 h-4 w-4" /> Start camera</>}</Button>
          {cameraOn && <video ref={videoRef} muted playsInline className="mt-4 aspect-video w-full rounded-xl bg-black object-cover" aria-label="Live QR camera preview" />}
          {cameraError && <p role="alert" className="mt-3 text-sm text-rose-300">{cameraError}</p>}
        </div>
        <div className="border-t border-[var(--color-border-subtle)] pt-5">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-[var(--color-text-primary)]"><Search className="h-5 w-5 text-accent" /> Manual lookup</h2>
          <label htmlFor="registration-lookup" className="mt-3 block text-sm text-[var(--color-text-body)]">Registration ID</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row"><input id="registration-lookup" value={registrationId} onChange={(event) => setRegistrationId(event.target.value)} placeholder="Paste the ID shown on the pass" className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-3 text-sm text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" /><Button type="button" onClick={() => { void lookup() }}>Find passes</Button></div>
          {manualMatches.length > 0 && <ul className="mt-4 space-y-2">{manualMatches.map((pass) => <li key={pass.pass_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3"><div><p className="text-sm font-semibold text-[var(--color-text-primary)]">{pass.participant_name}{pass.team_name ? ` · ${pass.team_name}` : ''}</p><p className="text-xs text-[var(--color-text-muted)]">{pass.revoked_at ? 'Revoked' : pass.registration_status !== 'confirmed' ? 'Not confirmed' : pass.checked_in_at ? `Checked in ${new Date(pass.checked_in_at).toLocaleString()}` : 'Ready'}</p></div><Button size="sm" disabled={Boolean(pass.revoked_at) || pass.registration_status !== 'confirmed' || checkIn.isPending} onClick={() => checkIn.mutate({ passId: pass.pass_id })}>Check in</Button></li>)}</ul>}
        </div>
        {lookupError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">Verification failed: {lookupError}</p>}
        {result && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"><p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" />{result.result === 'already_checked_in' ? 'Already checked in' : 'Check-in recorded'}</p><p className="mt-1">{result.participant_name}{result.team_name ? ` · ${result.team_name}` : ''} · {new Date(result.checked_in_at).toLocaleString()}</p></div>}
      </section>
      <aside className="h-fit rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 sm:p-7"><h2 className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">Live attendance</h2>{metrics.isError ? <p role="alert" className="mt-3 text-sm text-rose-300">Metrics unavailable: {metrics.error.message}</p> : <><p className="mt-4 text-3xl font-bold text-accent">{metrics.data?.checked_in_people ?? 0} <span className="text-base font-normal text-[var(--color-text-muted)]">/ {metrics.data?.confirmed_people ?? 0} people</span></p><p className="mt-2 text-xs text-[var(--color-text-muted)]">Refreshes after check-in and every 15 seconds.</p></>}</aside>
    </div>}
  </main>
}
