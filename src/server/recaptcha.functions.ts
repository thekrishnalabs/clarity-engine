import { createServerFn } from "@tanstack/react-start";

const SITE_KEY = "6LfcVM4sAAAAAP_7448Ck-BEc9nsCji5PJG0_fsd";
const TOKEN_URI = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/cloud-platform";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

// --- Web Crypto helpers (Edge-runtime compatible) ----------------------------

function base64UrlEncode(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlEncodeString(s: string): string {
  return base64UrlEncode(new TextEncoder().encode(s));
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function signJwt(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: sa.token_uri || TOKEN_URI,
    iat: now,
    exp: now + 3600,
  };
  const unsigned =
    base64UrlEncodeString(JSON.stringify(header)) +
    "." +
    base64UrlEncodeString(JSON.stringify(claim));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  return unsigned + "." + base64UrlEncode(new Uint8Array(sig));
}

// Cache the access token in module scope (per worker isolate)
let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const jwt = await signJwt(sa);
  const res = await fetch(sa.token_uri || TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth token exchange failed [${res.status}]: ${text}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, exp: now + data.expires_in };
  return data.access_token;
}

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.GCP_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GCP_SERVICE_ACCOUNT_JSON is not configured");
  let parsed: ServiceAccount;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("GCP_SERVICE_ACCOUNT_JSON is not valid JSON");
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Service account JSON missing client_email or private_key");
  }
  return parsed;
}

// --- Public server function --------------------------------------------------

export type RecaptchaVerification = {
  ok: boolean;
  score?: number;
  reasons?: string[];
  action?: string;
  invalidReason?: string;
  error?: string;
};

export const verifyRecaptcha = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; action: string }) => {
    if (!input || typeof input.token !== "string" || typeof input.action !== "string") {
      throw new Error("Invalid input");
    }
    if (input.token.length < 10 || input.token.length > 4096) {
      throw new Error("Invalid token length");
    }
    if (!/^[A-Z_]{1,64}$/.test(input.action)) {
      throw new Error("Invalid action name");
    }
    return input;
  })
  .handler(async ({ data }): Promise<RecaptchaVerification> => {
    try {
      const projectId = process.env.GCP_PROJECT_ID;
      if (!projectId) {
        return { ok: false, error: "GCP_PROJECT_ID is not configured" };
      }
      const sa = loadServiceAccount();
      const accessToken = await getAccessToken(sa);

      const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: { token: data.token, siteKey: SITE_KEY, expectedAction: data.action },
        }),
      });

      const body: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[recaptcha] assessment failed", res.status, body);
        return { ok: false, error: `Assessment failed (${res.status})` };
      }

      const tp = body.tokenProperties || {};
      if (!tp.valid) {
        return { ok: false, invalidReason: tp.invalidReason || "INVALID_TOKEN" };
      }
      if (tp.action && tp.action !== data.action) {
        return { ok: false, error: "Action mismatch", action: tp.action };
      }

      const score: number | undefined = body.riskAnalysis?.score;
      const reasons: string[] = body.riskAnalysis?.reasons || [];
      // Threshold: 0.5 is Google's recommended baseline.
      if (typeof score === "number" && score < 0.5) {
        return { ok: false, score, reasons, action: tp.action };
      }
      return { ok: true, score, reasons, action: tp.action };
    } catch (err: any) {
      console.error("[recaptcha] unexpected error", err);
      return { ok: false, error: err?.message || "Unknown error" };
    }
  });
