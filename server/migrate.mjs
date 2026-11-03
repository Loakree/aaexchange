import { readdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { closeDatabase, query } from './database.mjs'

const migrationsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), 'migrations')

try {
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith('.sql'))
    .sort()

  for (const migrationFile of migrationFiles) {
    const migration = await readFile(resolve(migrationsDirectory, migrationFile), 'utf8')
    await query(migration)
    console.log(`Applied schema migration: ${migrationFile}`)
  }
} catch (error) {
  console.error(`Database migration failed: ${error.message}`)
  process.exitCode = 1
} finally {
  await closeDatabase()
}
