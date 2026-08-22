import { scrypt, randomBytes, timingSafeEqual } from "crypto";

const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;

/**
 * A well-formed hash that no password can match, for callers that must spend
 * the same time verifying an unknown account as a real one — otherwise the
 * response time tells an attacker which accounts exist. Built from this
 * module's own parameters so it cannot drift out of shape.
 */
export const DECOY_PASSWORD_HASH = [
  "0".repeat(SALT_BYTES * 2),
  "0".repeat(SCRYPT_KEYLEN * 2),
].join(":");

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(SALT_BYTES).toString("hex");
    scrypt(password, salt, SCRYPT_KEYLEN, (err, derived) => {
      if (err) return reject(err);
      resolve(`${salt}:${derived.toString("hex")}`);
    });
  });
}

export function verifyHashedPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");
    scrypt(password, salt, SCRYPT_KEYLEN, (err, derived) => {
      if (err) return reject(err);
      try {
        resolve(timingSafeEqual(Buffer.from(key, "hex"), derived));
      } catch {
        // Wrong length or unparsable hex: not a match, and never a thrown
        // callback — that would strand the promise and hang the request.
        resolve(false);
      }
    });
  });
}
