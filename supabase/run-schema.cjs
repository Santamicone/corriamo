const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')

const client = new Client({
  host: 'db.wshjtgtmxbxhpdqtxpiq.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'F76Nc*,PcryC6Gh',
  ssl: { rejectUnauthorized: false }
})

async function run() {
  await client.connect()
  console.log('Connesso al database.')
  try {
    await client.query(sql)
    console.log('✓ Schema applicato con successo.')
  } catch (e) {
    console.error('Errore:', e.message)
  } finally {
    await client.end()
  }
}

run()
