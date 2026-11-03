import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  adminSessionCookie,
  authenticateOperator,
  endOperatorSession,
  expiredAdminSessionCookie,
  getAdminOverview,
  getOperatorSession,
  hasPermission,
  isAdminDatabaseConfigured,
} from './admin-auth.mjs'
import { closeDatabase } from './database.mjs'

const port = Number(process.env.API_PORT || 3001)
const host = process.env.API_HOST || '127.0.0.1'
const sessions = new Map()
const sessionCookie = 'exchange_session'
const serverDirectory = dirname(fileURLToPath(import.meta.url))

async function loadProvider() {
  const moduleSetting = process.env.BETTING_PROVIDER_MODULE
  if (!moduleSetting) return null

  const providerDirectory = resolve(serverDirectory, 'providers')
  const modulePath = resolve(process.cwd(), moduleSetting)
  if (modulePath !== providerDirectory && !modulePath.startsWith(`${providerDirectory}${sep}`)) {
    throw new Error('BETTING_PROVIDER_MODULE must resolve inside server/providers')
  }

  const imported = await import(pathToFileURL(modulePath).href)
  const provider = imported.default
  const requiredMethods = ['authenticate', 'logout', 'getMarkets', 'getAccount', 'getBets', 'placeBet']
  if (!provider || requiredMethods.some((method) => typeof provider[method] !== 'function')) {
    throw new Error(`Provider module must export default with: ${requiredMethods.join(', ')}`)
  }
  return provider
}

const provider = await loadProvider()

function sendJson(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  })
  response.end(JSON.stringify(body))
}

