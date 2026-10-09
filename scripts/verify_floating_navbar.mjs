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
  const consoleErrors = []

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args?.map(a => a.value || a.description).join(' '))
      }
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
  console.log('\n--- 1. Desktop Floating Navbar & Typography (1280x800) ---')
  await setViewport(1280, 800, false)
  await send('Page.navigate', { url: 'http://localhost:5174/' })
  await new Promise((r) => setTimeout(r, 2200))

  // Screenshot homepage hero with floating navbar
  await evalInPage(`
    window.history.scrollRestoration = 'manual';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  `)
  await new Promise((r) => setTimeout(r, 600))
  await screenshot('floating_navbar_desktop_hero.png')

  // Hover over "More" dropdown button and click it to show dropdown popover
  const moreBtnBox = await evalInPage(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('More'));
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()
  `)

  if (moreBtnBox) {
    console.log(`Clicking 'More' dropdown at (${moreBtnBox.x}, ${moreBtnBox.y})...`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: moreBtnBox.x, y: moreBtnBox.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: moreBtnBox.x, y: moreBtnBox.y, button: 'left', clickCount: 1 })
    await new Promise((r) => setTimeout(r, 600))
    await screenshot('floating_navbar_more_dropdown.png')
    // Click outside to close
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 10, y: 10, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 10, y: 10, button: 'left', clickCount: 1 })
    await new Promise((r) => setTimeout(r, 300))
  }

  // Scroll down to test sticky floating navbar behavior with content scrolling underneath
  console.log('\n--- 2. Sticky Floating Navbar on Scroll ---')
  await evalInPage('window.scrollTo(0, 450)')
  await new Promise((r) => setTimeout(r, 600))
  await screenshot('floating_navbar_scrolled.png')

  // 3. Test active capsule routing on /clubs
  console.log('\n--- 3. Active Capsule on /clubs ---')
  await send('Page.navigate', { url: 'http://localhost:5174/clubs' })
  await new Promise((r) => setTimeout(r, 1800))
  await evalInPage('window.scrollTo(0, 0)')
  await new Promise((r) => setTimeout(r, 400))
  await screenshot('floating_navbar_clubs_page.png')

  // 4. Test active capsule routing on /events
  console.log('\n--- 4. Active Capsule on /events ---')
  await send('Page.navigate', { url: 'http://localhost:5174/events' })
  await new Promise((r) => setTimeout(r, 1800))
  await evalInPage('window.scrollTo(0, 0)')
  await new Promise((r) => setTimeout(r, 400))
  await screenshot('floating_navbar_events_page.png')

  // 5. Tablet Responsive View (768x1024)
  console.log('\n--- 5. Tablet View (768x1024) ---')
  await setViewport(768, 1024, false)
  await send('Page.navigate', { url: 'http://localhost:5174/' })
  await new Promise((r) => setTimeout(r, 1800))
  await screenshot('floating_navbar_tablet.png')

  // 6. Mobile Responsive View (390x844)
  console.log('\n--- 6. Mobile View (390x844) ---')
  await setViewport(390, 844, true)
  await send('Page.navigate', { url: 'http://localhost:5174/' })
  await new Promise((r) => setTimeout(r, 1800))
  await screenshot('floating_navbar_mobile_closed.png')

  // Open mobile menu
  const menuBtnBox = await evalInPage(`
    (() => {
      const btn = document.querySelector('button[aria-label*="menu" i], button[aria-controls="header-mobile-menu"]');
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()
  `)

  if (menuBtnBox) {
    console.log(`Clicking mobile menu toggle at (${menuBtnBox.x}, ${menuBtnBox.y})...`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: menuBtnBox.x, y: menuBtnBox.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: menuBtnBox.x, y: menuBtnBox.y, button: 'left', clickCount: 1 })
    await new Promise((r) => setTimeout(r, 600))
    await screenshot('floating_navbar_mobile_open.png')
  }

  // Reset viewport
  await send('Emulation.clearDeviceMetricsOverride')
  await send('Page.navigate', { url: 'http://localhost:5174/' })
  await new Promise((r) => setTimeout(r, 500))

  console.log('\nConsole Errors:', consoleErrors.length ? consoleErrors : 'None')
  console.log('--- All Floating Navbar Verification Screenshots Captured! ---')
  ws.close()
}

run().catch((err) => {
  console.error('Navbar verification failed:', err)
  process.exit(1)
})
