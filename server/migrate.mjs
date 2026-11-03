import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { closeDatabase, query } from './database.mjs'

const migrationPath = resolve(dirname(fileURLToPath(import.meta.url)), 'migrations', '001_admin.sql')

try {
  const migration = await readFile(migrationPath, 'utf8')
  await query(migration)
  console.log('Applied admin schema migration.')
} catch (error) {
  console.error(`Database migration failed: ${error.message}`)
  process.exitCode = 1
} finally {
  await closeDatabase()
}
