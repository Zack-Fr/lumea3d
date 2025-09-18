const { hash: argon2Hash } = require('@node-rs/argon2');
const { Client } = require('pg');

const email = process.env.EMAIL || 'momo@example.com';
const newPassword = process.env.NEW_PASSWORD || 'momo123';

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'lumea_db',
  user: 'postgres',
  password: 'postgres',
});

async function run() {
  try {
    await client.connect();
    console.log(`Connected. Updating password for ${email}...`);

    const userRes = await client.query('SELECT id FROM "User" WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      console.error('User not found');
      process.exit(1);
    }

    const hash = await argon2Hash(newPassword);
    await client.query('UPDATE "User" SET "passwordHash" = $1 WHERE email = $2', [hash, email]);
    console.log('Password updated successfully');
  } catch (e) {
    console.error('Failed:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
