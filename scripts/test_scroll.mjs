async function run() {
  const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json()
  const page = targets.find((t) => t.type === 'page' && !t.url.startsWith('chrome://'))
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 1
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const curId = id++
      const handler = (e) => {
        const msg = JSON.parse(e.data)
        if (msg.id === curId) {
          ws.removeEventListener('message', handler)
          resolve(msg.result)
        }
      }
      ws.addEventListener('message', handler)
      ws.send(JSON.stringify({ id: curId, method, params }))
    })
  }
  await send('Runtime.evaluate', {
    expression: 'window.scrollTo(0, 400)',
    returnByValue: true,
  })
  await new Promise((r) => setTimeout(r, 400))
  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const header = document.querySelector('header');
      const r = header ? header.getBoundingClientRect() : null;
      return {
        scrollY: window.scrollY,
        headerRect: r ? { top: r.top, bottom: r.bottom, height: r.height } : null,
        headerComputedPosition: window.getComputedStyle(header).position,
        headerComputedTop: window.getComputedStyle(header).top
      };
    })()`,
    returnByValue: true,
  })
  console.log(JSON.stringify(res.result.value, null, 2))
  ws.close()
}
run()
