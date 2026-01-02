import crypto from 'crypto'
import { prisma } from './db'

const TOKEN_EXPIRY_DAYS = 30 // Extended for beta period

export function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function createManageToken(phoneId: string): Promise<string> {
  const token = generateToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  await prisma.manageToken.create({
    data: {
      phoneId,
      tokenHash,
      expiresAt,
    },
  })

  return token
}

export async function validateManageToken(token: string): Promise<{
  valid: boolean
  phoneId?: string
  tokenId?: string
  error?: string
}> {
  const tokenHash = hashToken(token)

  const manageToken = await prisma.manageToken.findUnique({
    where: { tokenHash },
    include: { phone: true },
  })

  if (!manageToken) {
    return { valid: false, error: 'Token not found' }
  }

  if (manageToken.usedAt) {
    return { valid: false, error: 'Token already used' }
  }

  if (new Date() > manageToken.expiresAt) {
    return { valid: false, error: 'Token expired' }
  }

  return {
    valid: true,
    phoneId: manageToken.phoneId,
    tokenId: manageToken.id,
  }
}

export async function markTokenUsed(tokenId: string): Promise<void> {
  await prisma.manageToken.update({
    where: { id: tokenId },
    data: { usedAt: new Date() },
  })
}
