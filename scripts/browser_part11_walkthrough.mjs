import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ARTIFACT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\b9dbb95b-db93-489e-b444-26420c66c078'
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'screenshots')
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.trimStart().startsWith('#') && line.includes('='))
    .map((line) => {
      const idx = line.indexOf('=')
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
    })
)

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
const projectRef = new URL(env.SUPABASE_URL).hostname.split('.')[0]
const storageKey = `sb-${projectRef}-auth-token`

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function run() {
  console.log('======================================================================')
  console.log('PART 11 MULTI-DEVICE BROWSER WALKTHROUGH (DESKTOP, TABLET, MOBILE)')
  console.log('======================================================================\n')

  const newTab = await (await fetch('http://127.0.0.1:9222/json/new?http://localhost:5173/', { method: 'PUT' })).json()
  const ws = new WebSocket(newTab.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })

  const pending = new Map()
  let nextId = 1

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id)
        pending.delete(msg.id)
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)))
        else resolve(msg.result)
      }
    } catch (err) {
      console.error('CDP parse error:', err)
    }
  }

  function sendCDP(method, params = {}) {
    const id = nextId++
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id)
          reject(new Error(`CDP method ${method} timed out`))
        }
      }, 25000)
      pending.set(id, {
        resolve: (val) => { clearTimeout(timeout); resolve(val) },
        reject: (err) => { clearTimeout(timeout); reject(err) },
      })
      ws.send(JSON.stringify({ id, method, params }))
    })
  }

  async function evaluate(expression) {
    const res = await sendCDP('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (res.exceptionDetails) {
      throw new Error(`Eval failed: ${JSON.stringify(res.exceptionDetails)}`)
    }
    return res.result?.value
  }

  async function captureScreenshot(name) {
    const { data } = await sendCDP('Page.captureScreenshot', { format: 'png' })
    const buffer = Buffer.from(data, 'base64')
    const filePath = path.join(SCREENSHOT_DIR, name)
    fs.writeFileSync(filePath, buffer)
    // Also save directly in ARTIFACT_DIR for IDE artifact detection
    fs.writeFileSync(path.join(ARTIFACT_DIR, name), buffer)
    console.log(`[Screenshot Saved] ${name} (${buffer.length} bytes)`)
    return filePath
  }

  async function setViewport(type) {
    if (type === 'desktop') {
      await sendCDP('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false })
    } else if (type === 'tablet') {
      await sendCDP('Emulation.setDeviceMetricsOverride', { width: 768, height: 1024, deviceScaleFactor: 1.5, mobile: true })
    } else if (type === 'mobile') {
      await sendCDP('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
    }
    await sleep(600)
  }

  async function loginAs(email) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: 'Password123!' })
    if (error) throw error
    await evaluate(`localStorage.setItem('${storageKey}', JSON.stringify(${JSON.stringify(data.session)}));`)
    await sendCDP('Page.reload')
    await sleep(1500)
  }

  async function logout() {
    await evaluate(`localStorage.clear(); sessionStorage.clear();`)
    await sendCDP('Page.reload')
    await sleep(1200)
  }

  await sendCDP('Page.enable')
  await sendCDP('DOM.enable')
  await sendCDP('Runtime.enable')

  // -------------------------------------------------------------------------
  // JOURNEY 1: VISITOR (Unauthenticated Discovery)
  // -------------------------------------------------------------------------
  console.log('\n--- JOURNEY 1: VISITOR DISCOVERY ---')
  await setViewport('desktop')
  await logout()
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/' })
  await sleep(1800)

  const homeTitle = await evaluate(`document.title`)
  console.log('Visitor Home Title:', homeTitle)
  assert.ok(homeTitle.includes('Festivo'), 'Home page title verified')
  await captureScreenshot('visitor_desktop_home.png')

  // Open Fest Detail on Tablet Viewport
  console.log('Visitor opening fest detail on tablet...')
  await setViewport('tablet')
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/fests/apex-technology-society/technova-2026' })
  await sleep(1800)
  const festH1 = await evaluate(`document.querySelector('h1')?.textContent.trim()`)
  console.log('Fest Detail Heading:', festH1)
  assert.ok(festH1.includes('TechNova'), 'Fest detail page loaded')
  await captureScreenshot('visitor_tablet_fest_detail.png')

  // Open Club Profile on Mobile Viewport
  console.log('Visitor opening club profile on mobile...')
  await setViewport('mobile')
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/clubs/apex-technology-society' })
  await sleep(1800)
  const clubH1 = await evaluate(`document.querySelector('h1')?.textContent.trim()`)
  console.log('Club Profile Heading:', clubH1)
  assert.ok(clubH1.includes('Apex Technology'), 'Club profile page loaded')
  await captureScreenshot('visitor_mobile_club_profile.png')

  // -------------------------------------------------------------------------
  // JOURNEY 2: PARTICIPANT (Jordan Hayes / participant1)
  // -------------------------------------------------------------------------
  console.log('\n--- JOURNEY 2: PARTICIPANT JOURNEY ---')
  await setViewport('desktop')
  await loginAs('participant1@festivo.org')

  // 2a. Participant Dashboard
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/participant' })
  await sleep(1500)
  const partDashHeading = await evaluate(`document.querySelector('h1')?.textContent.trim()`)
  console.log('Participant Dashboard Heading:', partDashHeading)
  assert.ok(partDashHeading.includes('Participant') || partDashHeading.includes('Jordan'), 'Participant dashboard verified')
  await captureScreenshot('participant_desktop_dashboard.png')

  // 2b. Digital Passes
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/my-passes' })
  await sleep(1500)
  const passCards = await evaluate(`document.querySelectorAll('article').length`)
  console.log('Pass cards rendered:', passCards)
  assert.ok(passCards > 0, 'Digital pass cards rendered')
  await captureScreenshot('participant_desktop_passes.png')

  // 2c. Club Passport on Tablet Viewport
  await setViewport('tablet')
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/passport' })
  await sleep(1500)
  const xpEarned = await evaluate(`document.querySelector('main')?.textContent || ''`)
  console.log('Passport page text snippet:', xpEarned.slice(0, 150).replace(/\s+/g, ' '))
  assert.ok(xpEarned.includes('Club Passport'), 'Club Passport page verified')
  await captureScreenshot('participant_tablet_passport.png')

  // 2d. My Teams on Mobile Viewport
  await setViewport('mobile')
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/my-teams' })
  await sleep(1500)
  const teamText = await evaluate(`document.querySelector('main')?.textContent || ''`)
  console.log('My Teams snippet:', teamText.slice(0, 150).replace(/\s+/g, ' '))
  assert.ok(teamText.includes('CyberPulse AI') || teamText.includes('Team'), 'Team management verified')
  await captureScreenshot('participant_mobile_teams.png')

  // -------------------------------------------------------------------------
  // JOURNEY 3: ORGANIZER (Elena Rostova / organizer.tech)
  // -------------------------------------------------------------------------
  console.log('\n--- JOURNEY 3: ORGANIZER JOURNEY ---')
  await setViewport('desktop')
  await logout()
  await loginAs('organizer.tech@festivo.org')

  // 3a. Organizer Analytics with Copilot
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/analytics' })
  await sleep(1800)
  const analyticsHeading = await evaluate(`document.querySelector('h1')?.textContent.trim()`)
  console.log('Analytics Heading:', analyticsHeading)
  assert.ok(analyticsHeading.includes('Analytics'), 'Analytics hub verified')
  await captureScreenshot('organizer_desktop_analytics.png')

  // 3b. Operations Hub on Tablet Viewport
  await setViewport('tablet')
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/operations' })
  await sleep(1800)
  const opsHeading = await evaluate(`document.querySelector('h1')?.textContent.trim()`)
  console.log('Operations Heading:', opsHeading)
  assert.ok(opsHeading.includes('Operations'), 'Operations hub verified')
  await captureScreenshot('organizer_tablet_operations.png')

  // 3c. Help Desk Queue on Mobile Viewport
  await setViewport('mobile')
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/help-desk' })
  await sleep(1800)
  const helpDeskHeading = await evaluate(`document.querySelector('h1')?.textContent.trim()`)
  console.log('Help Desk Heading:', helpDeskHeading)
  assert.ok(helpDeskHeading.includes('Help Desk'), 'Help desk queue verified')
  await captureScreenshot('organizer_mobile_help_desk.png')

  // -------------------------------------------------------------------------
  // JOURNEY 4: GATE CHECK-IN STAFF (Morgan Reed / staff@festivo.org)
  // -------------------------------------------------------------------------
  console.log('\n--- JOURNEY 4: CHECK-IN STAFF JOURNEY ---')
  await setViewport('desktop')
  await logout()
  await loginAs('staff@festivo.org')

  // 4a. Check-In Page Desktop
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/check-in' })
  await sleep(1800)
  const checkinHeading = await evaluate(`document.querySelector('h1')?.textContent.trim()`)
  console.log('Check-In Heading:', checkinHeading)
  assert.ok(checkinHeading.includes('Check-In'), 'Check-in workspace verified')
  await captureScreenshot('staff_desktop_checkin.png')

  // 4b. Check-In Page Mobile Viewport
  await setViewport('mobile')
  await sleep(800)
  await captureScreenshot('staff_mobile_checkin.png')

  // Close tab
  await sendCDP('Page.close')
  ws.close()

  console.log('\n======================================================================')
  console.log('ALL MULTI-DEVICE WALKTHROUGHS PASSED & SCREENSHOTS CAPTURED!')
  console.log('======================================================================\n')
}

await run()
