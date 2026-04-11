/**
 * atlassian.ipc.ts
 *
 * Handles Atlassian MCP OAuth 2.1 (PKCE + Dynamic Client Registration).
 *
 * Flow:
 *   1. DCR  — POST /v1/register → get client_id (stored persistently)
 *   2. PKCE — generate code_verifier + code_challenge
 *   3. Local HTTP server — catch OAuth callback on ephemeral port
 *   4. Browser — shell.openExternal(authorizeUrl)
 *   5. Token exchange — POST /v1/token → access_token + refresh_token
 *   6. Store tokens — persisted via electron-store
 *
 * Endpoints (from https://mcp.atlassian.com/.well-known/oauth-authorization-server):
 *   Authorize : https://mcp.atlassian.com/v1/authorize
 *   Token     : https://cf.mcp.atlassian.com/v1/token
 *   Register  : https://cf.mcp.atlassian.com/v1/register
 */

import { ipcMain, shell, app } from "electron";
import * as http from "http";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

// Simple JSON-file-backed store — avoids ESM/CJS issues with electron-store v10
interface StoredData {
  tokens?: AtlassianTokens;
  clientReg?: AtlassianClientReg;
}

function getStorePath(): string {
  return path.join(app.getPath("userData"), "atlassian-auth.json");
}

function readStore(): StoredData {
  try {
    return JSON.parse(fs.readFileSync(getStorePath(), "utf-8")) as StoredData;
  } catch {
    return {};
  }
}

function writeStore(data: StoredData): void {
  fs.writeFileSync(getStorePath(), JSON.stringify(data, null, 2), "utf-8");
}

const MCP_AUTHORIZE_URL = "https://mcp.atlassian.com/v1/authorize";
const MCP_TOKEN_URL = "https://cf.mcp.atlassian.com/v1/token";
const MCP_REGISTER_URL = "https://cf.mcp.atlassian.com/v1/register";

// Fixed callback port — must be stable across runs because it is baked into the
// registered redirect_uri. Atlassian rejects mismatches.
const CALLBACK_PORT = 54321;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;

// Scopes required by Atlassian MCP (read Jira + Confluence + offline refresh)
const OAUTH_SCOPE = "read:me offline_access read:jira-work read:jira-user read:confluence-space.summary read:confluence-content.summary";

interface AtlassianTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number; // unix ms
}

interface AtlassianClientReg {
  client_id: string;
  redirect_uri: string; // stored to detect port changes that require re-registration
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getStoredTokens(): AtlassianTokens | null {
  return readStore().tokens ?? null;
}

function storeTokens(tokens: AtlassianTokens): void {
  writeStore({ ...readStore(), tokens });
}

function clearTokens(): void {
  const data = readStore();
  delete data.tokens;
  writeStore(data);
}

function getClientReg(): AtlassianClientReg | null {
  return readStore().clientReg ?? null;
}

function storeClientReg(client_id: string, redirect_uri: string): void {
  writeStore({ ...readStore(), clientReg: { client_id, redirect_uri } });
}

function clearClientReg(): void {
  const data = readStore();
  delete data.clientReg;
  writeStore(data);
}

function isTokenValid(tokens: AtlassianTokens): boolean {
  if (!tokens.access_token) return false;
  if (tokens.expires_at && Date.now() > tokens.expires_at - 60_000) return false;
  return true;
}

async function jsonFetch(url: string, options: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(url, options);
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(body)}`);
  return body as Record<string, unknown>;
}

/** Dynamic Client Registration — registers with fixed REDIRECT_URI and caches result.
 *  Clears and re-registers if the stored redirect_uri doesn't match (port changed). */
async function ensureClientId(): Promise<string> {
  const reg = getClientReg();
  if (reg && reg.redirect_uri === REDIRECT_URI) return reg.client_id;

  // Stale registration (redirect_uri changed) — re-register
  if (reg) clearClientReg();

  const body = await jsonFetch(MCP_REGISTER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Specwright Desktop",
      redirect_uris: [REDIRECT_URI],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none", // public client — no client_secret
      scope: OAUTH_SCOPE,
    }),
  });

  const client_id = body.client_id as string;
  storeClientReg(client_id, REDIRECT_URI);
  return client_id;
}

/** Try to refresh an existing token */
async function tryRefresh(clientId: string, tokens: AtlassianTokens): Promise<AtlassianTokens | null> {
  if (!tokens.refresh_token) return null;
  try {
    const body = await jsonFetch(MCP_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
        client_id: clientId,
      }).toString(),
    });
    const newTokens: AtlassianTokens = {
      access_token: body.access_token as string,
      refresh_token: (body.refresh_token as string) ?? tokens.refresh_token,
      expires_at: body.expires_in ? Date.now() + (body.expires_in as number) * 1000 : undefined,
    };
    storeTokens(newTokens);
    return newTokens;
  } catch {
    return null;
  }
}

// ── Full PKCE browser auth flow ────────────────────────────────────────────────

async function runOAuthFlow(): Promise<AtlassianTokens> {
  const clientId = await ensureClientId();

  // PKCE
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  const state = crypto.randomBytes(16).toString("hex");

  // Build authorize URL — scope is required by Atlassian's OAuth server
  const authorizeUrl = new URL(MCP_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authorizeUrl.searchParams.set("scope", OAUTH_SCOPE);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("state", state);

  // Spin up local callback server on fixed CALLBACK_PORT
  const code = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      server.close();
      reject(new Error("Atlassian OAuth timed out (5 minutes)"));
    }, 5 * 60 * 1000);

    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url ?? "/", `http://localhost:${CALLBACK_PORT}`);
        if (url.pathname !== "/callback") { res.end(); return; }

