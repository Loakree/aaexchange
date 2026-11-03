import { randomUUID } from 'node:crypto'
import { ProviderError, splitSelectionId } from './http.mjs'

// Development-only in-memory provider so the full bet flow can be exercised
// end to end before a licensed adapter is written. It is not a real provider:
// balances reset on restart, there is no settlement, and no real money moves.
const DEFAULT_BALANCE = 10000

const marketEvents = [
  { eventId: 'ind-v-sa', sport: 'Cricket', eventName: 'India Legends v South Africa Legends', live: true, marketName: 'Match Odds', selections: [['1', 1.79], ['X', 3.4], ['2', 2.26]] },
  { eventId: 'boland-v-storm', sport: 'Cricket', eventName: 'Boland v Eastern Storm', live: false, marketName: 'Match Odds', selections: [['1', 2.1], ['X', 2.8], ['2', 2.5]] },
  { eventId: 'warriors-v-cape', sport: 'Cricket', eventName: 'Warriors v Northern Cape', live: false, marketName: 'Match Odds', selections: [['1', 1.9], ['X', 3.2], ['2', 2.3]] },
  { eventId: 'ausw-v-banw', sport: 'Cricket', eventName: 'Australia W v Bangladesh W', live: false, marketName: 'Match Odds', selections: [['1', 1.42], ['X', 3.1], ['2', 3.6]] },
  { eventId: 'afg-v-ban', sport: 'Cricket', eventName: 'Afghanistan v Bangladesh', live: true, marketName: 'Match Odds', selections: [['1', 2.15], ['X', 3.05], ['2', 1.88]] },
  { eventId: 'sa-v-aus', sport: 'Cricket', eventName: 'South Africa v Australia', live: true, marketName: 'Match Odds', selections: [['1', 2.2], ['X', 3.75], ['2', 2.08]] },
  { eventId: 'ind-v-wi', sport: 'Cricket', eventName: 'India v West Indies', live: true, marketName: 'Match Odds', selections: [['1', 1.24], ['X', 6.5], ['2', 4.8]] },
  { eventId: 'pak-v-sl', sport: 'Cricket', eventName: 'Pakistan v Sri Lanka', live: true, marketName: 'Match Odds', selections: [['1', 1.45], ['X', 5.8], ['2', 2.9]] },
  { eventId: 'manc-v-chel', sport: 'Soccer', eventName: 'Manchester City v Chelsea', live: true, marketName: '1X2', selections: [['1', 1.68], ['X', 3.8], ['2', 4.25]] },
  { eventId: 'liver-v-ars', sport: 'Soccer', eventName: 'Liverpool v Arsenal', live: false, marketName: '1X2', selections: [['1', 2.14], ['X', 3.6], ['2', 2.82]] },
  { eventId: 'madrid-v-atleti', sport: 'Soccer', eventName: 'Real Madrid v Atletico', live: false, marketName: '1X2', selections: [['1', 1.9], ['X', 3.4], ['2', 2.7]] },
  { eventId: 'nadal-v-alcaraz', sport: 'Tennis', eventName: 'Nadal v Alcaraz', live: true, marketName: 'Set Winner', selections: [['Nadal', 2.7], ['Alcaraz', 1.47]] },
  { eventId: 'swiatek-v-sabalenka', sport: 'Tennis', eventName: 'Swiatek v Sabalenka', live: false, marketName: 'Set Winner', selections: [['Swiatek', 2.3], ['Sabalenka', 1.62]] },
]

const demoUsers = [
  { id: 'u-demo', username: 'demo', password: 'demo1234', fullName: 'Demo User' },
  { id: 'u-test', username: 'test', password: 'test1234', fullName: 'Test User' },
]

const sessions = new Map()
const betBooks = new Map()
const placedRequests = new Map()

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function requireUserId(sessionToken) {
  const session = sessions.get(sessionToken)
  if (!session) throw new ProviderError('Your provider session is no longer valid.', { status: 401, code: 'provider_unauthorized' })
  return session.userId
}

