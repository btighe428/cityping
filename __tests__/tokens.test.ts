import { generateToken, hashToken } from '../src/lib/tokens'

describe('Token Generation', () => {
  it('should generate unique tokens', () => {
    const token1 = generateToken()
    const token2 = generateToken()

    expect(token1).not.toBe(token2)
    expect(token1.length).toBeGreaterThan(20)
  })

  it('should generate URL-safe tokens', () => {
    const token = generateToken()
    // base64url encoding should not contain +, /, or =
    expect(token).not.toMatch(/[+/=]/)
  })
})

describe('Token Hashing', () => {
  it('should produce consistent hashes', () => {
    const token = 'test-token-123'
    const hash1 = hashToken(token)
    const hash2 = hashToken(token)

    expect(hash1).toBe(hash2)
  })

  it('should produce different hashes for different tokens', () => {
    const hash1 = hashToken('token1')
    const hash2 = hashToken('token2')

    expect(hash1).not.toBe(hash2)
  })

  it('should produce 64-character hex hash (SHA-256)', () => {
    const hash = hashToken('test')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[a-f0-9]+$/)
  })
})
