import { SignJWT } from "jose";

/**
 * All configuration is hardcoded on purpose: this app has no backend and no .env files.
 * NOTE: the API secret is therefore visible to anyone who opens the bundle. This is an
 * accepted tradeoff for this project (static GitHub Pages deployment, no server).
 */
export const LIVEKIT_URL = "wss://live-itzo8iwa.livekit.cloud";
export const LIVEKIT_API_KEY = "APIbVyymX2Ad8Ti";
export const LIVEKIT_API_SECRET = "nadaRzy2UWr3fEc390eBydynp2LaKRo28g9b64SxHim";

export const ROOM_NAME = "main-broadcast";
export const ADMIN_PASSWORD = "admin90";
export const DEFAULT_TITLE = "Live Session";
export const OFFLINE_TITLE = "Not live yet";

type TokenOptions = {
  identity: string;
  canPublish: boolean;
};

/** Mint a LiveKit access token entirely in the browser (HS256, same as the server SDK). */
export async function createLiveKitToken({ identity, canPublish }: TokenOptions): Promise<string> {
  const secret = new TextEncoder().encode(LIVEKIT_API_SECRET);
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({
    name: identity,
    video: {
      room: ROOM_NAME,
      roomJoin: true,
      canPublish,
      canPublishData: canPublish,
      canSubscribe: true,
      canUpdateOwnMetadata: true,
    },
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(LIVEKIT_API_KEY)
    .setSubject(identity)
    .setIssuedAt(now)
    .setNotBefore(now - 10)
    .setExpirationTime(now + 60 * 60 * 6)
    .sign(secret);
}
