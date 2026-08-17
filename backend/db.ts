import path from "path";
import dotenv from "dotenv";

// Initialisation robuste de dotenv avant tout import de module de base de données
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), ".env") });
if (typeof __dirname !== 'undefined') {
  dotenv.config({ path: path.join(__dirname, ".env") });
  dotenv.config({ path: path.join(__dirname, "..", ".env") });
  dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });
}

import initMariaDB from './mariadb.js';
import initSQLiteDB from './sqlite.js';

const useMariaDB = process.env.DB_HOST !== undefined;

let db: any;

if (useMariaDB) {
  try {
    db = initMariaDB();
  } catch (mariadbErr: any) {
    console.error("MariaDB initial connection failed. Falling back to SQLite:", mariadbErr?.message || mariadbErr);
    db = initSQLiteDB();
  }
} else {
  db = initSQLiteDB();
}

export default db;

