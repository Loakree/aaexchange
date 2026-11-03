import { createHash, randomBytes } from 'node:crypto'
import { databaseConfigured, query, withTransaction } from './database.mjs'
import { hashPassword, verifyPassword } from './passwords.mjs'

const cookieName = 'exchange_admin_session'
const sessionLifetimeMs = 8 * 60 * 60 * 1000
const failedLogins = new Map()
const roles = {
  admin: ['dashboard:view', 'operators:manage', 'configuration:manage', 'audit:view'],
  operator: ['dashboard:view', 'markets:view'],
  support: ['dashboard:view', 'customers:view'],
  auditor: ['dashboard:view', 'audit:view'],
}
const dummyPasswordHash = await hashPassword(randomBytes(32).toString('base64url'))

function sessionHash(token) {
  return createHash('sha256').update(token).digest()
}

function sessionIdFromRequest(request) {
  const cookieHeader = request.headers.cookie || ''
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))
  if (!cookie) return null
  try {
    return decodeURIComponent(cookie.slice(cookieName.length + 1))
  } catch {
    return null
  }
}

function cookieHeader(token, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

function publicOperator(operator) {
  return {
    id: operator.id,
    email: operator.email,
    fullName: operator.full_name,
    role: operator.role,
    permissions: roles[operator.role] || [],
  }
}

function recordFailedLogin(address) {
  const now = Date.now()
  const recent = (failedLogins.get(address) || []).filter((time) => now - time < 15 * 60 * 1000)
  recent.push(now)
  failedLogins.set(address, recent)
  if (failedLogins.size > 5000) {
    for (const [key, attempts] of failedLogins) {
      if (attempts.every((time) => now - time >= 15 * 60 * 1000)) failedLogins.delete(key)
      if (failedLogins.size <= 4000) break
    }
  }
  return recent.length
}

function clearFailedLogins(address) {
  failedLogins.delete(address)
}

export function isAdminDatabaseConfigured() {
  return databaseConfigured
}

export async function authenticateOperator({ email, password, request }) {
  if (!databaseConfigured) {
    const error = new Error('Admin database is not configured.')
    error.statusCode = 503
    throw error
  }

  const address = request.socket.remoteAddress || 'unknown'
  const attempts = failedLogins.get(address) || []
  const now = Date.now()
  const recent = attempts.filter((time) => now - time < 15 * 60 * 1000)
  if (recent.length >= 8) {
    const error = new Error('Too many sign-in attempts. Try again later.')
    error.statusCode = 429
    throw error
  }

  const result = await query(
    `SELECT id, email, full_name, password_hash, role
     FROM operator_accounts
     WHERE LOWER(email) = LOWER($1) AND disabled_at IS NULL`,
    [email],
  )
  const operator = result.rows[0]
  const validPassword = await verifyPassword(password, operator?.password_hash || dummyPasswordHash)
  if (!operator || !validPassword) {
    recordFailedLogin(address)
    return null
  }

  clearFailedLogins(address)
  const sessionToken = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + sessionLifetimeMs)
  await withTransaction(async (execute) => {
    await execute(
      'INSERT INTO admin_sessions (token_hash, operator_id, expires_at) VALUES ($1, $2, $3)',
      [sessionHash(sessionToken), operator.id, expiresAt],
    )
    await execute(
      'INSERT INTO admin_audit_log (operator_id, action, remote_address) VALUES ($1, $2, $3)',
      [operator.id, 'admin.login', address],
    )
  })
  return { token: sessionToken, user: publicOperator(operator) }
}

export async function getOperatorSession(request) {
  if (!databaseConfigured) return null
  const token = sessionIdFromRequest(request)
  if (!token) return null

  const result = await query(
    `SELECT o.id, o.email, o.full_name, o.role
     FROM admin_sessions s
     JOIN operator_accounts o ON o.id = s.operator_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW() AND o.disabled_at IS NULL`,
    [sessionHash(token)],
  )
  const operator = result.rows[0]
  if (!operator) return null
  await query('UPDATE admin_sessions SET last_seen_at = NOW() WHERE token_hash = $1', [sessionHash(token)])
  return { token, user: publicOperator(operator) }
}

export async function endOperatorSession(request) {
  const token = sessionIdFromRequest(request)
  if (!token || !databaseConfigured) return
  await withTransaction(async (execute) => {
    const result = await execute(
      `DELETE FROM admin_sessions
       WHERE token_hash = $1
       RETURNING operator_id`,
      [sessionHash(token)],
    )
    if (result.rows[0]) {
      await execute(
        'INSERT INTO admin_audit_log (operator_id, action, remote_address) VALUES ($1, $2, $3)',
        [result.rows[0].operator_id, 'admin.logout', request.socket.remoteAddress || null],
      )
    }
  })
}

export function adminSessionCookie(token) {
  return cookieHeader(token, sessionLifetimeMs / 1000)
}

export function expiredAdminSessionCookie() {
  return cookieHeader('', 0)
}

export function hasPermission(user, permission) {
  return user.permissions.includes(permission)
}

export async function getAdminOverview(user) {
  const [operatorResult, auditResult] = await Promise.all([
    query('SELECT COUNT(*)::integer AS count FROM operator_accounts WHERE disabled_at IS NULL'),
    hasPermission(user, 'audit:view')
      ? query(
        `SELECT a.action, a.created_at, o.full_name AS actor
         FROM admin_audit_log a
         LEFT JOIN operator_accounts o ON o.id = a.operator_id
         ORDER BY a.created_at DESC
         LIMIT 10`,
      )
      : Promise.resolve({ rows: [] }),
  ])

  return {
    operatorCount: operatorResult.rows[0].count,
    recentActivity: auditResult.rows.map((entry) => ({
      action: entry.action,
      actor: entry.actor || 'System',
      createdAt: entry.created_at,
    })),
  }
}
