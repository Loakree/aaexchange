import pg from 'pg'

const { Pool } = pg
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null

export const databaseConfigured = Boolean(pool)

export function query(text, values) {
  if (!pool) {
    const error = new Error('PostgreSQL is not configured.')
    error.statusCode = 503
    throw error
  }
  return pool.query(text, values)
}

export async function withTransaction(callback) {
  if (!pool) {
    const error = new Error('PostgreSQL is not configured.')
    error.statusCode = 503
    throw error
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client.query.bind(client))
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

export async function closeDatabase() {
  if (pool) await pool.end()
}
