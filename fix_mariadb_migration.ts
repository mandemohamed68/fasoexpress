import fs from 'fs';
let content = fs.readFileSync('backend/mariadb.ts', 'utf-8');

content = content.replace(
  /connection\.query\("ALTER TABLE ([\w_]+) ADD COLUMN IF NOT EXISTS ([\w_]+) (.*?)"\);/g,
  `try { connection.query("ALTER TABLE $1 ADD COLUMN $2 $3"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column $2 to $1:", e.message); }`
);

fs.writeFileSync('backend/mariadb.ts', content);
