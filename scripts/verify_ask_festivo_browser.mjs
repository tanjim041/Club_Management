import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ARTIFACT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\b9dbb95b-db93-489e-b444-26420c66c078'
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
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
  console.log('VERIFYING ASK FESTIVO CHATBOT IN CHROME BROWSER (DESKTOP & MOBILE)')
  console.log('======================================================================\n')

  // Create new page tab via CDP
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
    const filePath = path.join(ARTIFACT_DIR, name)
    fs.writeFileSync(filePath, buffer)
    console.log(`[Screenshot Saved] ${name} (${buffer.length} bytes)`)
    return filePath
  }

  // Enable domains
  await sendCDP('Page.enable')
  await sendCDP('DOM.enable')
  await sendCDP('Runtime.enable')

  // Set Desktop viewport (1280x800)
  await sendCDP('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  })

  // Clear session to test unauthenticated visitor first
  await evaluate(`localStorage.clear(); sessionStorage.clear();`)
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/' })
  await sleep(2000)

  // -------------------------------------------------------------------------
  // 1. Verify Desktop Navigation on Home Page
  // -------------------------------------------------------------------------
  console.log('--- Step 1: Desktop Navigation Check ---')
  const desktopNavItems = await evaluate(`
    Array.from(document.querySelectorAll('header nav a')).map(a => a.textContent.trim())
  `)
  console.log('Desktop header links:', desktopNavItems)
  assert.ok(desktopNavItems.some((t) => t.includes('Ask Festivo')), 'Desktop navbar contains Ask Festivo link')

  const floatingButton = await evaluate(`
    Boolean(document.querySelector('a[aria-label="Open Ask Festivo AI Assistant"]'))
  `)
  console.log('Floating Ask Festivo launcher present:', floatingButton)
  assert.ok(floatingButton, 'Floating Ask Festivo launcher exists on home page')

  // -------------------------------------------------------------------------
  // 2. Click "Ask Festivo" and Open Assistant Page as Visitor
  // -------------------------------------------------------------------------
  console.log('\n--- Step 2: Open /assistant as Visitor ---')
  await evaluate(`
    const link = document.querySelector('header nav a[href="/assistant"]') || document.querySelector('a[aria-label="Open Ask Festivo AI Assistant"]');
    link.click();
  `)
  await sleep(1500)

  const currentUrl = await evaluate(`window.location.pathname`)
  console.log('Navigated to:', currentUrl)
  assert.equal(currentUrl, '/assistant', 'Successfully navigated to /assistant')

  const pageTitle = await evaluate(`document.querySelector('h1')?.textContent.trim()`)
  console.log('Page Title:', pageTitle)
  assert.ok(pageTitle.includes('AI Assistant'), 'Page title indicates AI Assistant')

  const promptChips = await evaluate(`
    Array.from(document.querySelectorAll('section[aria-label="Suggested Questions"] button')).map(b => b.textContent.trim())
  `)
  console.log('Suggested prompt chips found:', promptChips)
  assert.ok(promptChips.some((p) => p.includes('Eligibility & Rules')), 'Rules chip present')
  assert.ok(promptChips.some((p) => p.includes('Registration Deadlines')), 'Deadlines chip present')
  assert.ok(promptChips.some((p) => p.includes('Locations & Venues')), 'Venues chip present')
  assert.ok(promptChips.some((p) => p.includes('Recommendations')), 'Recommendations chip present')
  assert.ok(promptChips.some((p) => p.includes('My Confirmed Schedule')), 'My Schedule chip present')

  // -------------------------------------------------------------------------
  // 3. Test Personal Question while Unauthenticated (Sign-In Enforced)
  // -------------------------------------------------------------------------
  console.log('\n--- Step 3: Test Personal Question Sign-In Requirement ---')
  // Click "My Confirmed Schedule" chip
  await evaluate(`
    const btn = Array.from(document.querySelectorAll('section[aria-label="Suggested Questions"] button'))
      .find(b => b.textContent.includes('My Confirmed Schedule'));
    if (btn) btn.click();
  `)

  let visitorPromptFound = false
  let lastAssistantMessage = ''
  for (let i = 0; i < 10; i++) {
    await sleep(800)
    lastAssistantMessage = await evaluate(`
      (() => {
        const msgs = document.querySelectorAll('div[data-message-sender="assistant"]');
        const last = msgs[msgs.length - 1];
        return last ? last.textContent : '';
      })()
    `)
    if (lastAssistantMessage && lastAssistantMessage.includes('Sign-in required')) {
      visitorPromptFound = true
      break
    }
  }
  console.log('Visitor Response:', lastAssistantMessage)
  assert.ok(visitorPromptFound, 'Assistant correctly enforced sign-in for personal schedule')

  const hasSignInCallout = await evaluate(`
    Boolean(document.querySelector('a[href="/login?redirect=/assistant"]'))
  `)
  console.log('Sign-in callout button rendered:', hasSignInCallout)
  assert.ok(hasSignInCallout, 'Sign In Now CTA button rendered in chat bubble')

  await captureScreenshot('desktop_visitor_personal_prompt.png')

  // -------------------------------------------------------------------------
  // 4. Authenticate as Participant 1 & Ask Personal Question
  // -------------------------------------------------------------------------
  console.log('\n--- Step 4: Authenticate as participant1 and Test Model Reply ---')
  const { data: p1Auth, error: p1Err } = await supabase.auth.signInWithPassword({
    email: 'participant1@festivo.org',
    password: 'Password123!',
  })
  if (p1Err) throw p1Err

  // Inject session into browser localStorage
  await evaluate(`
    localStorage.setItem('${storageKey}', JSON.stringify(${JSON.stringify(p1Auth.session)}));
  `)
  await sendCDP('Page.reload')
  await sleep(2500)

  const authBannerText = await evaluate(`
    document.querySelector('main div.rounded-2xl')?.textContent.trim() || ''
  `)
  console.log('Auth Banner:', authBannerText)
  assert.ok(authBannerText.includes('participant1@festivo.org') || authBannerText.includes('Participant'), 'Banner confirms signed-in participant')

  // Click personal schedule chip
  console.log('Asking personal schedule question as signed-in participant...')
  await evaluate(`
    const btn = Array.from(document.querySelectorAll('section[aria-label="Suggested Questions"] button'))
      .find(b => b.textContent.includes('My Confirmed Schedule'));
    if (btn) btn.click();
  `)

  // Wait for model reply
  let replied = false
  for (let i = 0; i < 20; i++) {
    await sleep(1500)
    const status = await evaluate(`
      (() => {
        const msgs = Array.from(document.querySelectorAll('div[data-message-sender="assistant"]'));
        if (msgs.length < 2) return null;
        const last = msgs[msgs.length - 1];
        if (!last || last.textContent.includes('thinking')) return null;
        return {
          text: last.textContent,
          hasAiBadge: Boolean(last.querySelector('.text-accent') || last.textContent.includes('AI Reply')),
          hasLink: Boolean(last.querySelector('a[href^="/fests/"]') || last.querySelector('a[href^="/events"]'))
        };
      })()
    `)
    if (status) {
      console.log('Assistant Reply Preview:', status.text.slice(0, 200) + '...')
      console.log('AI Badge present:', status.hasAiBadge, '| Deep links present:', status.hasLink)
      replied = true
      break
    }
  }
  assert.ok(replied, 'Participant received personal schedule response')
  await captureScreenshot('desktop_participant_schedule_reply.png')

  // -------------------------------------------------------------------------
  // 5. Test Fallback Mode Simulation
  // -------------------------------------------------------------------------
  console.log('\n--- Step 5: Test Unavailable-AI Fallback Simulation ---')
  await evaluate(`
    (() => {
      const fallbackBtn = Array.from(document.querySelectorAll('header button'))
        .find(b => b.textContent.includes('Test Fallback Mode') || b.textContent.includes('Offline Mode'));
      if (fallbackBtn) fallbackBtn.click();
    })()
  `)
  await sleep(500)

  const offlineActive = await evaluate(`
    Boolean(document.querySelector('header button')?.textContent.includes('Offline Mode Active'))
  `)
  console.log('Offline mode toggle active:', offlineActive)

  console.log('Asking question in fallback mode via chip...')
  await evaluate(`
    (() => {
      const btn = Array.from(document.querySelectorAll('section[aria-label="Suggested Questions"] button'))
        .find(b => b.textContent.includes('Recommendations'));
      if (btn) btn.click();
    })()
  `)
  await sleep(1500)

  let fallbackMsg = null
  for (let i = 0; i < 10; i++) {
    await sleep(500)
    fallbackMsg = await evaluate(`
      (() => {
        const msgs = Array.from(document.querySelectorAll('div[data-message-sender="assistant"]'));
        if (msgs.length < 3) return null;
        const last = msgs[msgs.length - 1];
        return {
          text: last ? last.textContent : '',
          hasFallbackBadge: Boolean(last && last.textContent.includes('Rule-Based Fallback')),
        };
      })()
    `)
    if (fallbackMsg && fallbackMsg.hasFallbackBadge) break
  }
  assert.ok(fallbackMsg && fallbackMsg.hasFallbackBadge, 'Message displays Rule-Based Fallback badge')
  console.log('Fallback Message Preview:', fallbackMsg.text.slice(0, 180) + '...')
  console.log('Fallback Badge present:', fallbackMsg.hasFallbackBadge)
  await captureScreenshot('desktop_fallback_mode.png')

  // -------------------------------------------------------------------------
  // 6. Test Mobile Viewport (390x844) & Navigation
  // -------------------------------------------------------------------------
  console.log('\n--- Step 6: Mobile Viewport & Navigation Check ---')
  await sendCDP('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  })
  await sleep(1000)

  // Navigate to home page on mobile
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/' })
  await sleep(1500)

  // Open mobile menu
  await evaluate(`
    const menuBtn = document.querySelector('button[aria-controls="header-mobile-menu"]');
    if (menuBtn) menuBtn.click();
  `)
  await sleep(800)

  const mobileNavLinks = await evaluate(`
    Array.from(document.querySelectorAll('#header-mobile-menu a')).map(a => a.textContent.trim())
  `)
  console.log('Mobile menu links:', mobileNavLinks)
  assert.ok(mobileNavLinks.some((l) => l.includes('Ask Festivo')), 'Mobile menu clearly contains Ask Festivo')

  await captureScreenshot('mobile_navigation_menu.png')

  // Click Ask Festivo from mobile menu
  await evaluate(`
    const askLink = Array.from(document.querySelectorAll('#header-mobile-menu a')).find(a => a.textContent.includes('Ask Festivo'));
    if (askLink) askLink.click();
  `)
  await sleep(1500)

  const mobileUrl = await evaluate(`window.location.pathname`)
  console.log('Mobile navigated to:', mobileUrl)
  assert.equal(mobileUrl, '/assistant', 'Mobile navigates to /assistant')

  await evaluate(`window.scrollTo(0, 0);`)
  await sleep(500)
  await captureScreenshot('mobile_assistant_chat_page.png')

  // Close tab
  await sendCDP('Page.close')
  ws.close()

  console.log('\n======================================================================')
  console.log('ALL BROWSER VERIFICATION CHECKS PASSED SUCCESSFULLY!')
  console.log('======================================================================\n')
}

await run()
