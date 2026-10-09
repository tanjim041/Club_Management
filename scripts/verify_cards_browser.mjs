import fs from 'node:fs'
import path from 'node:path'

const ARTIFACT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\a4b3f299-43c8-4d78-bd84-e552365351e5'
const DOCS_DIR = path.resolve('docs/screenshots')

if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true })

async function run() {
  console.log('======================================================================')
  console.log('VERIFYING FESTIVO PUBLIC CARDS: ANIMATION, IMAGES & RESPONSIVENESS')
  console.log('======================================================================\n')

  const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json()
  const page = targets.find((t) => t.type === 'page' && !t.url.startsWith('chrome://'))
  if (!page) throw new Error('No active browser page found on port 9222')

  const ws = new WebSocket(page.webSocketDebuggerUrl)
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

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = nextId++
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new Error(`Timeout waiting for ${method}`))
      }, 15000)
      pending.set(id, {
        resolve: (res) => {
          clearTimeout(timer)
          resolve(res)
        },
        reject: (err) => {
          clearTimeout(timer)
          reject(err)
        },
      })
      ws.send(JSON.stringify({ id, method, params }))
    })
  }

  async function evalInPage(expr) {
    const res = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    })
    return res?.result?.value
  }

  async function screenshot(name) {
    await send('Page.bringToFront')
    await new Promise((r) => setTimeout(r, 400))
    const res = await send('Page.captureScreenshot', { format: 'png' })
    const buf = Buffer.from(res.data, 'base64')
    fs.writeFileSync(path.join(ARTIFACT_DIR, name), buf)
    fs.writeFileSync(path.join(DOCS_DIR, name), buf)
    console.log(`[SCREENSHOT] Saved: ${name}`)
  }

  async function setViewport(width, height, isMobile = false) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile,
    })
    await new Promise((r) => setTimeout(r, 600))
  }

  // 1. Desktop Mode (1280x800)
  console.log('\n--- 1. Desktop Homepage Cards & Pointer Hover ---')
  await setViewport(1280, 800, false)
  await send('Page.navigate', { url: 'http://localhost:5174/' })
  await new Promise((r) => setTimeout(r, 2000))

  // Scroll down to Upcoming Fests section
  await evalInPage(`
    const el = document.getElementById('upcoming-fests-heading');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  `)
  await new Promise((r) => setTimeout(r, 800))
  await screenshot('desktop_fests_unhovered.png')

  // Find first fest card position and hover over it
  const festCardBox = await evalInPage(`
    (() => {
      const card = document.querySelector('.festivo-card');
      if (!card) return null;
      const r = card.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()
  `)

  if (festCardBox) {
    console.log(`Hovering fest card at (${festCardBox.x}, ${festCardBox.y})...`)
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: festCardBox.x,
      y: festCardBox.y,
    })
    await new Promise((r) => setTimeout(r, 700))
    await screenshot('desktop_fest_card_hover.png')

    // Move mouse away to demonstrate return
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 10, y: 10 })
    await new Promise((r) => setTimeout(r, 500))
  }

  // Scroll to Campus Organizations (Clubs Discovery)
  console.log('\n--- 2. Desktop Club Discovery Section (Checking Banners & Fallbacks) ---')
  await evalInPage(`
    const el = document.getElementById('club-discovery-heading');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  `)
  await new Promise((r) => setTimeout(r, 800))
  await screenshot('desktop_clubs_homepage.png')

  // Hover over DRMC IT CLUB card
  const drmcCardBox = await evalInPage(`
    (() => {
      const cards = Array.from(document.querySelectorAll('.festivo-card'));
      const drmc = cards.find(c => c.textContent.includes('DRMC IT CLUB'));
      if (!drmc) return null;
      const r = drmc.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()
  `)

  if (drmcCardBox) {
    console.log(`Hovering DRMC IT CLUB card at (${drmcCardBox.x}, ${drmcCardBox.y})...`)
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: drmcCardBox.x,
      y: drmcCardBox.y,
    })
    await new Promise((r) => setTimeout(r, 700))
    await screenshot('desktop_drmc_card_hover.png')
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 10, y: 10 })
    await new Promise((r) => setTimeout(r, 400))
  }

  // 3. Clubs Directory (/clubs)
  console.log('\n--- 3. Clubs Directory (/clubs) ---')
  await send('Page.navigate', { url: 'http://localhost:5174/clubs' })
  await new Promise((r) => setTimeout(r, 1800))
  await screenshot('desktop_clubs_directory.png')

  // Check search placeholder text
  const searchPlaceholder = await evalInPage(`
    document.querySelector('input[type="text"]')?.placeholder
  `)
  console.log(`Clubs Search Placeholder: "${searchPlaceholder}"`)

  // 4. Fests Directory (/fests)
  console.log('\n--- 4. Fests Directory (/fests) ---')
  await send('Page.navigate', { url: 'http://localhost:5174/fests' })
  await new Promise((r) => setTimeout(r, 1800))
  await screenshot('desktop_fests_directory.png')

  // 5. Events Directory (/events)
  console.log('\n--- 5. Events Directory (/events) ---')
  await send('Page.navigate', { url: 'http://localhost:5174/events' })
  await new Promise((r) => setTimeout(r, 1800))
  await screenshot('desktop_events_directory.png')

  // Hover over first event card
  const eventCardBox = await evalInPage(`
    (() => {
      const card = document.querySelector('.festivo-card');
      if (!card) return null;
      const r = card.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()
  `)

  if (eventCardBox) {
    console.log(`Hovering event card at (${eventCardBox.x}, ${eventCardBox.y})...`)
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: eventCardBox.x,
      y: eventCardBox.y,
    })
    await new Promise((r) => setTimeout(r, 700))
    await screenshot('desktop_event_card_hover.png')
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 10, y: 10 })
    await new Promise((r) => setTimeout(r, 400))
  }

  // 6. Keyboard Focus Test
  console.log('\n--- 6. Keyboard Focus Test ---')
  await send('Page.navigate', { url: 'http://localhost:5174/clubs' })
  await new Promise((r) => setTimeout(r, 1500))

  // Press Tab several times to focus an interactive card link
  for (let i = 0; i < 9; i++) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab' })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' })
    await new Promise((r) => setTimeout(r, 120))
  }
  await new Promise((r) => setTimeout(r, 500))
  await screenshot('desktop_keyboard_focus.png')

  // 7. Tablet Layout (768x1024)
  console.log('\n--- 7. Tablet Responsive View (768x1024) ---')
  await setViewport(768, 1024, false)
  await send('Page.navigate', { url: 'http://localhost:5174/fests' })
  await new Promise((r) => setTimeout(r, 1800))
  await screenshot('tablet_fests_directory.png')

  // 8. Mobile Layout (390x844)
  console.log('\n--- 8. Mobile Responsive View (390x844) ---')
  await setViewport(390, 844, true)
  await send('Page.navigate', { url: 'http://localhost:5174/' })
  await new Promise((r) => setTimeout(r, 1800))

  await evalInPage(`
    const el = document.getElementById('club-discovery-heading');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  `)
  await new Promise((r) => setTimeout(r, 800))
  await screenshot('mobile_homepage_clubs.png')

  await send('Page.navigate', { url: 'http://localhost:5174/events' })
  await new Promise((r) => setTimeout(r, 1800))
  await screenshot('mobile_events_directory.png')

  // 9. Reset Viewport
  await send('Emulation.clearDeviceMetricsOverride')
  await send('Page.navigate', { url: 'http://localhost:5174/' })
  await new Promise((r) => setTimeout(r, 1000))

  console.log('\n======================================================================')
  console.log('BROWSER VERIFICATION COMPLETE: ALL SCREENSHOTS CAPTURED SUCCESSFULLY')
  console.log('======================================================================')
  ws.close()
}

run().catch((err) => {
  console.error('Fatal verification error:', err)
  process.exit(1)
})
