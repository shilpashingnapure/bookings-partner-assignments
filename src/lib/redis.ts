import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL!;

export const redis = new Redis(REDIS_URL);

// Lock a key for a specific duration (5 seconds in this case)
export async function Lockassign(key: string, ttl = 5000) {
  const result = await redis.set(key, "locked", "PX", ttl, "NX");
  return result === "OK";
}

// Release a lock
export async function releaseLock(key: string): Promise<void> {
  await redis.del(key);
}