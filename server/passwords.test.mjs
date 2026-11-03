import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hashPassword, verifyPassword } from './passwords.mjs'

test('operator password hashes verify without storing plain text', async () => {
  const password = 'a-unique-local-admin-password'
  const hash = await hashPassword(password)
  assert.notEqual(hash, password)
  assert.match(hash, /^scrypt\$32768\$8\$1\$/)
  assert.equal(await verifyPassword(password, hash), true)
  assert.equal(await verifyPassword('incorrect-password', hash), false)
})

test('malformed stored password hashes are rejected', async () => {
  assert.equal(await verifyPassword('password', 'not-a-scrypt-hash'), false)
})