function settledStake(userId) {
  return (placedRequests.get(userId) || []).reduce((sum, entry) => sum + entry.stake, 0)
}

export default {
  name: 'Mock provider (development only)',

  async authenticate({ username, password }) {
    await delay(100)
    const user = demoUsers.find((candidate) => candidate.username === username && candidate.password === password)
    if (!user) return null

    const sessionToken = randomUUID()
    sessions.set(sessionToken, { userId: user.id, createdAt: Date.now() })
    return {
      sessionToken,
      user: { id: user.id, username: user.username, fullName: user.fullName },
    }
  },

  async logout({ sessionToken }) {
    sessions.delete(sessionToken)
  },

  async getMarkets({ sport }) {
    await delay(100)
    const events = sport ? marketEvents.filter((event) => event.sport === sport) : marketEvents
    return events.map((event) => ({
      id: event.eventId,
      event: event.eventName,
      sport: event.sport,
      competition: event.sport === 'Cricket' ? 'BallByBall' : event.sport === 'Soccer' ? 'Premier League' : event.sport === 'Tennis' ? 'ATP' : 'Today',
      live: event.live,
      market: event.marketName,
      selections: event.selections.map(([label, price]) => ({
        selectionId: `${event.eventId}:${label}`,
        label,
        price,
      })),
    }))
  },

  async getAccount({ sessionToken }) {
    await delay(50)
    const userId = requireUserId(sessionToken)
    const balance = DEFAULT_BALANCE - settledStake(userId)
    return { balance, availableBalance: balance, currency: 'INR' }
  },

  async getBets({ sessionToken }) {
    await delay(50)
    const userId = requireUserId(sessionToken)
    return (betBooks.get(userId) || []).map(({ id, bet }) => ({
      id,
      event: bet.eventName,
      market: bet.marketName,
      selection: bet.selectionName,
      odds: bet.odds,
      stake: bet.stake,
      status: 'open',
      date: bet.placedAt,
    }))
  },

  async placeBet({ sessionToken, idempotencyKey, bet }) {
    await delay(150)
    const userId = requireUserId(sessionToken)

    const placed = placedRequests.get(userId) || []
    const duplicate = placed.find((entry) => entry.idempotencyKey === idempotencyKey)
    if (duplicate) {
      const existing = (betBooks.get(userId) || []).find((record) => record.id === duplicate.id)
      return { id: duplicate.id, bet: { ...existing.bet } }
    }

    const parsed = splitSelectionId(bet.selectionId)
    if (!parsed) throw new ProviderError('The selected market is no longer available.', { status: 400, code: 'provider_rejected' })

    const event = marketEvents.find((candidate) => candidate.eventId === parsed.eventId)
    if (!event) throw new ProviderError('The selected market is no longer available.', { status: 400, code: 'provider_rejected' })

    const selection = event.selections.find(([label]) => label === parsed.selectionId)
    if (!selection) throw new ProviderError('The selected outcome is no longer available.', { status: 400, code: 'provider_rejected' })

    // Confirms the current price rather than trusting the odds submitted by the client.
    if (Number(bet.odds) < selection[1]) {
      throw new ProviderError('The odds have moved, so your requested price is no longer available.', { status: 400, code: 'odds_moved' })
    }

    if (settledStake(userId) + Number(bet.stake) > DEFAULT_BALANCE) {
      throw new ProviderError('Your account does not have enough balance to cover this bet.', { status: 400, code: 'insufficient_funds' })
    }

    const settlement = {
      eventId: event.eventId,
      eventName: event.eventName,
      marketName: event.marketName,
      marketSelectionId: selection[0],
      selectionId: bet.selectionId,
      selectionName: selection[0],
      side: bet.side,
      odds: selection[1],
      stake: Number(bet.stake),
      placedAt: new Date().toISOString(),
    }
    const id = `mock-${randomUUID()}`
    placedRequests.set(userId, [...placed, { idempotencyKey, id, stake: settlement.stake }])
    betBooks.set(userId, [...(betBooks.get(userId) || []), { id, bet: settlement }])
    return { id, bet: { ...settlement } }
  },
}
