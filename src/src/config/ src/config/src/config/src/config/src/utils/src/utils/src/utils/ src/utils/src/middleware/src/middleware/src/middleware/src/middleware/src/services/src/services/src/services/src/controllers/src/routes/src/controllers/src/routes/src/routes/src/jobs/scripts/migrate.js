// scripts/migrate.js
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'burundi_hub',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

async function runMigrations() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('✓ Connected to database');

    const migrationFile = path.join(__dirname, 'migrations', '001-create-tables.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    await client.query(sql);
    console.log('✓ Migrations completed successfully');
  } catch (error) {
    console.error('✗ Migration error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
