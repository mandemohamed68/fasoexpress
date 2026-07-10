const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(process.cwd(), 'local.db'));
const row = db.prepare("SELECT value FROM config WHERE key = 'app_config'").get();
console.log(row ? row.value : 'NOT FOUND');