function readSession(request) {
  const cookieHeader = request.headers.cookie || ''
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookie}=`))
  if (!cookie) return null
  const sessionId = decodeURIComponent(cookie.slice(sessionCookie.length + 1))
  const session = sessions.get(sessionId)
  if (session && session.expiresAt <= Date.now()) {
    sessions.delete(sessionId)
    return null
  }
  return session || null
}

function sessionCookieHeader(sessionId, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${sessionCookie}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

async function readJson(request) {
  const contentType = request.headers['content-type'] || ''
  if (!contentType.toLowerCase().startsWith('application/json')) {
    const error = new Error('Content-Type must be application/json')
    error.statusCode = 415
    throw error
  }

  let raw = ''
  for await (const chunk of request) {
    raw += chunk
    if (raw.length > 16_384) {
      const error = new Error('Request body is too large')
      error.statusCode = 413
      throw error
    }
  }

  try {
    return JSON.parse(raw)
  } catch {
    const error = new Error('Request body must be valid JSON')
    error.statusCode = 400
    throw error
  }
}

function requireProvider(response) {
  if (provider) return true
  sendJson(response, 503, {
    error: 'provider_unavailable',
    message: 'No licensed betting provider is configured. Betting and live markets are disabled.',
  })
  return false
}

function requireSession(request, response) {
  const session = readSession(request)
  if (session) return session
  sendJson(response, 401, { error: 'authentication_required', message: 'Sign in through the configured provider.' })
  return null
}

function publicUser(user) {
  return {
    id: typeof user.id === 'string' || typeof user.id === 'number' ? user.id : undefined,
    username: typeof user.username === 'string' ? user.username : '',
    fullName: typeof user.fullName === 'string' ? user.fullName : '',
  }
}

function assertSameOrigin(request) {
  const origin = request.headers.origin
  if (!origin) return
  const hostHeader = request.headers.host
  let originHost
  try {
    originHost = new URL(origin).host
  } catch {
    originHost = ''
  }
  if (!hostHeader || originHost !== hostHeader) {
    const error = new Error('Cross-origin requests are not allowed')
    error.statusCode = 403
    throw error
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`)
  const method = request.method || 'GET'

  try {
    if (method !== 'GET' && method !== 'HEAD') assertSameOrigin(request)

    if (method === 'GET' && url.pathname === '/api/health') {
      sendJson(response, 200, {
        status: 'ok',
        provider: provider ? { configured: true, name: provider.name || 'Licensed provider' } : { configured: false },
        admin: { databaseConfigured: isAdminDatabaseConfigured() },
      })
      return
    }

    if (method === 'POST' && url.pathname === '/api/admin/login') {
      const body = await readJson(request)
      if (
        typeof body.email !== 'string' ||
        typeof body.password !== 'string' ||
        body.email.length > 254 ||
        body.password.length > 1024 ||
        !body.email.trim() ||
        !body.password
      ) {
        sendJson(response, 400, { error: 'invalid_credentials', message: 'A valid email and password are required.' })
        return
      }

      const authenticated = await authenticateOperator({
        email: body.email.trim(),
        password: body.password,
        request,
      })
      if (!authenticated) {
        sendJson(response, 401, { error: 'invalid_credentials', message: 'Email or password is incorrect.' })
        return
      }
      sendJson(
        response,
        200,
        { user: authenticated.user },
        { 'Set-Cookie': adminSessionCookie(authenticated.token) },
      )
      return
    }

    if (method === 'GET' && url.pathname === '/api/admin/session') {
      if (!isAdminDatabaseConfigured()) {
        sendJson(response, 200, {
          authenticated: false,
          configured: false,
          message: 'Configure PostgreSQL and apply the admin schema migration.',
        })
        return
      }
      const session = await getOperatorSession(request)
      sendJson(response, 200, session
        ? { authenticated: true, configured: true, user: session.user }
        : { authenticated: false, configured: true })
      return
    }

    if (method === 'POST' && url.pathname === '/api/admin/logout') {
      await endOperatorSession(request)
      sendJson(response, 200, { ok: true }, { 'Set-Cookie': expiredAdminSessionCookie() })
      return
    }

    if (method === 'GET' && url.pathname === '/api/admin/overview') {
      if (!isAdminDatabaseConfigured()) {
        sendJson(response, 503, { error: 'admin_database_unavailable', message: 'Configure PostgreSQL and apply the admin schema migration.' })
        return
      }
      const session = await getOperatorSession(request)
      if (!session) {
        sendJson(response, 401, { error: 'admin_authentication_required', message: 'Sign in with an operator account to view the dashboard.' })
        return
      }
      if (!hasPermission(session.user, 'dashboard:view')) {
        sendJson(response, 403, { error: 'forbidden', message: 'Your operator role does not allow dashboard access.' })
        return
      }

      const overview = await getAdminOverview(session.user)
      sendJson(response, 200, {
        overview,
        provider: provider ? { configured: true, name: provider.name || 'Licensed provider' } : { configured: false },
      })
      return
    }

    if (method === 'GET' && url.pathname === '/api/markets') {
      if (!requireProvider(response)) return
      const sport = url.searchParams.get('sport') || undefined
      const markets = await provider.getMarkets({ sport })
      sendJson(response, 200, { markets })
      return
    }

    if (method === 'POST' && url.pathname === '/api/auth/login') {
      if (!requireProvider(response)) return
      const body = await readJson(request)
      if (typeof body.username !== 'string' || typeof body.password !== 'string' || !body.username.trim() || !body.password) {
        sendJson(response, 400, { error: 'invalid_credentials', message: 'Username and password are required.' })
        return
      }

      const authenticated = await provider.authenticate({ username: body.username.trim(), password: body.password })
      if (!authenticated) {
        sendJson(response, 401, { error: 'invalid_credentials', message: 'The provider rejected these credentials.' })
        return
      }
      if (!authenticated?.sessionToken || !authenticated?.user || typeof authenticated.user !== 'object') {
        sendJson(response, 502, { error: 'provider_error', message: 'Provider returned an invalid authentication response.' })
        return
      }

      const sessionId = randomBytes(32).toString('base64url')
      const user = publicUser(authenticated.user)
      sessions.set(sessionId, {
        token: authenticated.sessionToken,
        user,
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      })
      sendJson(response, 200, { user }, { 'Set-Cookie': sessionCookieHeader(sessionId, 60 * 60 * 8) })
      return
    }

    if (method === 'POST' && url.pathname === '/api/auth/logout') {
      if (!requireProvider(response)) return
      const sessionId = readSessionId(request)
      const session = sessionId ? sessions.get(sessionId) : null
      if (session) await provider.logout({ sessionToken: session.token })
      if (sessionId) sessions.delete(sessionId)
      sendJson(response, 200, { ok: true }, { 'Set-Cookie': sessionCookieHeader('', 0) })
      return
    }

    if (method === 'GET' && url.pathname === '/api/auth/session') {
      const session = readSession(request)
      if (!session) {
        sendJson(response, 200, { authenticated: false })
        return
      }
      sendJson(response, 200, { authenticated: true, user: session.user })
      return
    }

    if (method === 'GET' && url.pathname === '/api/account') {
      if (!requireProvider(response)) return
      const session = requireSession(request, response)
      if (!session) return
      const account = await provider.getAccount({ sessionToken: session.token })
      sendJson(response, 200, { account })
      return
    }

    if (method === 'GET' && url.pathname === '/api/bets') {
      if (!requireProvider(response)) return
      const session = requireSession(request, response)
      if (!session) return
      const bets = await provider.getBets({ sessionToken: session.token })
      sendJson(response, 200, { bets })
      return
    }

    if (method === 'POST' && url.pathname === '/api/bets') {
      if (!requireProvider(response)) return
      const session = requireSession(request, response)
      if (!session) return
      const body = await readJson(request)
      if (
        typeof body.selectionId !== 'string' ||
        !body.selectionId.trim() ||
        !['back', 'lay'].includes(body.side) ||
        !Number.isFinite(body.stake) ||
        body.stake <= 0 ||
        !Number.isFinite(body.odds) ||
        body.odds <= 1
      ) {
        sendJson(response, 400, { error: 'invalid_bet', message: 'A selection, back/lay side, positive stake, and odds greater than 1 are required.' })
        return
      }

      const idempotencyKey = request.headers['idempotency-key']
      if (typeof idempotencyKey !== 'string' || !/^[\w-]{16,128}$/.test(idempotencyKey)) {
        sendJson(response, 400, { error: 'idempotency_key_required', message: 'Provide a unique Idempotency-Key for each bet request.' })
        return
      }

      const bet = await provider.placeBet({
        sessionToken: session.token,
        idempotencyKey,
        bet: {
          selectionId: body.selectionId.trim(),
          side: body.side,
          stake: body.stake,
          odds: body.odds,
        },
      })
      sendJson(response, 201, { bet })
      return
    }

    sendJson(response, 404, { error: 'not_found', message: 'API endpoint not found.' })
  } catch (error) {
    const providerRoute = ['/api/markets', '/api/auth/login', '/api/auth/logout', '/api/account', '/api/bets'].includes(url.pathname)
      const statusCode = Number.isInteger(error.status)
        ? error.status
        : Number.isInteger(error.statusCode)
          ? error.statusCode
          : providerRoute ? 502 : 500
    if (statusCode >= 500) console.error(`API ${method} ${url.pathname} failed (${error.name || 'Error'})`)
    if (!response.headersSent) {
        const errorCode = typeof error.code === 'string'
          ? error.code
          : statusCode === 502
            ? 'provider_error'
            : statusCode >= 500
              ? 'service_error'
              : 'request_error'
        sendJson(response, statusCode, {
          error: errorCode,
          message: statusCode === 502
            ? 'The configured provider could not complete the request.'
            : statusCode === 503
              ? error.message || 'A backend service could not complete the request.'
              : statusCode >= 500
                ? 'A backend service could not complete the request.'
                : error.message,
        })
    } else {
      response.destroy()
    }
  }
})

function readSessionId(request) {
  const cookieHeader = request.headers.cookie || ''
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookie}=`))
  return cookie ? decodeURIComponent(cookie.slice(sessionCookie.length + 1)) : null
}

server.listen(port, host, () => {
  console.log(`Exchange API listening at http://${host}:${port}`)
  console.log(provider ? `Betting provider configured: ${provider.name || 'Licensed provider'}` : 'No betting provider configured; betting endpoints are disabled.')
})

function shutDown() {
  server.close(async () => {
    await closeDatabase()
    process.exit(0)
  })
}

process.on('SIGINT', shutDown)
process.on('SIGTERM', shutDown)
