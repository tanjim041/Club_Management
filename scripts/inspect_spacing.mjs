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
  await send('Page.navigate', { url: 'http://localhost:5174/' })
  await new Promise((r) => setTimeout(r, 1500))
  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      window.history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      const inspect = (el) => {
        if (!el) return null;
        const cs = window.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          id: el.id,
          class: el.className,
          rect: { top: r.top, bottom: r.bottom, height: r.height, y: r.y },
          paddingTop: cs.paddingTop,
          paddingBottom: cs.paddingBottom,
          marginTop: cs.marginTop,
          marginBottom: cs.marginBottom
        };
      };
      const header = document.querySelector('header');
      const navbar = document.querySelector('.floating-navbar');
      const main = document.querySelector('main');
      const landingDiv = main ? main.firstElementChild : null;
      const hero = document.querySelector('section[aria-labelledby="hero-title"]') || document.querySelector('section');
      const heroKicker = document.querySelector('.font-mono.text-xs');
      const heroTitle = document.querySelector('#hero-title');
      const card = document.querySelector('div[aria-label="Campus event highlights"]');
      return {
        header: inspect(header),
        navbar: inspect(navbar),
        main: inspect(main),
        landingDiv: inspect(landingDiv),
        hero: inspect(hero),
        heroKicker: inspect(heroKicker),
        heroTitle: inspect(heroTitle),
        card: inspect(card),
        gapBetweenNavbarAndHeroKicker: heroKicker && navbar ? heroKicker.getBoundingClientRect().top - navbar.getBoundingClientRect().bottom : null,
        gapBetweenNavbarAndCard: card && navbar ? card.getBoundingClientRect().top - navbar.getBoundingClientRect().bottom : null
      };
    })()`,
    returnByValue: true,
  })
  console.log(JSON.stringify(res.result.value, null, 2))
  ws.close()
}
run()
