
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('./pins.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS pins (
    note_id INTEGER PRIMARY KEY
  )
`);

export default db;