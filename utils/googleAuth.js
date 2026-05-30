import { OAuth2Client } from "google-auth-library";

function normalizeClientId(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function getConfiguredClientIds() {
  return (process.env.GOOGLE_CLIENT_ID || "")
    .split(",")
    .map(normalizeClientId)
    .filter(Boolean);
}

function decodeJwtPayload(idToken) {
  const parts = idToken.split(".");

  if (parts.length !== 3) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    );
  } catch {
    return null;
  }
}

export function getGoogleClientIds(extraClientId) {
  const ids = new Set(getConfiguredClientIds());

  const normalizedExtra = normalizeClientId(extraClientId);

  if (normalizedExtra) {
    ids.add(normalizedExtra);
  }

  return [...ids];
}

export async function verifyGoogleIdToken(idToken, extraClientId) {
  const clientIds = getGoogleClientIds(extraClientId);

  if (clientIds.length === 0) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }

  if (!idToken?.includes(".") || idToken.split(".").length !== 3) {
    throw new Error("Token không phải Google ID token hợp lệ");
  }

  const client = new OAuth2Client(clientIds[0]);
  let lastError = null;

  for (const audience of clientIds) {
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new Error("Empty token payload");
      }

      const tokenAudiences = Array.isArray(payload.aud)
        ? payload.aud
        : [payload.aud];

      const audienceOk = clientIds.some((id) =>
        tokenAudiences.includes(id),
      );

      if (!audienceOk) {
        throw new Error(
          `Audience mismatch: token=${tokenAudiences.join(",")} expected=${clientIds.join(",")}`,
        );
      }

      return {
        googleId: payload.sub,
        email: payload.email?.toLowerCase(),
        name: payload.name || payload.email?.split("@")[0] || "User",
        picture: payload.picture || "",
        emailVerified: payload.email_verified !== false,
      };
    } catch (error) {
      lastError = error;
    }
  }

  const decoded = decodeJwtPayload(idToken);

  if (decoded) {
    console.error(
      "[Google Auth] token aud:",
      decoded.aud,
      "| azp:",
      decoded.azp,
    );
    console.error("[Google Auth] expected client IDs:", clientIds);
  }

  console.error("[Google Auth] verify failed:", lastError?.message);

  throw lastError || new Error("Invalid Google token");
}
