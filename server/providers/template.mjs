// Template for a real licensed provider adapter.
//
// Copy this file to a name like `acme.mjs`, implement each method against the
// provider's documented API, then configure it:
//
//   $env:BETTING_PROVIDER_MODULE = 'server/providers/acme.mjs'
//   npm run dev:api
//
// Use the shared helpers in ./http.mjs (providerFetch, ProviderError,
// splitSelectionId, normalizeBet). Keep credentials in environment variables
// (for example ACME_BASE_URL, ACME_CLIENT_ID) and never commit them.
//
// Return shapes required by server/index.mjs are documented in README.md.
import {
  normalizeBet,
  ProviderError,
  providerFetch,
  splitSelectionId,
} from './http.mjs'

const baseUrl = process.env.ACME_BASE_URL

// Replaces a bearer token lookup with whatever auth model the provider uses.
async function getAuthToken({ username, password }) {
  const payload = await providerFetch(baseUrl, '/v1/sessions', {
    method: 'POST',
    body: { username, password },
  })
  if (!payload?.accessToken) {
    throw new ProviderError('The provider did not return an access token.', { code: 'provider_error' })
  }
  return payload.accessToken
}

export default {
  name: 'Acme Sports (licensed provider)',

  async authenticate({ username, password }) {
    try {
      const token = await getAuthToken({ username, password })
      return {
        sessionToken: token,
        user: { id: username, username, fullName: username },
      }
    } catch (error) {
      if (error instanceof ProviderError && error.status === 401) return null
      throw error
    }
  },

  async logout({ sessionToken }) {
    await providerFetch(baseUrl, '/v1/sessions/current', {
      method: 'DELETE',
      token: sessionToken,
    })
  },

  async getMarkets({ sport }) {
    const query = sport ? `?sport=${encodeURIComponent(sport)}` : ''
    const payload = await providerFetch(baseUrl, `/v1/markets${query}`)
    // Map provider markets to the shape the API and UI expect:
    //   { id, event, sport, live, market, selections: [{ selectionId, label, price }] }
    return (payload?.markets || []).map((market) => ({
      id: market.eventId,
      event: market.eventName,
      sport: market.sport,
      live: Boolean(market.live),
      market: market.marketName,
      selections: (market.selections || []).map((selection) => ({
        selectionId: `${market.eventId}:${selection.id}`,
        label: selection.name,
        price: Number(selection.odds),
      })),
    }))
  },

  async getAccount({ sessionToken }) {
    const payload = await providerFetch(baseUrl, '/v1/account', { token: sessionToken })
    return { balance: Number(payload?.balance ?? 0), currency: payload?.currency }
  },

  async getBets({ sessionToken }) {
    const payload = await providerFetch(baseUrl, '/v1/bets', { token: sessionToken })
    return (payload?.bets || []).map((record) => normalizeBet(record))
  },

  async placeBet({ sessionToken, idempotencyKey, bet }) {
      // The API hands back a composite `${eventId}:${selectionId}` identifier.
      const parsed = splitSelectionId(bet.selectionId)
      if (!parsed) {
        throw new ProviderError('The selected market is no longer available.', { status: 400, code: 'provider_rejected' })
      }

      // Pass the idempotency key through and rely on the provider to de-duplicate.
      const payload = await providerFetch(baseUrl, '/v1/bets', {
        method: 'POST',
        token: sessionToken,
        headers: { 'Idempotency-Key': idempotencyKey },
        body: {
          eventId: parsed.eventId,
          selectionId: parsed.selectionId,
          side: bet.side,
          stake: bet.stake,
          odds: bet.odds,
        },
      })
      // The provider must return the confirmed current odds, not echo the client's.
      return {
        id: payload?.betId ?? payload?.id,
        bet: {
          ...bet,
          odds: Number(payload?.odds ?? bet.odds),
        },
      }
    },
}
