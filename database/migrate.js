/**
 * Run this once to set up the database.
 * Usage:
 *   cd database
 *   POSTGRES_URL="postgres://..." node migrate.js
 *
 * Or with .env.local (from the frontend folder):
 *   cd database
 *   node -e "require('dotenv').config({path:'../frontend/.env.local'})" migrate.js
 */

const { Client } = require('pg')
const fs         = require('fs')
const path       = require('path')

async function run() {
  const url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL

  if (!url) {
    console.error('ERROR: Set POSTGRES_URL in your environment before running.')
    console.error('  Get it from: Vercel → Storage → your DB → .env.local tab')
    process.exit(1)
  }

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()
  console.log('Connected.')

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')

  // pg simple query protocol supports multiple statements in one call
  await client.query(schema)
  console.log('schema.sql  ✓')

  const migration = fs.readFileSync(
    path.join(__dirname, 'migrations', '001_edge_score.sql'), 'utf8'
  )
  await client.query(migration)
  console.log('001_edge_score.sql  ✓')

  await client.end()
  console.log('\nDatabase ready.')
}

run().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
