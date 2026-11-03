import { randomUUID } from 'node:crypto'
import { databaseConfigured, query, withTransaction } from './database.mjs'

function assertMoney(amountMinor) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error('Money values must be positive integer minor units.')
  }
}

function assertIdentity(customerId, currency) {
  if (typeof customerId !== 'string' || !customerId.trim()) throw new Error('A customer id is required.')
  if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) throw new Error('Currency must be an ISO 4217 code.')
}

function requireWalletDatabase() {
  if (!databaseConfigured) {
    const error = new Error('PostgreSQL is required for wallet and ledger operations.')
    error.statusCode = 503
    throw error
  }
}

async function ensureAccount(clientQuery, customerId, currency) {
  const result = await clientQuery(
    `INSERT INTO wallet_accounts (customer_id, currency)
     VALUES ($1, $2)
     ON CONFLICT (customer_id, currency) DO UPDATE SET updated_at = NOW()
     RETURNING id, customer_id, currency, available_minor, held_minor, status`,
    [customerId, currency],
  )
  return result.rows[0]
}

export async function getWallet({ customerId, currency }) {
  requireWalletDatabase()
  assertIdentity(customerId, currency)
  const result = await query(
    `SELECT customer_id, currency, available_minor, held_minor, status
       FROM wallet_accounts
      WHERE customer_id = $1 AND currency = $2`,
    [customerId, currency],
  )
  return result.rows[0] || { customer_id: customerId, currency, available_minor: '0', held_minor: '0', status: 'active' }
}

export async function creditDeposit({ customerId, currency, amountMinor, provider, providerTransactionId, idempotencyKey, metadata = {} }) {
  requireWalletDatabase()
  assertIdentity(customerId, currency)
  assertMoney(amountMinor)
  if (!provider || !idempotencyKey) throw new Error('Payment provider and idempotency key are required.')

  return withTransaction(async (clientQuery) => {
    const existing = await clientQuery('SELECT * FROM payment_transactions WHERE idempotency_key = $1 FOR UPDATE', [idempotencyKey])
    if (existing.rows[0]) return existing.rows[0]
    await ensureAccount(clientQuery, customerId, currency)
    await clientQuery(
      `UPDATE wallet_accounts
          SET available_minor = available_minor + $1, updated_at = NOW()
        WHERE customer_id = $2 AND currency = $3 AND status = 'active'`,
      [amountMinor, customerId, currency],
    )
    await clientQuery(
      `INSERT INTO wallet_ledger_entries
        (customer_id, currency, bucket, amount_minor, entry_type, idempotency_key, reference, metadata)
       VALUES ($1, $2, 'available', $3, 'deposit', $4, $5, $6)`,
      [customerId, currency, amountMinor, `payment:${providerTransactionId || idempotencyKey}`, metadata],
    )
    const result = await clientQuery(
      `INSERT INTO payment_transactions
        (customer_id, direction, provider, provider_transaction_id, idempotency_key, amount_minor, currency, status, metadata)
       VALUES ($1, 'deposit', $2, $3, $4, $5, $6, 'succeeded', $7)
       RETURNING *`,
      [customerId, provider, providerTransactionId || null, idempotencyKey, amountMinor, currency, metadata],
    )
    return result.rows[0]
  })
}

export async function createManualDepositRequest({ customerId, currency, amountMinor, operatorId, idempotencyKey, metadata = {} }) {
  requireWalletDatabase()
  assertIdentity(customerId, currency)
  assertMoney(amountMinor)
  if (!operatorId || !idempotencyKey) throw new Error('Operator and idempotency key are required.')
  const result = await query(
    `INSERT INTO payment_transactions
      (customer_id, direction, provider, idempotency_key, amount_minor, currency, status, requested_by, metadata)
     VALUES ($1, 'deposit', 'manual', $2, $3, $4, 'pending', $5, $6)
     ON CONFLICT (idempotency_key) DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
     RETURNING *`,
    [customerId, idempotencyKey, amountMinor, currency, operatorId, metadata],
  )
  return result.rows[0]
}

