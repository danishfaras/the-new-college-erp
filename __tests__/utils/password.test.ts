import { hashPassword, verifyPassword } from '@/lib/utils/password'

describe('Password utilities', () => {
  it('should hash a password', async () => {
    const password = 'testpassword123'
    const hashed = await hashPassword(password)
    
    expect(hashed).toBeDefined()
    expect(hashed).not.toBe(password)
    expect(hashed.length).toBeGreaterThan(0)
  })

  it('should verify a correct password', async () => {
    const password = 'testpassword123'
    const hashed = await hashPassword(password)
    
    const isValid = await verifyPassword(password, hashed)
    expect(isValid).toBe(true)
  })

  it('should reject an incorrect password', async () => {
    const password = 'testpassword123'
    const wrongPassword = 'wrongpassword'
    const hashed = await hashPassword(password)
    
    const isValid = await verifyPassword(wrongPassword, hashed)
    expect(isValid).toBe(false)
  })
})
