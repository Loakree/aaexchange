const DEFAULT_TIMEOUT_MS = 10_000

export class ProviderError extends Error {
  constructor(message, { status = 502, code = 'provider_error', retryable = false, cause } = {}) {
    super(message, cause ? { cause } : undefined)
    this.name = 'ProviderError'
    this.status = status
    this.code = code
    this.retryable = retryable
  }
}

// Maps provider HTTP failures onto the API's error contract: validation problems
// stay 4xx, everything else surfaces as a 502 so raw provider payloads never leak.
export function providerHttpError(status, payload = {}) {
  const detail = typeof payload.message === 'string'
    ? payload.message
    : typeof payload.error_description === 'string'
      ? payload.error_description
      : typeof payload.error === 'string'
        ? payload.error
        : ''

  if (status === 401 || status === 403) {
    return new ProviderError(detail || 'The provider rejected the request credentials.', { status, code: 'provider_unauthorized' })
  }
  if (status === 404) {
    return new ProviderError(detail || 'The provider could not find the requested resource.', { status, code: 'provider_not_found' })
  }
  if (status === 409) {
    return new ProviderError(detail || 'The provider reported a conflicting request.', { status: 409, code: 'provider_conflict' })
  }
  if (status === 400 || status === 422) {
    return new ProviderError(detail || 'The provider rejected the request as invalid.', { status: 400, code: 'provider_rejected' })
  }
  if (status === 429) {
    return new ProviderError(detail || 'The provider is rate limiting requests.', { status: 503, code: 'provider_rate_limited', retryable: true })
  }
  return new ProviderError(detail || `The provider returned an unexpected status (${status}).`, {
    status: 502,
    code: 'provider_error',
    retryable: status >= 500,
  })
}

function joinUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`
}

// Thin fetch wrapper used by adapters: applies a timeout, JSON encode/decode,
// bearer auth, and provider error translation.
export async function providerFetch(baseUrl, path, {
  method = 'GET',
  body,
  token,
  headers = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const requestHeaders = { Accept: 'application/json', ...headers }
  if (token) requestHeaders.Authorization = `Bearer ${token}`
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetch(joinUrl(baseUrl, path), {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new ProviderError('The provider did not respond in time.', { code: 'provider_timeout', retryable: true, cause: error })
    }
    throw new ProviderError('Could not reach the provider.', { code: 'provider_unreachable', retryable: true, cause: error })
  }

  const text = await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) throw providerHttpError(response.status, payload ?? {})
  return payload
}

// Market/selection identifiers are formed as `${eventId}:${selectionId}` because
// the browser bet slip only submits a single selectionId string.
export function splitSelectionId(selectionId) {
  const trimmed = typeof selectionId === 'string' ? selectionId.trim() : ''
  const separator = trimmed.indexOf(':')
  if (separator <= 0 || separator === trimmed.length - 1) return null
  return { eventId: trimmed.slice(0, separator), selectionId: trimmed.slice(separator + 1) }
}

// Bet history is normalised so the UI can rely on { id, event, market, selection, odds, stake, status, date }.
export function normalizeBet(record, fallback = {}) {
  return {
    id: String(record.id ?? record.betId ?? fallback.id ?? 'bet'),
    event: record.event ?? record.eventName ?? record.matchName ?? fallback.event ?? '',
    market: record.market ?? record.marketName ?? fallback.market ?? '',
    selection: record.selection ?? record.selectionName ?? fallback.selection ?? '',
    odds: Number(record.odds ?? record.price ?? fallback.odds ?? 0),
    stake: Number(record.stake ?? fallback.stake ?? 0),
    status: record.status ?? fallback.status ?? 'open',
    date: record.date ?? record.settledAt ?? record.placedAt ?? record.createdAt ?? fallback.date ?? '',
  }
}