export async function approveManualDeposit({ transactionId, operatorId, note = '' }) {
  requireWalletDatabase()
  return withTransaction(async (clientQuery) => {
    const payment = await clientQuery('SELECT * FROM payment_transactions WHERE id = $1 FOR UPDATE', [transactionId])
    const transaction = payment.rows[0]
    if (!transaction) {
      const error = new Error('Payment request was not found.')
      error.statusCode = 404
      throw error
    }
    if (transaction.direction !== 'deposit' || transaction.status !== 'pending') {
      const error = new Error('Only pending deposits can be approved.')
      error.statusCode = 409
      throw error
    }
    await ensureAccount(clientQuery, transaction.customer_id, transaction.currency)
    await clientQuery(
      `UPDATE wallet_accounts
          SET available_minor = available_minor + $1, updated_at = NOW()
        WHERE customer_id = $2 AND currency = $3 AND status = 'active'`,
      [transaction.amount_minor, transaction.customer_id, transaction.currency],
    )
    await clientQuery(
      `INSERT INTO wallet_ledger_entries
        (customer_id, currency, bucket, amount_minor, entry_type, idempotency_key, reference, metadata)
       VALUES ($1, $2, 'available', $3, 'deposit', $4, $5, $6)`,
      [transaction.customer_id, transaction.currency, transaction.amount_minor, `manual-deposit:${transaction.id}`, `payment:${transaction.id}`, { note }],
    )
    const result = await clientQuery(
      `UPDATE payment_transactions
          SET status = 'succeeded', reviewed_by = $1, reviewed_at = NOW(), review_note = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *`,
      [operatorId, note, transaction.id],
    )
    return result.rows[0]
  })
}

export async function rejectPayment({ transactionId, operatorId, note = '' }) {
  requireWalletDatabase()
  return withTransaction(async (clientQuery) => {
    const payment = await clientQuery('SELECT * FROM payment_transactions WHERE id = $1 FOR UPDATE', [transactionId])
    const transaction = payment.rows[0]
    if (!transaction) {
      const error = new Error('Payment request was not found.')
      error.statusCode = 404
      throw error
    }
    if (!['pending', 'processing'].includes(transaction.status)) {
      const error = new Error('Only pending or processing payments can be rejected.')
      error.statusCode = 409
      throw error
    }
    if (transaction.direction === 'withdrawal') {
      await ensureAccount(clientQuery, transaction.customer_id, transaction.currency)
      await clientQuery(
        `UPDATE wallet_accounts
            SET available_minor = available_minor + $1, updated_at = NOW()
          WHERE customer_id = $2 AND currency = $3`,
        [transaction.amount_minor, transaction.customer_id, transaction.currency],
      )
      await clientQuery(
        `INSERT INTO wallet_ledger_entries
          (customer_id, currency, bucket, amount_minor, entry_type, idempotency_key, reference, metadata)
         VALUES ($1, $2, 'available', $3, 'adjustment', $4, $5, $6)`,
        [transaction.customer_id, transaction.currency, transaction.amount_minor, `withdrawal-reversal:${transaction.id}`, `payment:${transaction.id}`, { note }],
      )
    }
    const result = await clientQuery(
      `UPDATE payment_transactions
          SET status = 'failed', reviewed_by = $1, reviewed_at = NOW(), review_note = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *`,
      [operatorId, note, transaction.id],
    )
    return result.rows[0]
  })
}

export async function completeManualWithdrawal({ transactionId, operatorId, providerTransactionId = null, note = '' }) {
  requireWalletDatabase()
  return withTransaction(async (clientQuery) => {
    const payment = await clientQuery('SELECT * FROM payment_transactions WHERE id = $1 FOR UPDATE', [transactionId])
    const transaction = payment.rows[0]
    if (!transaction) {
      const error = new Error('Payment request was not found.')
      error.statusCode = 404
      throw error
    }
    if (transaction.direction !== 'withdrawal' || transaction.status !== 'pending') {
      const error = new Error('Only pending withdrawals can be completed.')
      error.statusCode = 409
      throw error
    }
    const result = await clientQuery(
      `UPDATE payment_transactions
          SET status = 'succeeded', provider_transaction_id = $1, reviewed_by = $2,
              reviewed_at = NOW(), review_note = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING *`,
      [providerTransactionId, operatorId, note, transaction.id],
    )
    return result.rows[0]
  })
}

export async function listPaymentTransactions({ status, limit = 100 }) {
  requireWalletDatabase()
  const values = []
  const filters = []
  if (status) {
    values.push(status)
    filters.push(`status = $${values.length}`)
  }
  values.push(Math.min(Math.max(Number(limit) || 100, 1), 250))
  const result = await query(
    `SELECT * FROM payment_transactions
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY created_at DESC
      LIMIT $${values.length}`,
    values,
  )
  return result.rows
}

