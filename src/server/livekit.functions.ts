import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AccessToken } from "livekit-server-sdk";

const InputSchema = z.object({
  identity: z.string().min(1).max(128),
  name: z.string().min(1).max(128),
  room: z.string().min(1).max(64),
  canPublish: z.boolean().default(false),
});

export const createLiveKitToken = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const url = process.env.LIVEKIT_URL;
    if (!apiKey || !apiSecret || !url) {
      console.error("[livekit] missing env vars");
      return { ok: false as const, error: "Voice service not configured." };
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: data.identity,
      name: data.name,
      ttl: 60 * 60, // 1 hour
    });
    at.addGrant({
      room: data.room,
      roomJoin: true,
      canSubscribe: true,
      canPublish: data.canPublish,
      canPublishData: true,
    });
    const token = await at.toJwt();
    return { ok: true as const, token, url };
  });
