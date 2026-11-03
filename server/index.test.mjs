import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

let api
let baseUrl

before(async () => {
  const portProbe = createServer()
  portProbe.listen(0, '127.0.0.1')
  await once(portProbe, 'listening')
  const { port } = portProbe.address()
  await new Promise((resolve, reject) => portProbe.close((error) => error ? reject(error) : resolve()))

  baseUrl = `http://127.0.0.1:${port}`
  api = spawn(process.execPath, [fileURLToPath(new URL('./index.mjs', import.meta.url))], {
    env: {
      ...process.env,
      API_HOST: '127.0.0.1',
      API_PORT: String(port),
      BETTING_PROVIDER_MODULE: '',
      DATABASE_URL: '',
    },
    stdio: 'ignore',
  })

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`)
      if (response.ok) return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }

  throw new Error('API server did not start for tests')
})

after(async () => {
  if (api && api.exitCode === null) {
    api.kill('SIGTERM')
    await once(api, 'exit')
  }
})

test('health reports when no licensed provider is configured', async () => {
  const response = await fetch(`${baseUrl}/api/health`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    status: 'ok',
    provider: { configured: false },
    admin: { databaseConfigured: false },
  })
})

test('session endpoint reports an unauthenticated visitor without an error', async () => {
  const response = await fetch(`${baseUrl}/api/auth/session`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { authenticated: false })
})

test('live markets are unavailable without a provider', async () => {
  const response = await fetch(`${baseUrl}/api/markets?sport=Cricket`)
  assert.equal(response.status, 503)
  assert.equal((await response.json()).error, 'provider_unavailable')
})

test('login is unavailable without a provider', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test', password: 'test' }),
  })
  assert.equal(response.status, 503)
  assert.equal((await response.json()).error, 'provider_unavailable')
})

test('bet placement is unavailable without a provider', async () => {
  const response = await fetch(`${baseUrl}/api/bets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectionId: 'fixture', side: 'back', stake: 10, odds: 2 }),
  })
  assert.equal(response.status, 503)
  assert.equal((await response.json()).error, 'provider_unavailable')
})

test('admin endpoints fail closed when PostgreSQL is not configured', async () => {
  const session = await fetch(`${baseUrl}/api/admin/session`)
  assert.equal(session.status, 200)
  assert.deepEqual(await session.json(), {
    authenticated: false,
    configured: false,
    message: 'Configure PostgreSQL and apply the admin schema migration.',
  })

  const login = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.test', password: 'not-a-real-password' }),
  })
  assert.equal(login.status, 503)

  const overview = await fetch(`${baseUrl}/api/admin/overview`)
  assert.equal(overview.status, 503)
})
