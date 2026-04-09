/**
 * @jest-environment node
 */
import { verifyPassword, createSessionToken, verifySessionToken } from './auth'

const SECRET = 'test-secret-that-is-long-enough-for-hmac-256'

describe('verifyPassword', () => {
  it('returns true when password matches', () => {
    expect(verifyPassword('mysecret', 'mysecret')).toBe(true)
  })

  it('returns false when password does not match', () => {
    expect(verifyPassword('wrong', 'mysecret')).toBe(false)
  })

  it('returns false for empty submitted password', () => {
    expect(verifyPassword('', 'mysecret')).toBe(false)
  })

  it('is case-sensitive', () => {
    expect(verifyPassword('Secret', 'secret')).toBe(false)
  })
})

describe('createSessionToken / verifySessionToken', () => {
  it('creates a token that verifies successfully', async () => {
    const token = await createSessionToken(SECRET)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)

    const result = await verifySessionToken(token, SECRET)
    expect(result.valid).toBe(true)
  })

  it('rejects a token signed with a different secret', async () => {
    const token = await createSessionToken(SECRET)
    const result = await verifySessionToken(token, 'different-secret-also-long-enough!')
    expect(result.valid).toBe(false)
  })

  it('rejects a tampered token', async () => {
    const token = await createSessionToken(SECRET)
    const parts = token.split('.')
    parts[1] = Buffer.from('{"admin":false}').toString('base64url')
    const tampered = parts.join('.')
    const result = await verifySessionToken(tampered, SECRET)
    expect(result.valid).toBe(false)
  })

  it('rejects an empty token', async () => {
    const result = await verifySessionToken('', SECRET)
    expect(result.valid).toBe(false)
  })
})
