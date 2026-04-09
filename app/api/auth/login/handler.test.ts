/**
 * @jest-environment node
 */
import { handleLogin } from './handler'

const ADMIN_PASSWORD = 'secret123'
const JWT_SECRET = 'test-secret-long-enough-for-hmac-sha256!!'

describe('handleLogin', () => {
  it('returns success and token with correct password', async () => {
    const result = await handleLogin({ password: ADMIN_PASSWORD }, ADMIN_PASSWORD, JWT_SECRET)
    expect(result.success).toBe(true)
    expect(typeof result.token).toBe('string')
    expect(result.error).toBeUndefined()
  })

  it('returns error with wrong password', async () => {
    const result = await handleLogin({ password: 'wrong' }, ADMIN_PASSWORD, JWT_SECRET)
    expect(result.success).toBe(false)
    expect(result.token).toBeUndefined()
    expect(result.error).toBeTruthy()
  })

  it('returns error with empty password', async () => {
    const result = await handleLogin({ password: '' }, ADMIN_PASSWORD, JWT_SECRET)
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })
})
