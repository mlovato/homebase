/**
 * @jest-environment node
 */
import { hashPassword, verifyHashedPassword } from './password'

describe('hashPassword / verifyHashedPassword', () => {
  it('hashes a password and verifies it', async () => {
    const hash = await hashPassword('mypassword')
    expect(typeof hash).toBe('string')
    expect(hash).not.toBe('mypassword')
    expect(await verifyHashedPassword('mypassword', hash)).toBe(true)
  })

  it('rejects wrong password against hash', async () => {
    const hash = await hashPassword('mypassword')
    expect(await verifyHashedPassword('wrong', hash)).toBe(false)
  })

  it('produces different hashes for the same password (unique salt)', async () => {
    const hash1 = await hashPassword('same')
    const hash2 = await hashPassword('same')
    expect(hash1).not.toBe(hash2)
  })
})
