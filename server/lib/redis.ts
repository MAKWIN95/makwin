import { Redis } from "@upstash/redis";

const redisUrl = process.env.STORAGE_KV_REST_API_URL;
const redisToken = process.env.STORAGE_KV_REST_API_TOKEN;

if (!redisUrl || !redisToken) {
  throw new Error(
    "Redis configuration is missing: STORAGE_KV_REST_API_URL and STORAGE_KV_REST_API_TOKEN are required"
  );
}

export const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});
