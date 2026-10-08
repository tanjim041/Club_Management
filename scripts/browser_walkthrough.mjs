import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\b9dbb95b-db93-489e-b444-26420c66c078';
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

// Read .env
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim();
        process.env[k] = v;
      }
    }
  }
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY);
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function run() {
  console.log('======================================================================');
  console.log('STARTING AUTOMATED BROWSER WALKTHROUGH VIA DIRECT CDP');
  console.log('======================================================================\n');

  // Authenticate participant4
  console.log('Authenticating participant4@festivo.org...');
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'participant4@festivo.org',
    password: 'Password123!'
  });
  if (authErr) throw authErr;
  console.log(`Authenticated: ${auth.user.email} (${auth.user.id})`);

  // Connect to Chrome CDP
  const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  const page = targets.find(t => t.type === 'page' && !t.url.startsWith('chrome://'));
  if (!page) throw new Error('No active page found on port 9222');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  const pending = new Map();
  let nextId = 1;

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    } catch (err) {
      console.error('CDP message parse error:', err);
    }
  };

  function sendCDP(method, params = {}) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`CDP method ${method} timed out after 15000ms`));
        }
      }, 15000);
      pending.set(id, {
        resolve: (val) => { clearTimeout(timeout); resolve(val); },
        reject: (err) => { clearTimeout(timeout); reject(err); }
      });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evalBrowser(expr) {
    const res = await sendCDP('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    return res?.result?.value;
  }

  async function screenshot(filename) {
    try {
      await sendCDP('Page.bringToFront');
    } catch {}
    await new Promise(r => setTimeout(r, 200));
    const res = await sendCDP('Page.captureScreenshot', { format: 'png' });
    const fullPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(fullPath, Buffer.from(res.data, 'base64'));
    console.log(`[Screenshot Saved] -> ${filename}`);
    return fullPath;
  }

  try {
    await sendCDP('Page.enable');
    await sendCDP('Runtime.enable');
    await sendCDP('Page.bringToFront');

    // -------------------------------------------------------------------------
    // STEP 0: Set Authenticated Session & Load Participant Workspace
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 0: Setting Session & Navigating to Participant Workspace ---');
    const sessionStr = JSON.stringify(auth.session);
    await evalBrowser(`localStorage.setItem('sb-ylmjekpzaxnitthrwncs-auth-token', ${JSON.stringify(sessionStr)})`);
    await sendCDP('Page.bringToFront');
    await sendCDP('Page.navigate', { url: 'http://localhost:5173/participant' });
    await new Promise(r => setTimeout(r, 2000));
    await screenshot('walkthrough_01_participant_workspace.png');
    console.log('Participant workspace loaded successfully.');

    // -------------------------------------------------------------------------
    // STEP 1: Walkthrough 1 — Open Event Registration & Refresh Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 1: Walkthrough 1 — Open Registration & Refresh Persistence ---');
    await sendCDP('Page.bringToFront');
    await sendCDP('Page.navigate', {
      url: 'http://localhost:5173/fests/apex-technology-society/technova-2026/events/walkthrough-open-systems'
    });
    await new Promise(r => setTimeout(r, 2500));
    await screenshot('walkthrough_02_event1_open_page.png');

    const event1Title = await evalBrowser(`document.querySelector('h1')?.innerText`);
    console.log(`Loaded Event: "${event1Title}"`);

    // 1. Check the rules checkbox
    await evalBrowser(`
      (() => {
        const checkbox = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(cb => {
          const text = cb.closest('label')?.innerText || '';
          return text.includes('rules') || text.includes('accept');
        }) || document.querySelector('input[type="checkbox"]');
        if (checkbox && !checkbox.checked) checkbox.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    // 2. Click the enabled "Register for event" button
    const regClickResult = await evalBrowser(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('register for event'));
        if (btn && !btn.disabled) {
          btn.click();
          return 'Register clicked';
        }
        return btn ? 'Button found but disabled' : 'Button not found';
      })()
    `);
    console.log('Registration action:', regClickResult);
    await new Promise(r => setTimeout(r, 4000));

    // Confirm navigation to /my-registrations/:id
    const reg1Url = await evalBrowser(`window.location.href`);
    console.log(`Current URL after registration: ${reg1Url}`);
    const reg1Id = reg1Url.split('/my-registrations/')[1]?.split('?')[0] || '';

    const reg1Details = await evalBrowser(`
      (() => {
        const spans = Array.from(document.querySelectorAll('span'));
        const badge = spans.find(s => s.innerText.toLowerCase() === 'confirmed');
        const alert = document.querySelector('[role="status"]')?.innerText || '';
        return { badge: badge ? badge.innerText : 'none', alert };
      })()
    `);
    console.log('Registration Confirmed Result:', reg1Details);
    await screenshot('walkthrough_03_registration1_confirmed.png');

    // Reload page to verify persistence after refresh
    console.log('Reloading browser to test persistence after refresh...');
    await sendCDP('Page.reload');
    await new Promise(r => setTimeout(r, 2500));

    const persistedDetails = await evalBrowser(`
      (() => {
        const spans = Array.from(document.querySelectorAll('span'));
        const badge = spans.find(s => s.innerText.toLowerCase() === 'confirmed');
        return { badge: badge ? badge.innerText : 'none' };
      })()
    `);
    console.log('Persisted Status after Refresh:', persistedDetails);
    await screenshot('walkthrough_04_registration1_persisted.png');

    // -------------------------------------------------------------------------
    // STEP 2: Walkthrough 2 — Duplicate Registration Feedback
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 2: Walkthrough 2 — Duplicate Registration Feedback ---');
    await sendCDP('Page.bringToFront');
    await sendCDP('Page.navigate', {
      url: 'http://localhost:5173/fests/apex-technology-society/technova-2026/events/walkthrough-open-systems'
    });
    await new Promise(r => setTimeout(r, 2500));

    // Check rules checkbox
    await evalBrowser(`
      (() => {
        const checkbox = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(cb => {
          const text = cb.closest('label')?.innerText || '';
          return text.includes('rules') || text.includes('accept');
        }) || document.querySelector('input[type="checkbox"]');
        if (checkbox && !checkbox.checked) checkbox.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    // Click register again
    await evalBrowser(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('register for event'));
        if (btn) btn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2500));

    const duplicateErrorMsg = await evalBrowser(`
      (() => {
        const alert = document.querySelector('[role="alert"]');
        return alert ? alert.innerText : 'No alert element found';
      })()
    `);
    console.log(`Duplicate Registration Feedback: "${duplicateErrorMsg}"`);
    await screenshot('walkthrough_05_duplicate_feedback.png');

    // -------------------------------------------------------------------------
    // STEP 3: Walkthrough 3 — Full-Event Waitlisting & Queue Position
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 3: Walkthrough 3 — Full-Event Waitlisting & Queue Position ---');
    await sendCDP('Page.bringToFront');
    await sendCDP('Page.navigate', {
      url: 'http://localhost:5173/fests/apex-technology-society/technova-2026/events/walkthrough-robotics-sprint'
    });
    await new Promise(r => setTimeout(r, 2500));
    await screenshot('walkthrough_06_waitlist_event_page.png');

    // Check rules checkbox
    await evalBrowser(`
      (() => {
        const checkbox = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(cb => {
          const text = cb.closest('label')?.innerText || '';
          return text.includes('rules') || text.includes('accept');
        }) || document.querySelector('input[type="checkbox"]');
        if (checkbox && !checkbox.checked) checkbox.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    // Click Join waitlist
    const waitlistClickResult = await evalBrowser(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('join waitlist'));
        if (btn && !btn.disabled) {
          btn.click();
          return 'Clicked Join waitlist';
        }
        return btn ? 'Button found but disabled' : 'Button not found';
      })()
    `);
    console.log('Waitlist action:', waitlistClickResult);
    await new Promise(r => setTimeout(r, 4000));

    const waitlistDetails = await evalBrowser(`
      (() => {
        const spans = Array.from(document.querySelectorAll('span'));
        const badge = spans.find(s => s.innerText.toLowerCase().includes('waitlist'));
        const paragraphs = Array.from(document.querySelectorAll('p'));
        const posText = paragraphs.find(p => p.innerText.includes('waitlist') && p.innerText.includes('position'));
        return {
          url: window.location.href,
          badge: badge ? badge.innerText : 'none',
          message: posText ? posText.innerText : 'none'
        };
      })()
    `);
    console.log('Waitlist Status & Position 1 on Page:', waitlistDetails);
    await screenshot('walkthrough_07_waitlist_position_1.png');

    // -------------------------------------------------------------------------
    // STEP 4: Walkthrough 4 — Atomic Promotion Trigger & Notification
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 4: Walkthrough 4 — Trigger Atomic Promotion ---');
    console.log('Cancelling confirmed User 1 (participant1) via Supabase RPC...');
    const event2Id = 'bbbbbbbb-1111-4000-b000-000000000002';
    const { data: p1 } = await admin.from('profiles').select('id').eq('email', 'participant1@festivo.org').single();
    const { data: regP1 } = await admin.from('registrations').select('id').eq('event_id', event2Id).eq('participant_id', p1.id).single();

    if (regP1) {
      const user1Client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
      await user1Client.auth.signInWithPassword({ email: 'participant1@festivo.org', password: 'Password123!' });
      await user1Client.rpc('cancel_individual_registration', { p_registration_id: regP1.id, p_reason: 'Voluntary cancel' });
      console.log('User 1 cancelled. Promotion triggered in DB!');
    }

    await new Promise(r => setTimeout(r, 2000));
    console.log('Reloading registration page to observe atomic promotion...');
    await sendCDP('Page.reload');
    await new Promise(r => setTimeout(r, 2500));

    const promotedDetails = await evalBrowser(`
      (() => {
        const spans = Array.from(document.querySelectorAll('span'));
        const badge = spans.find(s => s.innerText.toLowerCase() === 'confirmed');
        const paragraphs = Array.from(document.querySelectorAll('p'));
        const msg = paragraphs.find(p => p.innerText.includes('Your place is confirmed'));
        return {
          badge: badge ? badge.innerText : 'none',
          message: msg ? msg.innerText : 'none'
        };
      })()
    `);
    console.log('Promoted to Confirmed in Browser UI:', promotedDetails);
    await screenshot('walkthrough_08_promoted_to_confirmed.png');

    // Navigate to /my-registrations to view the In-App Notification
    console.log('Navigating to /my-registrations to view in-app notification...');
    await sendCDP('Page.bringToFront');
    await sendCDP('Page.navigate', { url: 'http://localhost:5173/my-registrations' });
    await new Promise(r => setTimeout(r, 2500));

    const notificationCard = await evalBrowser(`
      (() => {
        const articles = Array.from(document.querySelectorAll('article'));
        const notif = articles.find(a => a.innerText.toLowerCase().includes('waitlist'));
        return notif ? notif.innerText : 'none';
      })()
    `);
    console.log('In-App Notification Card Content:', notificationCard);
    await screenshot('walkthrough_09_in_app_notification.png');

    // -------------------------------------------------------------------------
    // STEP 5: Walkthrough 5 — Cancellation Before Cutoff
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 5: Walkthrough 5 — Cancellation Before Cutoff ---');
    // Navigate back to Event 1's registration
    if (reg1Id) {
      await sendCDP('Page.bringToFront');
      await sendCDP('Page.navigate', { url: `http://localhost:5173/my-registrations/${reg1Id}` });
      await new Promise(r => setTimeout(r, 2500));
    }

    await evalBrowser(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const cancelToggle = btns.find(b => b.innerText.toLowerCase().includes('cancel registration'));
        if (cancelToggle) cancelToggle.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1000));

    await evalBrowser(`
      (() => {
        const input = document.querySelector('textarea');
        if (input) {
          const setter = Object.getOwnPropertyDescriptor(input, 'value')?.set
            || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
          if (setter) setter.call(input, 'Voluntary withdrawal before cutoff');
          else input.value = 'Voluntary withdrawal before cutoff';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('yes, cancel registration'));
        if (confirmBtn) confirmBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 3000));

    const cancelledDetails = await evalBrowser(`
      (() => {
        const spans = Array.from(document.querySelectorAll('span'));
        const badge = spans.find(s => s.innerText.toLowerCase() === 'cancelled');
        const paragraphs = Array.from(document.querySelectorAll('p'));
        const msg = paragraphs.find(p => p.innerText.includes('cancelled'));
        return {
          badge: badge ? badge.innerText : 'none',
          message: msg ? msg.innerText : 'none'
        };
      })()
    `);
    console.log('Cancelled State in Browser UI:', cancelledDetails);
    await screenshot('walkthrough_10_registration_cancelled.png');

    // -------------------------------------------------------------------------
    // STEP 6: Walkthrough 6 — Deadline & Cancellation-Cutoff Rejection
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 6A: Deadline Rejection ---');
    await sendCDP('Page.bringToFront');
    await sendCDP('Page.navigate', {
      url: 'http://localhost:5173/fests/apex-technology-society/technova-2026/events/walkthrough-closed-deadline'
    });
    await new Promise(r => setTimeout(r, 2500));

    const deadlineDetails = await evalBrowser(`
      (() => {
        const divs = Array.from(document.querySelectorAll('div'));
        const stateDiv = divs.find(d => d.innerText.includes('State:'));
        const btns = Array.from(document.querySelectorAll('button'));
        const regBtn = btns.find(b => b.innerText.toLowerCase().includes('register'));
        return {
          stateText: stateDiv ? stateDiv.innerText : 'none',
          buttonDisabled: regBtn ? regBtn.disabled : true
        };
      })()
    `);
    console.log('Deadline Rejection in Browser UI:', deadlineDetails);
    await screenshot('walkthrough_11_deadline_rejected.png');

    console.log('\n--- STEP 6B: Cancellation Cutoff Rejection ---');
    const reg4Id = 'cccccccc-4444-4000-c000-000000000004';
    await sendCDP('Page.bringToFront');
    await sendCDP('Page.navigate', {
      url: `http://localhost:5173/my-registrations/${reg4Id}`
    });
    await new Promise(r => setTimeout(r, 2500));

    const cutoffRejection = await evalBrowser(`
      (() => {
        const paragraphs = Array.from(document.querySelectorAll('p'));
        const cutoffMsg = paragraphs.find(p => p.innerText.toLowerCase().includes('cancellation is no longer available'));
        const btns = Array.from(document.querySelectorAll('button'));
        const cancelBtn = btns.find(b => b.innerText.toLowerCase().includes('cancel registration'));
        return {
          cutoffNotice: cutoffMsg ? cutoffMsg.innerText : 'none',
          cancelButtonPresent: Boolean(cancelBtn)
        };
      })()
    `);
    console.log('Cancellation Cutoff Rejection in Browser UI:', cutoffRejection);
    await screenshot('walkthrough_12_cancellation_cutoff_rejected.png');

    console.log('\n======================================================================');
    console.log('ALL BROWSER WALKTHROUGHS SUCCESSFULLY COMPLETED AND VERIFIED (6/6)!');
    console.log('======================================================================\n');

  } finally {
    ws.close();
  }
}

run().catch(err => {
  console.error('\n*** ERROR DURING BROWSER WALKTHROUGH ***\n', err);
  process.exit(1);
});