        const returnedState = url.searchParams.get("state");
        const authCode = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
          res.writeHead(400);
          res.end(`<h2>Auth failed: ${error}</h2><p>You can close this tab.</p>`);
          clearTimeout(timer);
          server.close();
          reject(new Error(`Atlassian OAuth error: ${error}`));
          return;
        }

        if (returnedState !== state || !authCode) {
          res.writeHead(400);
          res.end("<h2>Invalid callback</h2><p>You can close this tab.</p>");
          clearTimeout(timer);
          server.close();
          reject(new Error("OAuth state mismatch or missing code"));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          "<html><body style='font-family:sans-serif;padding:40px'>" +
          "<h2>✓ Atlassian connected!</h2>" +
          "<p>You can close this tab and return to Specwright.</p>" +
          "</body></html>"
        );
        clearTimeout(timer);
        server.close();
        resolve(authCode);
      } catch (e) {
        server.close();
        reject(e);
      }
    });

    server.listen(CALLBACK_PORT, () => {
      // Open browser only after server is ready to receive the callback
      shell.openExternal(authorizeUrl.toString());
    });
  });

  // Exchange code for tokens
  const tokenBody = await jsonFetch(MCP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: codeVerifier,
    }).toString(),
  });

  const tokens: AtlassianTokens = {
    access_token: tokenBody.access_token as string,
    refresh_token: tokenBody.refresh_token as string | undefined,
    expires_at: tokenBody.expires_in
      ? Date.now() + (tokenBody.expires_in as number) * 1000
      : undefined,
  };
  storeTokens(tokens);
  return tokens;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Returns the current access token if valid (may refresh). Returns null if not authenticated. */
export async function getAtlassianAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens) return null;
  if (isTokenValid(tokens)) return tokens.access_token;

  // Try refresh
  const reg = getClientReg();
  if (!reg) return null;
  const refreshed = await tryRefresh(reg.client_id, tokens);
  return refreshed?.access_token ?? null;
}

export function registerAtlassianIpc(): void {
  /** atlassian:status — returns current auth status */
  ipcMain.handle("atlassian:status", async () => {
    const tokens = getStoredTokens();
    if (!tokens) return { status: "idle" };
    if (isTokenValid(tokens)) return { status: "connected" };

    // Try silent refresh
    const reg = getClientReg();
    if (reg) {
      const refreshed = await tryRefresh(reg.client_id, tokens);
      if (refreshed) return { status: "connected" };
    }
    return { status: "needs-auth" };
  });

  /** atlassian:connect — runs full PKCE browser OAuth flow */
  ipcMain.handle("atlassian:connect", async () => {
    try {
      // Clear stale tokens before a fresh connect attempt
      clearTokens();
      await runOAuthFlow();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  /** atlassian:disconnect — clears tokens and client registration */
  ipcMain.handle("atlassian:disconnect", () => {
    clearTokens();
    clearClientReg();
    return { success: true };
  });
}
