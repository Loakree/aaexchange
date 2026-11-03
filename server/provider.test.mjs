import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

let api
let baseUrl
let cookie

async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (cookie) headers.Cookie = cookie
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers })
  const setCookie = response.headers.getSetCookie?.()[0]
  if (setCookie) cookie = setCookie.split(';')[0]
  return response
}

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
      BETTING_PROVIDER_MODULE: 'server/providers/mock.mjs',
      DATABASE_URL: '',
    },
    cwd: fileURLToPath(new URL('..', import.meta.url)),
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

  throw new Error('API server did not start for mock provider tests')
})

after(async () => {
  if (api && api.exitCode === null) {
    api.kill('SIGTERM')
    await once(api, 'exit')
  }
})

test('health reports the configured mock provider', async () => {
  const response = await fetch(`${baseUrl}/api/health`)
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.provider.configured, true)
  assert.equal(body.provider.name, 'Mock provider (development only)')
})

test('markets are returned with event and selection identifiers', async () => {
  const response = await fetch(`${baseUrl}/api/markets?sport=Cricket`)
  assert.equal(response.status, 200)
  const { markets } = await response.json()
  assert.ok(markets.length > 0)

  const market = markets[0]
  assert.equal(market.sport, 'Cricket')
  assert.ok(Array.isArray(market.selections) && market.selections.length > 0)
  assert.match(market.selections[0].selectionId, /^[\w-]+:.+$/)
})

test('a rejected login returns 401 and leaves the visitor unauthenticated', async () => {
  const login = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'demo', password: 'wrong-password' }),
  })
  assert.equal(login.status, 401)

  const session = await apiFetch('/api/auth/session')
  assert.deepEqual(await session.json(), { authenticated: false })
})

test('signing in exposes the provider account', async () => {
  const login = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'demo', password: 'demo1234' }),
  })
  assert.equal(login.status, 200)
  const { user } = await login.json()
  assert.equal(user.username, 'demo')

  const account = await apiFetch('/api/account')
  assert.equal(account.status, 200)
  const { account: details } = await account.json()
  assert.equal(details.balance, 10000)
})

test('bet placement requires an Idempotency-Key', async () => {
  const response = await apiFetch('/api/bets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectionId: 'ind-v-sa:1', side: 'back', stake: 100, odds: 1.79 }),
  })
  assert.equal(response.status, 400)
  assert.equal((await response.json()).error, 'idempotency_key_required')
})

test('bet placement rejects a price below the current odds', async () => {
  const response = await apiFetch('/api/bets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'test-odds-moved-0001' },
    body: JSON.stringify({ selectionId: 'ind-v-sa:1', side: 'back', stake: 100, odds: 1.5 }),
  })
  assert.equal(response.status, 400)
  assert.equal((await response.json()).error, 'odds_moved')
})

test('bet placement rejects a stake above the available balance', async () => {
  const response = await apiFetch('/api/bets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'test-insufficient-0001' },
    body: JSON.stringify({ selectionId: 'ind-v-sa:1', side: 'back', stake: 50_000, odds: 1.79 }),
  })
  assert.equal(response.status, 400)
  assert.equal((await response.json()).error, 'insufficient_funds')
})

test('bet placement confirms the bet and returns it in history', async () => {
  const response = await apiFetch('/api/bets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'test-placement-0001' },
    body: JSON.stringify({ selectionId: 'ind-v-sa:1', side: 'back', stake: 250, odds: 1.79 }),
  })
  assert.equal(response.status, 201)
  const { bet } = await response.json()
  assert.ok(bet.id)
  assert.equal(bet.bet.stake, 250)
  assert.equal(bet.bet.odds, 1.79)

  const history = await apiFetch('/api/bets')
  assert.equal(history.status, 200)
  const { bets } = await history.json()
  assert.equal(bets.length, 1)
  assert.equal(bets[0].event, 'India Legends v South Africa Legends')
  assert.equal(bets[0].selection, '1')
  assert.equal(bets[0].stake, 250)

  const account = await apiFetch('/api/account')
  assert.equal((await account.json()).account.balance, 9750)
})

test('reusing an Idempotency-Key does not place a second bet', async () => {
  const first = await apiFetch('/api/bets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'test-idempotent-0001' },
    body: JSON.stringify({ selectionId: 'sa-v-aus:2', side: 'back', stake: 100, odds: 2.08 }),
  })
  assert.equal(first.status, 201)
  const { bet: created } = await first.json()

  const second = await apiFetch('/api/bets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'test-idempotent-0001' },
    body: JSON.stringify({ selectionId: 'sa-v-aus:2', side: 'back', stake: 100, odds: 2.08 }),
  })
  assert.equal(second.status, 201)
  const { bet: replayed } = await second.json()
  assert.equal(replayed.id, created.id)

  const { bets } = await (await apiFetch('/api/bets')).json()
  assert.equal(bets.length, 2)
})

test('signing out clears the provider session', async () => {
  const logout = await apiFetch('/api/auth/logout', { method: 'POST' })
  assert.equal(logout.status, 200)

  const account = await apiFetch('/api/account')
  assert.equal(account.status, 401)
})