import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
import type Database from 'better-sqlite3'
import { verifyPassword } from '@/lib/auth'
import { getSetting } from '@/lib/repositories/settings'

const SCRYPT_KEYLEN = 64
export const PASSWORD_HASH_KEY = 'admin_password_hash'

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString('hex')
    scrypt(password, salt, SCRYPT_KEYLEN, (err, derived) => {
      if (err) return reject(err)
      resolve(`${salt}:${derived.toString('hex')}`)
    })
  })
}

export function verifyHashedPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':')
    scrypt(password, salt, SCRYPT_KEYLEN, (err, derived) => {
      if (err) return reject(err)
      resolve(timingSafeEqual(Buffer.from(key, 'hex'), derived))
    })
  })
}

export async function verifyCurrentPassword(
  db: Database.Database,
  submitted: string,
  envPassword: string
): Promise<boolean> {
  const storedHash = getSetting(db, PASSWORD_HASH_KEY)
  if (storedHash) {
    return verifyHashedPassword(submitted, storedHash)
  }
  return verifyPassword(submitted, envPassword)
}
