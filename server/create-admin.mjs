import pg from 'pg'
import { hashPassword } from './passwords.mjs'

const { Client } = pg
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const fullName = process.env.ADMIN_FULL_NAME?.trim()
const password = process.env.ADMIN_PASSWORD

if (!email || !fullName || !password || password.length < 14) {
  console.error('Set ADMIN_EMAIL, ADMIN_FULL_NAME, and ADMIN_PASSWORD (at least 14 characters).')
  process.exitCode = 1
} else {
  const connection = new Client({ connectionString: process.env.DATABASE_URL })
  try {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.')
    await connection.connect()
    await connection.query('BEGIN')
    const existing = await connection.query(
      "SELECT id FROM operator_accounts WHERE role = 'admin' AND disabled_at IS NULL LIMIT 1",
    )
    if (existing.rowCount > 0) throw new Error('An active administrator already exists; create additional operators through a protected admin workflow.')

    const passwordHash = await hashPassword(password)
    await connection.query(
      `INSERT INTO operator_accounts (email, full_name, password_hash, role)
       VALUES ($1, $2, $3, 'admin')`,
      [email, fullName, passwordHash],
    )
    await connection.query('COMMIT')
    console.log(`Created initial administrator account for ${email}.`)
  } catch (error) {
    await connection.query('ROLLBACK').catch(() => {})
    console.error(`Could not create administrator: ${error.message}`)
    process.exitCode = 1
  } finally {
    await connection.end()
  }
}
