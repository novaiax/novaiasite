/**
 * Cloudflare Worker entry — novaia-site
 *
 * Handles dynamic routes (TikTok OAuth callback, etc.)
 * then falls back to static assets serving via env.ASSETS binding.
 */

import { handleJournal } from './server/journal.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const legacyDestinations = {
      '/novaia': '/parcours/',
      '/novaia.html': '/parcours/',
      '/novamemory': '/projets/novamemory/',
      '/novamemory.html': '/projets/novamemory/',
    };
    if (legacyDestinations[url.pathname]) {
      return new Response(null, {status:301,headers:{Location:legacyDestinations[url.pathname] + url.search}});
    }

    const journal = await handleJournal(request, env);
    if (journal) return journal;

    // ───────── Dynamic routes ─────────
    if (url.pathname === "/tiktok/callback") {
      return handleTikTokCallback(url);
    }

    // ───────── Fallback to static assets ─────────
    return env.ASSETS.fetch(request);
  },
};


// ─── TikTok OAuth callback handler ──────────────────────────────────
function handleTikTokCallback(url) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const scopes = url.searchParams.get("scopes");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TikTok OAuth — Yann.wtz Studio</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0a0a0a;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      padding: 40px;
      max-width: 600px;
      width: 100%;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .status-success { background: rgba(37, 244, 238, 0.1); color: #25F4EE; }
    .status-error { background: rgba(254, 44, 85, 0.15); color: #FE2C55; }
    .dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: currentColor;
    }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
    .subtitle { color: #999; font-size: 14px; margin-bottom: 28px; line-height: 1.5; }
    .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #777;
      margin-bottom: 8px;
      margin-top: 20px;
    }
    .code-box {
      background: #0a0a0a;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      padding: 16px;
      font-family: "Monaco", "Courier New", monospace;
      font-size: 13px;
      color: #25F4EE;
      word-break: break-all;
      line-height: 1.5;
      user-select: all;
    }
    .actions {
      margin-top: 24px;
      display: flex;
      gap: 12px;
    }
    button {
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.1s;
      flex: 1;
    }
    button:active { transform: scale(0.98); }
    .btn-primary { background: #FE2C55; color: #fff; }
    .btn-secondary { background: #2a2a2a; color: #fff; }
    .btn-primary:hover, .btn-secondary:hover { opacity: 0.85; }
    .copied { background: #25F4EE !important; color: #000 !important; }
    .next-step {
      margin-top: 24px;
      padding: 16px;
      background: rgba(37, 244, 238, 0.05);
      border: 1px solid rgba(37, 244, 238, 0.2);
      border-radius: 8px;
      font-size: 13px;
      color: #ccc;
      line-height: 1.6;
    }
    .next-step strong { color: #25F4EE; }
    .scopes {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }
    .scope-pill {
      background: rgba(37, 244, 238, 0.1);
      color: #25F4EE;
      padding: 3px 10px;
      border-radius: 12px;
      font-family: "Monaco", monospace;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="card">
    ${error ? `
      <div class="status status-error">
        <span class="dot"></span>
        Erreur d'autorisation
      </div>
      <h1>Autorisation refusée ou échouée</h1>
      <p class="subtitle">TikTok a renvoyé une erreur. Aucun token ne peut être généré.</p>
      <div class="label">Erreur</div>
      <div class="code-box" style="color: #FE2C55;">${escapeHtml(error)}</div>
      ${errorDescription ? `
        <div class="label">Description</div>
        <div class="code-box" style="color: #FE2C55;">${escapeHtml(errorDescription)}</div>
      ` : ""}
    ` : code ? `
      <div class="status status-success">
        <span class="dot"></span>
        Autorisation reçue
      </div>
      <h1>Code OAuth généré</h1>
      <p class="subtitle">TikTok t'a renvoyé un code d'autorisation. Copie-le et colle-le dans le terminal Jarvis pour finaliser l'échange contre un access token.</p>

      <div class="label">Authorization code</div>
      <div class="code-box" id="code">${escapeHtml(code)}</div>

      ${state ? `
        <div class="label">State</div>
        <div class="code-box" style="font-size: 11px; color: #999;">${escapeHtml(state)}</div>
      ` : ""}

      ${scopes ? `
        <div class="label">Scopes accordés</div>
        <div class="scopes">
          ${scopes.split(",").map(s => `<span class="scope-pill">${escapeHtml(s.trim())}</span>`).join("")}
        </div>
      ` : ""}

      <div class="actions">
        <button class="btn-primary" id="copy-btn" onclick="copyCode()">Copier le code</button>
        <button class="btn-secondary" onclick="window.close()">Fermer</button>
      </div>

      <div class="next-step">
        <strong>Étape suivante</strong> — Va dans le terminal où tu as lancé le script Jarvis OAuth, colle le code, valide. Le script échangera ce code contre un access_token + refresh_token via l'API TikTok.
      </div>
    ` : `
      <div class="status status-error">
        <span class="dot"></span>
        Aucun code reçu
      </div>
      <h1>Pas de code OAuth dans l'URL</h1>
      <p class="subtitle">Cette page est l'endpoint de callback OAuth pour TikTok. Elle attend un paramètre <code>?code=...</code> dans l'URL. Si tu vois cette page sans avoir lancé le flow OAuth depuis Jarvis, ce n'est pas une erreur — c'est juste que la page n'a rien à traiter.</p>
    `}
  </div>

  <script>
    function copyCode() {
      const code = document.getElementById("code")?.textContent;
      if (!code) return;
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById("copy-btn");
        const original = btn.textContent;
        btn.textContent = "✓ Copié !";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove("copied");
        }, 2000);
      });
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}


function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
