import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const keyLength = 64
const maxMemory = 64 * 1024 * 1024

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, keyLength, { N: 32768, r: 8, p: 1, maxmem: maxMemory })
  return `scrypt$32768$8$1$${salt.toString('base64url')}$${Buffer.from(hash).toString('base64url')}`
}

export async function verifyPassword(password, encoded) {
  const [algorithm, nValue, rValue, pValue, saltValue, hashValue] = encoded.split('$')
  const n = Number(nValue)
  const r = Number(rValue)
  const p = Number(pValue)
  if (
    algorithm !== 'scrypt' ||
    !Number.isInteger(n) || n < 16384 || n > 131072 ||
    !Number.isInteger(r) || r < 1 || r > 16 ||
    !Number.isInteger(p) || p < 1 || p > 4 ||
    !saltValue || !hashValue
  ) return false

  const salt = Buffer.from(saltValue, 'base64url')
  const expected = Buffer.from(hashValue, 'base64url')
  if (salt.length !== 16 || expected.length !== keyLength) return false
  const actual = Buffer.from(await scrypt(password, salt, keyLength, { N: n, r, p, maxmem: maxMemory }))
  return timingSafeEqual(actual, expected)
}
