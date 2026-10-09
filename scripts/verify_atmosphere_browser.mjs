import fs from 'node:fs'
import path from 'node:path'

const ARTIFACT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\a4b3f299-43c8-4d78-bd84-e552365351e5'
const DOCS_DIR = path.resolve('docs/screenshots')

if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true })

async function run() {
  console.log('--- Connecting to Chrome CDP on 9222 ---')
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
    await new Promise((r) => setTimeout(r, 500))
  }

  async function evalInPage(expr) {
    const res = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    })
    return res?.result?.value
  }

  // 1. Desktop Mode (1280x800)
  console.log('\n--- 1. Desktop Viewport (1280x800) ---')
  await setViewport(1280, 800, false)
  await send('Page.navigate', { url: 'http://localhost:5174/' })
  await new Promise((r) => setTimeout(r, 2000))

  // Hero section screenshot
  await evalInPage('window.scrollTo(0, 0)')
  await new Promise((r) => setTimeout(r, 500))
  await screenshot('atmosphere_desktop_hero.png')

  // Scroll down to Upcoming Fests & Club discovery
  await evalInPage(`
    const el = document.getElementById('club-discovery-heading') || document.querySelector('.festivo-card');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  `)
  await new Promise((r) => setTimeout(r, 700))
  await screenshot('atmosphere_desktop_cards.png')

  // Hover over a card to verify hover elevation against new background
  const cardBox = await evalInPage(`
    (() => {
      const card = document.querySelector('.festivo-card');
      if (!card) return null;
      const r = card.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()
  `)
  if (cardBox) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cardBox.x, y: cardBox.y })
    await new Promise((r) => setTimeout(r, 600))
    await screenshot('atmosphere_desktop_card_hover.png')
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 10, y: 10 })
  }

  // 2. Clubs Directory
  console.log('\n--- 2. Clubs Directory (/clubs) ---')
  await send('Page.navigate', { url: 'http://localhost:5174/clubs' })
  await new Promise((r) => setTimeout(r, 1800))
  await screenshot('atmosphere_desktop_clubs.png')

  // 3. Fests Directory
  console.log('\n--- 3. Fests Directory (/fests) ---')
  await send('Page.navigate', { url: 'http://localhost:5174/fests' })
  await new Promise((r) => setTimeout(r, 1800))
  await screenshot('atmosphere_desktop_fests.png')

  // 4. Events Directory
  console.log('\n--- 4. Events Directory (/events) ---')
  await send('Page.navigate', { url: 'http://localhost:5174/events' })
  await new Promise((r) => setTimeout(r, 1800))
  await screenshot('atmosphere_desktop_events.png')

  // 5. Mobile Mode (390x844)
  console.log('\n--- 5. Mobile Viewport (390x844) ---')
  await setViewport(390, 844, true)
  await send('Page.navigate', { url: 'http://localhost:5174/' })
  await new Promise((r) => setTimeout(r, 2000))
  await screenshot('atmosphere_mobile_hero.png')

  await evalInPage(`
    const el = document.getElementById('club-discovery-heading') || document.querySelector('.festivo-card');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  `)
  await new Promise((r) => setTimeout(r, 700))
  await screenshot('atmosphere_mobile_cards.png')

  await send('Page.navigate', { url: 'http://localhost:5174/clubs' })
  await new Promise((r) => setTimeout(r, 1800))
  await screenshot('atmosphere_mobile_clubs.png')

  // Reset viewport
  await send('Emulation.clearDeviceMetricsOverride')
  await send('Page.navigate', { url: 'http://localhost:5174/' })
  await new Promise((r) => setTimeout(r, 500))

  console.log('\n--- All Atmosphere Verification Screenshots Captured Successfully! ---')
  ws.close()
}

run().catch((err) => {
  console.error('Atmosphere verification failed:', err)
  process.exit(1)
})