export async function requestWithdrawal({ customerId, currency, amountMinor, provider, operatorId, idempotencyKey, metadata = {} }) {
  requireWalletDatabase()
  assertIdentity(customerId, currency)
  assertMoney(amountMinor)
  if (!provider || !operatorId || !idempotencyKey) throw new Error('Payment provider, operator, and idempotency key are required.')

  return withTransaction(async (clientQuery) => {
    const existing = await clientQuery('SELECT * FROM payment_transactions WHERE idempotency_key = $1 FOR UPDATE', [idempotencyKey])
    if (existing.rows[0]) return existing.rows[0]
    await ensureAccount(clientQuery, customerId, currency)
    const wallet = await clientQuery(
      `UPDATE wallet_accounts
          SET available_minor = available_minor - $1, updated_at = NOW()
        WHERE customer_id = $2 AND currency = $3 AND status = 'active' AND available_minor >= $1
        RETURNING id`,
      [amountMinor, customerId, currency],
    )
    if (!wallet.rows[0]) {
      const error = new Error('Insufficient available funds.')
      error.statusCode = 409
      throw error
    }
    await clientQuery(
      `INSERT INTO wallet_ledger_entries
        (customer_id, currency, bucket, amount_minor, entry_type, idempotency_key, reference, metadata)
       VALUES ($1, $2, 'available', $3, 'withdrawal', $4, $5, $6)`,
      [customerId, currency, -amountMinor, `withdrawal:${idempotencyKey}`, `payment:${idempotencyKey}`, metadata],
    )
    const result = await clientQuery(
      `INSERT INTO payment_transactions
        (customer_id, direction, provider, idempotency_key, amount_minor, currency, status, requested_by, metadata)
       VALUES ($1, 'withdrawal', $2, $3, $4, $5, 'pending', $6, $7)
       RETURNING *`,
      [customerId, provider, idempotencyKey, amountMinor, currency, operatorId, metadata],
    )
    return result.rows[0]
  })
}

export async function reserveWagerFunds({ customerId, currency, eventId, selectionId, side, stakeMinor, odds, idempotencyKey }) {
  requireWalletDatabase()
  assertIdentity(customerId, currency)
  assertMoney(stakeMinor)
  if (!eventId || !selectionId || !['back', 'lay'].includes(side) || !Number.isFinite(odds) || odds <= 1 || !idempotencyKey) {
    throw new Error('A valid wager and idempotency key are required.')
  }

  return withTransaction(async (clientQuery) => {
    const existing = await clientQuery('SELECT * FROM wagers WHERE idempotency_key = $1 FOR UPDATE', [idempotencyKey])
    if (existing.rows[0]) return existing.rows[0]
    await ensureAccount(clientQuery, customerId, currency)
    const wallet = await clientQuery(
      `UPDATE wallet_accounts
          SET available_minor = available_minor - $1, held_minor = held_minor + $1, updated_at = NOW()
        WHERE customer_id = $2 AND currency = $3 AND status = 'active' AND available_minor >= $1
        RETURNING id`,
      [stakeMinor, customerId, currency],
    )
    if (!wallet.rows[0]) {
      const error = new Error('Insufficient available funds.')
      error.statusCode = 409
      throw error
    }
    const wagerId = randomUUID()
    await clientQuery(
      `INSERT INTO wallet_ledger_entries
        (customer_id, currency, bucket, amount_minor, entry_type, idempotency_key, reference)
       VALUES ($1, $2, 'available', $3, 'bet_hold', $4, $5),
              ($1, $2, 'held', $6, 'bet_hold', $7, $5)`,
      [customerId, currency, -stakeMinor, `${idempotencyKey}:available`, `wager:${wagerId}`, stakeMinor, `${idempotencyKey}:held`],
    )
    const result = await clientQuery(
      `INSERT INTO wagers
        (id, customer_id, idempotency_key, event_id, selection_id, side, stake_minor, odds, potential_payout_minor, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING *`,
      [wagerId, customerId, idempotencyKey, eventId, selectionId, side, stakeMinor, odds, Math.floor(stakeMinor * odds)],
    )
    return result.rows[0]
  })
}
