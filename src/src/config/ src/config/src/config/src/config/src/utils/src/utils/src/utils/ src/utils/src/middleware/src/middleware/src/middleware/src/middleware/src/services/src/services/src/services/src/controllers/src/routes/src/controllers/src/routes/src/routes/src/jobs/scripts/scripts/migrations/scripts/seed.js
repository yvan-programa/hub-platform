// scripts/seed.js
const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'burundi_hub',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

const provinces = [
  { name: 'Bubanza', capital: 'Bubanza', population: 400000 },
  { name: 'Bujumbura Mairie', capital: 'Bujumbura', population: 800000 },
  { name: 'Bujumbura Rural', capital: 'Isale', population: 400000 },
  { name: 'Bururi', capital: 'Bururi', population: 300000 },
  { name: 'Cankuzo', capital: 'Cankuzo', population: 200000 },
  { name: 'Cibitoke', capital: 'Cibitoke', population: 450000 },
  { name: 'Gitega', capital: 'Gitega', population: 750000 },
  { name: 'Karuzi', capital: 'Karuzi', population: 450000 },
  { name: 'Kayanza', capital: 'Kayanza', population: 600000 },
  { name: 'Kirundo', capital: 'Kirundo', population: 650000 },
  { name: 'Makamba', capital: 'Makamba', population: 450000 },
  { name: 'Muramvya', capital: 'Muramvya', population: 300000 },
  { name: 'Muyinga', capital: 'Muyinga', population: 700000 },
  { name: 'Mwaro', capital: 'Mwaro', population: 300000 },
  { name: 'Ngozi', capital: 'Ngozi', population: 750000 },
  { name: 'Rumonge', capital: 'Rumonge', population: 400000 },
  { name: 'Rutana', capital: 'Rutana', population: 350000 },
  { name: 'Ruyigi', capital: 'Ruyigi', population: 400000 }
];

async function seed() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Seed admin user
    const passwordHash = await bcrypt.hash('Admin123!', 12);
    await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      ['admin@burundihub.bi', passwordHash, 'System Administrator', 'admin', '+25712345678']
    );
    console.log('✓ Admin user created (email: admin@burundihub.bi, password: Admin123!)');

    // Seed provinces
    for (const province of provinces) {
      await client.query(
        `INSERT INTO provinces (name, capital, population, description, languages)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [
          province.name,
          province.capital,
          province.population,
          `Province of ${province.name}`,
          ['fr', 'rn']
        ]
      );
    }
    console.log(`✓ Seeded ${provinces.length} provinces`);

    // Seed sample news
    const newsCategories = ['politics', 'economy', 'culture', 'sports', 'technology'];
    for (let i = 0; i < 20; i++) {
      await client.query(
        `INSERT INTO news_articles (title, content, category, author, published)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          `Sample Article ${i + 1}`,
          `This is the content of sample article ${i + 1}. It contains detailed information about the topic.`,
          newsCategories[i % newsCategories.length],
          'Admin',
          true
        ]
      );
    }
    console.log('✓ Seeded 20 sample news articles');

    console.log('\n✓ Seeding completed successfully!');
  } catch (error) {
    console.error('✗ Seeding error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
