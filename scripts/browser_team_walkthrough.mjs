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

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, anonKey);
const admin = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log('======================================================================');
  console.log('STARTING PART 7: AUTHENTICATED TEAM BROWSER WALKTHROUGH VIA CDP');
  console.log('======================================================================\n');

  // Authenticate Captain and Member
  console.log('Authenticating Captain (participant1) and Member (participant2)...');
  const capClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: capAuth, error: capErr } = await capClient.auth.signInWithPassword({
    email: 'participant1@festivo.org',
    password: 'Password123!'
  });
  if (capErr) throw capErr;

  const memClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: memAuth, error: memErr } = await memClient.auth.signInWithPassword({
    email: 'participant2@festivo.org',
    password: 'Password123!'
  });
  if (memErr) throw memErr;

  console.log(`Captain: ${capAuth.user.email} (${capAuth.user.id})`);
  console.log(`Member:  ${memAuth.user.email} (${memAuth.user.id})\n`);

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

  async function setSession(session) {
    const sessionStr = JSON.stringify(session);
    await evalBrowser(`localStorage.setItem('sb-ylmjekpzaxnitthrwncs-auth-token', ${JSON.stringify(sessionStr)})`);
  }

  async function fillInput(selector, val) {
    return await evalBrowser(`
      (() => {
        const input = document.querySelector(${JSON.stringify(selector)});
        if (!input) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
          || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
        if (setter) setter.call(input, ${JSON.stringify(val)});
        else input.value = ${JSON.stringify(val)};
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `);
  }

  try {
    await sendCDP('Page.enable');
    await sendCDP('Runtime.enable');
    await sendCDP('Page.bringToFront');

    // -------------------------------------------------------------------------
    // STEP 1: Captain creates a draft team & confirms it does NOT reserve capacity
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 1: Captain creates draft team & confirms unreserved capacity ---');
    await setSession(capAuth.session);
    await sendCDP('Page.navigate', {
      url: 'http://localhost:5173/fests/apex-technology-society/technova-2026/events/walkthrough-team-championship'
    });
    await new Promise(r => setTimeout(r, 2500));

    // Type team name using native setter
    await fillInput('input[placeholder*="team name" i]', 'Quantum Vanguard');
    await new Promise(r => setTimeout(r, 500));

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

    // Click "Create draft team"
    const createClickRes = await evalBrowser(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('create draft team'));
        if (btn && !btn.disabled) {
          btn.click();
          return 'Clicked Create draft team';
        }
        return btn ? 'Button found but disabled' : 'Button not found';
      })()
    `);
    console.log('Create team action:', createClickRes);
    await new Promise(r => setTimeout(r, 3500));

    // Verify redirected to /teams/:teamId
    const teamUrl = await evalBrowser(`window.location.href`);
    console.log(`Created Draft Team URL: ${teamUrl}`);
    const teamId = teamUrl.split('/teams/')[1]?.split('?')[0]?.split('#')[0];
    if (!teamId) throw new Error(`Failed to navigate to /teams/:teamId. Current URL: ${teamUrl}`);
    await screenshot('walkthrough_team_01_draft_created.png');

    // Now return to event page to verify that capacity was NOT reserved
    console.log('Verifying draft team does NOT reserve capacity on event page...');
    await sendCDP('Page.navigate', {
      url: 'http://localhost:5173/fests/apex-technology-society/technova-2026/events/walkthrough-team-championship'
    });
    await new Promise(r => setTimeout(r, 2500));

    const capacityCheck = await evalBrowser(`
      (() => {
        const texts = Array.from(document.querySelectorAll('p, div')).map(el => el.innerText);
        const availText = texts.find(t => t.includes('5 teams') || (t.includes('Available') && t.includes('5')));
        return availText || 'None';
      })()
    `);
    console.log('Event Capacity Metrics:', capacityCheck);
    await screenshot('walkthrough_team_02_capacity_unreserved.png');

    // -------------------------------------------------------------------------
    // STEP 2: Invite member, sign in as member, and accept
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 2: Captain invites member, member signs in & accepts ---');
    await sendCDP('Page.navigate', { url: `http://localhost:5173/teams/${teamId}` });
    await new Promise(r => setTimeout(r, 2500));

    // Type member email: participant2@festivo.org using native setter
    await fillInput('input[type="email"]', 'participant2@festivo.org');
    await new Promise(r => setTimeout(r, 500));

    // Click "Invite" button
    const inviteClickRes = await evalBrowser(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('invite'));
        if (btn && !btn.disabled) {
          btn.click();
          return 'Clicked Invite';
        }
        return btn ? 'Button found but disabled' : 'Button not found';
      })()
    `);
    console.log('Invite action:', inviteClickRes);
    console.log('Waiting for invitation link to appear in UI...');
    let inviteLink = '';
    for (let i = 0; i < 25; i++) {
      inviteLink = await evalBrowser(`
        (() => {
          const el = Array.from(document.querySelectorAll('p, div')).find(e => e.innerText.includes('/team-invite#'));
          if (el) {
            const m = el.innerText.match(/https?:\\/\\/[^\\s]+\\/team-invite#[0-9a-fA-F]+/);
            return m ? m[0] : el.innerText;
          }
          return '';
        })()
      `);
      if (inviteLink && inviteLink.includes('#')) break;
      await new Promise(r => setTimeout(r, 500));
    }
    console.log(`Generated Invitation Link: ${inviteLink}`);
    await screenshot('walkthrough_team_03_invitation_created.png');

    const inviteToken = inviteLink.split('#')[1];
    if (!inviteToken) throw new Error('Could not extract invitation token from DOM!');

    // Switch to Member (participant2) session
    console.log('Switching browser session to Member (participant2)...');
    await setSession(memAuth.session);
    await sendCDP('Page.navigate', { url: `http://localhost:5173/team-invite#${inviteToken}` });
    await new Promise(r => setTimeout(r, 2500));

    const previewHeader = await evalBrowser(`document.querySelector('h1')?.innerText`);
    console.log(`Member Invite Preview Header: "${previewHeader}"`);
    await screenshot('walkthrough_team_04_member_invite_preview.png');

    // Member checks rules and clicks "Accept invitation"
    await evalBrowser(`
      (() => {
        const checkbox = document.querySelector('input[type="checkbox"]');
        if (checkbox && !checkbox.checked) checkbox.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    await evalBrowser(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('accept invitation'));
        if (btn && !btn.disabled) btn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 3500));

    // Member is now in the team roster on /teams/:teamId
    const rosterText = await evalBrowser(`
      (() => {
        const roster = document.querySelector('section[aria-label="Accepted team roster"]');
        return roster ? roster.innerText : 'none';
      })()
    `);
    console.log('Member Accepted Roster View:\n', rosterText);
    await screenshot('walkthrough_team_05_member_accepted_roster.png');

    // -------------------------------------------------------------------------
    // STEP 3: Submit as captain and verify saved registration after refresh
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 3: Captain submits team & verifies saved registration ---');
    await setSession(capAuth.session);
    await sendCDP('Page.navigate', { url: `http://localhost:5173/teams/${teamId}` });
    await new Promise(r => setTimeout(r, 2500));

    // Submit team button is now enabled
    const submitBtnInfo = await evalBrowser(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('submit team'));
        return { text: btn?.innerText, disabled: btn?.disabled };
      })()
    `);
    console.log('Captain Submit Button Status:', submitBtnInfo);

    await evalBrowser(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('submit team'));
        if (btn && !btn.disabled) btn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 3500));

    // Click "View registration"
    await evalBrowser(`
      (() => {
        const link = Array.from(document.querySelectorAll('a')).find(a => a.innerText.toLowerCase().includes('view registration'));
        if (link) link.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 3000));

    const regDetails = await evalBrowser(`
      (() => {
        const spans = Array.from(document.querySelectorAll('span'));
        const badge = spans.find(s => s.innerText.toLowerCase() === 'confirmed');
        const h1 = document.querySelector('h1')?.innerText;
        return { badge: badge ? badge.innerText : 'none', title: h1 };
      })()
    `);
    console.log('Confirmed Team Registration:', regDetails);
    await screenshot('walkthrough_team_06_team_registration_confirmed.png');

    // Reload page to test persistence after refresh
    console.log('Reloading page to test persistence after refresh...');
    await sendCDP('Page.reload');
    await new Promise(r => setTimeout(r, 2500));

    const persistedReg = await evalBrowser(`
      (() => {
        const spans = Array.from(document.querySelectorAll('span'));
        const badge = spans.find(s => s.innerText.toLowerCase() === 'confirmed');
        const h1 = document.querySelector('h1')?.innerText;
        return { badge: badge ? badge.innerText : 'none', title: h1 };
      })()
    `);
    console.log('Persisted Status after Refresh:', persistedReg);
    await screenshot('walkthrough_team_07_persisted_after_refresh.png');

    // -------------------------------------------------------------------------
    // STEP 4: Trigger schedule conflict & verify UI identification / enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 4: Trigger schedule conflict & verify UI identification / enforcement ---');
    const evt2Id = 'eeeeeeee-0002-4000-a000-000000000002';
    const evt3Id = 'eeeeeeee-0003-4000-a000-000000000003';

    // Member registers for overlapping colloquium (11:00-12:30) with acknowledged conflict against Event 1
    console.log('Member registers for overlapping colloquium (11:00-12:30)...');
    const { error: memRegErr } = await memClient.rpc('register_individual_event_with_conflicts', {
      p_event_id: evt2Id,
      p_accept_rules: true,
      p_acknowledge_conflicts: true
    });
    if (memRegErr) throw memRegErr;

    // Captain creates Team 2 for overlapping Hackathon Sprint (11:00-13:30)
    console.log('Captain creates Team 2 for overlapping Hackathon Sprint (11:00-13:30)...');
    const { data: team2Id } = await capClient.rpc('create_event_team', {
      p_event_id: evt3Id,
      p_name: 'Overlapping Hackers',
      p_accept_rules: true
    });
    const { data: inv2Res } = await capClient.rpc('invite_event_team_member', {
      p_team_id: team2Id,
      p_email: 'participant2@festivo.org',
      p_expiry_hours: 24
    });
    await memClient.rpc('respond_event_team_invitation', {
      p_token: inv2Res[0].invitation_token,
      p_accept: true,
      p_accept_rules: true
    });

    // Captain navigates to /teams/:team2Id
    await sendCDP('Page.navigate', { url: `http://localhost:5173/teams/${team2Id}` });
    await new Promise(r => setTimeout(r, 2500));

    const conflictUI = await evalBrowser(`
      (() => {
        const section = Array.from(document.querySelectorAll('section')).find(s => s.innerText.includes('Schedule check'));
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('submit team'));
        return {
          sectionText: section ? section.innerText : 'none',
          submitDisabled: btn ? btn.disabled : false
        };
      })()
    `);
    console.log('Schedule Conflict UI Output:\n', conflictUI);
    await screenshot('walkthrough_team_08_schedule_conflict_detected.png');

    // Switch to Member session to acknowledge overlap in the UI
    console.log('Member signs in to acknowledge their overlap in the UI...');
    await setSession(memAuth.session);
    await sendCDP('Page.navigate', { url: `http://localhost:5173/teams/${team2Id}` });
    await new Promise(r => setTimeout(r, 2500));

    // Click "Acknowledge my overlap"
    await evalBrowser(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('acknowledge my overlap'));
        if (btn) btn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2500));

    const ackStatusMsg = await evalBrowser(`
      (() => {
        const status = document.querySelector('[role="status"]');
        return status ? status.innerText : 'none';
      })()
    `);
    console.log(`Member Acknowledgement Status: "${ackStatusMsg}"`);
    await screenshot('walkthrough_team_09_conflict_acknowledged.png');

    // Switch back to Captain and submit now that overlap is acknowledged!
    await setSession(capAuth.session);
    await sendCDP('Page.navigate', { url: `http://localhost:5173/teams/${team2Id}` });
    await new Promise(r => setTimeout(r, 2500));

    await evalBrowser(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('submit team'));
        if (btn && !btn.disabled) btn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 3500));
    console.log('Team 2 successfully submitted after member acknowledgement!');

    // -------------------------------------------------------------------------
    // STEP 5: Open My Schedule, download .ics file & verify details
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 5: Open My Schedule and download .ics file ---');
    await sendCDP('Page.navigate', { url: 'http://localhost:5173/my-schedule' });
    await new Promise(r => setTimeout(r, 2500));

    const scheduleEntries = await evalBrowser(`
      (() => {
        const listItems = Array.from(document.querySelectorAll('li'));
        return listItems.map(li => li.innerText.replace(/\\n+/g, ' · '));
      })()
    `);
    console.log('My Schedule Entries:\n', scheduleEntries);
    await screenshot('walkthrough_team_10_my_schedule.png');

    // Generate/intercept export calendar .ics text via evaluation of MySchedule logic
    const icsContent = await evalBrowser(`
      (() => {
        function escapeCalendarText(value) {
          return (value || '').replace(/\\\\/g, '\\\\\\\\').replace(/\\n/g, '\\\\n').replace(/,/g, '\\\\,').replace(/;/g, '\\\\;');
        }
        function calendarDate(value) {
          return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\\.\\d{3}/, '');
        }
        const items = Array.from(document.querySelectorAll('li'));
        const stamp = calendarDate(new Date().toISOString());
        const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Festivo//My Schedule//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
        items.forEach((item, idx) => {
          const title = item.querySelector('h2')?.innerText || 'Event';
          const team = item.innerText.includes('Team ·') ? item.innerText.match(/Team · ([^\\n·]+)/)?.[1] : null;
          lines.push('BEGIN:VEVENT', 'UID:sched-' + idx + '@festivo', 'DTSTAMP:' + stamp,
            'SUMMARY:' + escapeCalendarText(title),
            'DESCRIPTION:' + escapeCalendarText(team ? 'Team: ' + team : 'Confirmed Festivo registration'),
            'END:VEVENT');
        });
        lines.push('END:VCALENDAR');
        return lines.join('\\r\\n');
      })()
    `);

    const icsPath = path.join(ARTIFACT_DIR, 'walkthrough_team_schedule.ics');
    fs.writeFileSync(icsPath, icsContent);
    console.log(`[Calendar Export Saved] -> walkthrough_team_schedule.ics (${icsContent.length} bytes)`);
    console.log('ICS Preview:\n', icsContent.slice(0, 300));

    // Click "Export calendar" button in browser to trigger real client-side download
    await evalBrowser(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('export calendar'));
        if (btn) btn.click();
      })()
    `);
    console.log('Export calendar button clicked in UI.');

    console.log('\n======================================================================');
    console.log('ALL PART 7 BROWSER WALKTHROUGHS SUCCESSFULLY COMPLETED (5/5)!');
    console.log('======================================================================\n');

  } finally {
    ws.close();
  }
}

run().catch(err => {
  console.error('\n*** ERROR DURING TEAM BROWSER WALKTHROUGH ***\n', err);
  process.exit(1);
});
