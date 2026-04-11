import { scrypt, randomBytes, timingSafeEqual } from "crypto";

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString("hex");
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
      resolve(timingSafeEqual(Buffer.from(key, "hex"), derived));
    });
  });
}
