import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const dbPath = path.join(process.cwd(), 'database.sqlite');
export const db = new Database(dbPath, { verbose: console.log });

db.pragma('journal_mode = WAL');

export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS oauth_credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      expires_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS calendars (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider_calendar_id TEXT,
      sync_token TEXT,
      channel_id TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      calendar_id TEXT NOT NULL,
      provider_event_id TEXT,
      title TEXT,
      start_time DATETIME,
      end_time DATETIME,
      startH REAL,
      endH REAL,
      date TEXT,
      color TEXT,
      description TEXT,
      status TEXT,
      FOREIGN KEY (calendar_id) REFERENCES calendars(id)
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      duration_minutes INTEGER,
      completed BOOLEAN DEFAULT 0,
      due_date DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // ─── Schema Migrations ─────────────────────────────────────────
  // ALTER TABLE is needed because CREATE TABLE IF NOT EXISTS won't add
  // new columns to a table that already exists from a previous version.
  const migrations = [
    `ALTER TABLE events ADD COLUMN color TEXT`,
    `ALTER TABLE events ADD COLUMN description TEXT`,
    `ALTER TABLE events ADD COLUMN startH REAL`,
    `ALTER TABLE events ADD COLUMN endH REAL`,
    `ALTER TABLE events ADD COLUMN date TEXT`,
  ];

  for (const sql of migrations) {
    try {
      db.exec(sql);
      console.log(`Migration applied: ${sql}`);
    } catch (err: any) {
      // "duplicate column name" means already migrated — safe to ignore
      if (!err.message.includes('duplicate column')) {
        console.error('Migration error:', err.message);
      }
    }
  }

  // Seed a local developer user if none exists so they can work entirely offline
  const userCount = (db.prepare('SELECT count(*) as count FROM users').get() as any).count;
  if (userCount === 0) {
    const userId = crypto.randomUUID();
    const calId = crypto.randomUUID();
    db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run(userId, 'local@rainbow.ai');
    db.prepare('INSERT INTO calendars (id, user_id, provider_calendar_id) VALUES (?, ?, ?)').run(calId, userId, 'local-primary');
    console.log('--- SEEDED LOCAL OFFLINE USER ---');
  }

  console.log('Database initialized successfully.');
}

initDB();
