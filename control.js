// Control: the owner's view of every installation (POS, SPX, …), from the Control service.
//
// Sign-in is a passkey on this device (WebAuthn): the ceremony runs here, Control only makes the options and
// checks the answer. The session is a bearer token kept in sessionStorage (this tab only, gone when it closes),
// never the signing key: that stays in index.html's code and never goes near the network.
//
// CONTROL_URL is fixed here, and it is the only other address the page's Content-Security-Policy lets it
// talk to (connect-src). No address for this host: the card stays hidden.
'use strict';

(() => {
  const CONTROL_URL = ({ localhost: 'http://localhost:5070' })[location.hostname] ?? null;
  if (!CONTROL_URL || !window.PublicKeyCredential) return;

  const el = (id) => document.getElementById(id);
  const card = el('controlCard');
  card.hidden = false;

  // ---------- small helpers ----------
  const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const fromB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  const node = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) n.append(kid);
    return n;
  };
  const message = (target, text, kind = 'bad') => { target.replaceChildren(); if (text) target.append(node('div', { class: `msg ${kind}` }, text)); };

  const session = {
    get() { try { const s = JSON.parse(sessionStorage.getItem('control.session') || 'null'); return s && Date.parse(s.expiresAt) > Date.now() ? s : null; } catch { return null; } },
    set(s) { try { sessionStorage.setItem('control.session', JSON.stringify(s)); } catch { /* private mode: this page only */ } memory = s; },
    clear() { try { sessionStorage.removeItem('control.session'); } catch { /* nothing kept */ } memory = null; },
  };
  let memory = session.get();

  async function api(method, path, body) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (memory) headers.Authorization = `Bearer ${memory.token}`;
    let res;
    try {
      res = await fetch(CONTROL_URL + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
    } catch {
      throw new Error('Control can\'t be reached. Check the internet connection.');
    }
    const json = res.status === 204 ? null : await res.json().catch(() => null);
    if (res.status === 401 && path.startsWith('/owner/') && !path.startsWith('/owner/auth/')) { session.clear(); render(); }
    if (!res.ok) throw new Error(json?.error?.message || `Control answered ${res.status}.`);
    return json;
  }

  // ---------- passkeys (WebAuthn, without a library) ----------
  function creationOptions(o) {
    return {
      ...o,
      challenge: fromB64u(o.challenge),
      user: { ...o.user, id: fromB64u(o.user.id) },
      excludeCredentials: (o.excludeCredentials || []).map((c) => ({ ...c, id: fromB64u(c.id) })),
    };
  }
  function requestOptions(o) {
    return { ...o, challenge: fromB64u(o.challenge), allowCredentials: (o.allowCredentials || []).map((c) => ({ ...c, id: fromB64u(c.id) })) };
  }
  const credentialJSON = (cred) => {
    const r = cred.response;
    const response = r.attestationObject
      ? { clientDataJSON: b64u(r.clientDataJSON), attestationObject: b64u(r.attestationObject), transports: r.getTransports ? r.getTransports() : undefined }
      : { clientDataJSON: b64u(r.clientDataJSON), authenticatorData: b64u(r.authenticatorData), signature: b64u(r.signature), userHandle: r.userHandle ? b64u(r.userHandle) : undefined };
    return { id: cred.id, rawId: b64u(cred.rawId), type: cred.type, response, clientExtensionResults: cred.getClientExtensionResults(), authenticatorAttachment: cred.authenticatorAttachment ?? undefined };
  };

  async function setUp(setupCode, name) {
    const { options, challengeToken } = await api('POST', '/owner/auth/register/options', { setupCode });
    const cred = await navigator.credentials.create({ publicKey: creationOptions(options) });
    const done = await api('POST', '/owner/auth/register/verify', { setupCode, challengeToken, name, response: credentialJSON(cred) });
    if (done.token) session.set({ token: done.token, expiresAt: done.expiresAt });
  }

  async function signIn() {
    const { options, challengeToken } = await api('POST', '/owner/auth/login/options', {});
    const cred = await navigator.credentials.get({ publicKey: requestOptions(options) });
    const done = await api('POST', '/owner/auth/login/verify', { challengeToken, response: credentialJSON(cred) });
    session.set({ token: done.token, expiresAt: done.expiresAt });
  }

  // ---------- what the owner sees ----------
  const ALERTS = {
    silent: 'No check-in for 2+ days',
    license_locked: 'Locked: no valid license',
    license_ending: 'License ending',
    backup_old: 'No backup in 2+ days',
    disk_low: 'Disk almost full',
    moved: 'Moved to another computer',
    clone_suspected: 'Running on 2 computers?',
  };
  const ago = (iso) => {
    if (!iso) return 'never';
    const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
    if (mins < 2) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 36) return `${hours} h ago`;
    return `${Math.round(hours / 24)} days ago`;
  };
  const day = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
  const gb = (bytes) => (bytes == null ? '—' : `${(bytes / 1024 ** 3).toFixed(1)} GB`);
  const mb = (bytes) => (bytes == null ? '—' : `${(bytes / 1024 ** 2).toFixed(0)} MB`);
  const nameOf = (i) => i.label || i.customer || i.installationId || i.id;
  const alertText = (a, i) => (a === 'license_ending' && i.license?.daysLeft != null ? `License ends in ${i.license.daysLeft} day${i.license.daysLeft === 1 ? '' : 's'}` : ALERTS[a] || a);

  let installs = [];
  let open = null;

  async function load() {
    message(el('controlMsg'), '');
    try {
      installs = await api('GET', '/owner/installations');
    } catch (e) {
      message(el('controlMsg'), e.message);
    }
    renderList();
  }

  function render() {
    const signedIn = !!memory;
    el('controlSignedOut').hidden = signedIn;
    el('controlSignedIn').hidden = !signedIn;
    if (signedIn) load();
    else api('GET', '/owner/auth/status').then((s) => { el('controlSetup').hidden = s.hasPasskey; el('controlSignInBtn').hidden = !s.hasPasskey; }).catch((e) => message(el('controlAuthMsg'), e.message));
  }

  function renderList() {
    const list = el('controlList');
    list.replaceChildren();
    const needs = installs.filter((i) => i.status !== 'ignored' && (i.alerts.length || i.status === 'new')).length;
    el('controlSummary').textContent = installs.length
      ? `${installs.length} installation${installs.length === 1 ? '' : 's'}${needs ? ` · ${needs} to look at` : ' · all fine'}`
      : 'No installation has checked in yet.';
    for (const i of installs) list.append(row(i));
  }

  function row(i) {
    const tags = [
      i.status === 'new' && node('span', { class: 'tag' }, 'NEW'),
      i.status === 'ignored' && node('span', { class: 'tag' }, 'IGNORED'),
      node('span', { class: 'tag' }, i.product.name),
    ];
    const li = node('li', { class: i.status === 'ignored' ? 'old' : '' },
      node('div', { class: 'who' }, tags, nameOf(i)),
      node('div', { class: 'meta' }, `${i.version ?? '?'} · ${i.kind ?? '?'} · seen ${ago(i.lastSeenAt)}`),
      node('div', { class: 'acts' }, node('button', { class: 'small', onclick: () => { open = open === i.id ? null : i.id; renderList(); } }, open === i.id ? 'Close' : 'Open')),
    );
    if (i.alerts.length && i.status !== 'ignored') {
      li.append(node('div', { class: 'alerts' }, i.alerts.map((a) => node('span', { class: `alert ${a === 'license_ending' || a === 'backup_old' ? 'warn' : 'bad'}` }, alertText(a, i)))));
    }
    if (open === i.id) li.append(detail(i));
    return li;
  }

  function detail(i) {
    const out = node('div', { class: 'detail' });
    const facts = node('dl', { class: 'facts' });
    const fact = (k, v, mono) => facts.append(node('dt', {}, k), node('dd', { class: mono ? 'mono' : '' }, v ?? '—'));
    fact('Installation ID', i.installationId, true);
    if (i.movedFrom) fact('Before that', `${i.movedFrom} (${day(i.movedAt)})`, true);
    fact('Licensed to', i.customer);
    fact('License', i.license ? `${i.license.state}${i.license.plan ? ` · ${i.license.plan}` : ''}${i.license.expiresAt ? ` · ends ${day(i.license.expiresAt)}` : ''}` : null);
    fact('Newest backup', i.backup ? (i.backup.lastAt ? `${ago(i.backup.lastAt)} (${i.backup.count} kept${i.backup.encrypted ? ', encrypted' : ''})` : 'none') : 'handled outside the app');
    fact('Free disk', i.disk ? `${gb(i.disk.freeBytes)} of ${gb(i.disk.totalBytes)}` : null);
    fact('Database', mb(i.databaseBytes));
    fact('Enrolled', day(i.enrolledAt));
    out.append(facts);

    const label = node('input', { value: i.label ?? '', placeholder: 'e.g. Juan\'s Hardware', maxlength: '80', autocomplete: 'off' });
    const msg = node('div');
    const save = async (body) => {
      try {
        const updated = await api('PATCH', `/owner/installations/${encodeURIComponent(i.id)}`, body);
        installs = installs.map((x) => (x.id === i.id ? updated : x));
        renderList();
      } catch (e) { message(msg, e.message); }
    };
    out.append(
      node('div', {}, node('label', {}, 'Your name for it'), label),
      node('div', { class: 'row' },
        node('button', { onclick: () => save({ label: label.value, ...(i.status === 'new' ? { status: 'active' } : {}) }) }, i.status === 'new' ? 'Save and accept' : 'Save name'),
        i.status === 'ignored'
          ? node('button', { onclick: () => save({ status: 'active' }) }, 'Stop ignoring')
          : node('button', { onclick: () => save({ status: 'ignored' }) }, 'Ignore'),
      ),
      i.installationId && node('button', { onclick: () => prefill(i) }, 'Make a key for it'),
      msg,
    );
    return out;
  }

  /** Fills "Make a license" (index.html) with this installation's app, Installation ID and customer. */
  function prefill(i) {
    const makeCard = el('makeCard');
    if (makeCard.hidden) { message(el('controlMsg'), 'Unlock the signing key first (above), then tap Make a key again.', 'warn'); el('controlMsg').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    const product = i.product.id === 'pos' ? 'POS' : 'SPX';
    window.setProduct(product);
    el('iid').value = i.installationId;
    el('cust').value = i.customer || i.label || '';
    makeCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- wiring ----------
  el('controlSignInBtn').addEventListener('click', async () => {
    message(el('controlAuthMsg'), '');
    try { await signIn(); render(); } catch (e) { message(el('controlAuthMsg'), e.name === 'NotAllowedError' ? 'Sign-in was cancelled.' : e.message); }
  });
  el('controlSetupBtn').addEventListener('click', async () => {
    message(el('controlAuthMsg'), '');
    const code = el('controlSetupCode').value.trim();
    if (!code) { message(el('controlAuthMsg'), 'Type the setup code.'); return; }
    try {
      await setUp(code, el('controlDeviceName').value.trim() || 'Phone');
      if (!memory) await signIn();
      render();
    } catch (e) { message(el('controlAuthMsg'), e.name === 'NotAllowedError' ? 'Setting up the passkey was cancelled.' : e.message); }
  });
  el('controlRefreshBtn').addEventListener('click', load);
  el('controlSignOutBtn').addEventListener('click', async () => {
    try { await api('POST', '/owner/auth/logout'); } catch { /* signed out here anyway */ }
    session.clear();
    render();
  });

  render();
})();
