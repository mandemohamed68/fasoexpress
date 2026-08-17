var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_vite = require("vite");
var import_path3 = __toESM(require("path"), 1);
var import_dotenv2 = __toESM(require("dotenv"), 1);

// backend/db.ts
var import_path2 = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);

// backend/mariadb.ts
var import_mysql2 = __toESM(require("mysql2"), 1);
var import_sync_mysql = __toESM(require("sync-mysql"), 1);
function cleanEnvVal(val, defaultVal = "") {
  if (!val) return defaultVal;
  let s = val.trim();
  if (s.startsWith('"') && s.endsWith('"') || s.startsWith("'") && s.endsWith("'")) {
    s = s.substring(1, s.length - 1);
  }
  return s;
}
function initMariaDB() {
  const host = cleanEnvVal(process.env.DB_HOST, "127.0.0.1");
  const user = cleanEnvVal(process.env.DB_USER, "root");
  const database = cleanEnvVal(process.env.DB_NAME, "faso_express_db");
  const rawPort = cleanEnvVal(process.env.DB_PORT, "3306");
  const port = parseInt(rawPort) || 3306;
  const passwordRaw = process.env.DB_PASSWORD || process.env.DB_PASS || "";
  const candidates = [];
  candidates.push(passwordRaw);
  const cleaned = cleanEnvVal(passwordRaw);
  if (!candidates.includes(cleaned)) {
    candidates.push(cleaned);
  }
  const withDoubleQuotes = `"${cleaned}"`;
  if (!candidates.includes(withDoubleQuotes)) {
    candidates.push(withDoubleQuotes);
  }
  const withSingleQuotes = `'${cleaned}'`;
  if (!candidates.includes(withSingleQuotes)) {
    candidates.push(withSingleQuotes);
  }
  console.log(`MariaDB: Tentative de connexion (host=${host}, port=${port}, user=${user}, database=${database}). ${candidates.length} variantes de mot de passe \xE0 tester.`);
  let connection = null;
  let lastError = null;
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    try {
      const conn = new import_sync_mysql.default({
        host,
        user,
        password: candidate,
        database,
        port,
        multipleStatements: true,
        charset: "utf8mb4"
      });
      conn.query("SELECT 1");
      connection = conn;
      try {
        conn.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
      } catch (e) {
      }
      try {
        conn.query(`ALTER DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      } catch (e) {
      }
      console.log(`MariaDB: Connexion r\xE9ussie \xE0 la tentative ${i + 1}/${candidates.length} (Longueur MDP utilis\xE9e: ${candidate.length}) !`);
      break;
    } catch (err) {
      console.warn(`MariaDB: Tentative ${i + 1}/${candidates.length} \xE9chou\xE9e avec mot de passe de longueur ${candidate.length}: ${err.message}`);
      lastError = err;
    }
  }
  if (!connection) {
    console.error("MariaDB: Toutes les tentatives de connexion ont \xE9chou\xE9.");
    throw lastError || new Error("Impossible de se connecter \xE0 MariaDB avec les configurations de mot de passe fournies.");
  }
  try {
    const tablesToFix = ["users", "deliveries", "notifications", "announcements", "sectors", "bids", "withdrawals", "config", "tracking", "messages", "promo_codes", "promo_usages", "historique_gains"];
    for (const t of tablesToFix) {
      try {
        connection.query(`ALTER TABLE \`${t}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      } catch (e) {
      }
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN withdrawalPhone varchar(50) DEFAULT NULL AFTER phone");
    } catch (e) {
      if (!e.message.includes("Duplicate column name")) console.error("Failed to add column withdrawalPhone to users:", e.message);
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN rib varchar(255) DEFAULT NULL AFTER withdrawalPhone");
    } catch (e) {
      if (!e.message.includes("Duplicate column name")) console.error("Failed to add column rib to users:", e.message);
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN idCardFront text DEFAULT NULL AFTER rib");
    } catch (e) {
      if (!e.message.includes("Duplicate column name")) console.error("Failed to add column idCardFront to users:", e.message);
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN idCardBack text DEFAULT NULL AFTER idCardFront");
    } catch (e) {
      if (!e.message.includes("Duplicate column name")) console.error("Failed to add column idCardBack to users:", e.message);
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN guarantorName varchar(255) DEFAULT NULL AFTER idCardBack");
    } catch (e) {
      if (!e.message.includes("Duplicate column name")) console.error("Failed to add column guarantorName to users:", e.message);
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN guarantorPhone varchar(50) DEFAULT NULL AFTER guarantorName");
    } catch (e) {
      if (!e.message.includes("Duplicate column name")) console.error("Failed to add column guarantorPhone to users:", e.message);
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN guarantorCniUrl text DEFAULT NULL AFTER guarantorPhone");
    } catch (e) {
      if (!e.message.includes("Duplicate column name")) console.error("Failed to add column guarantorCniUrl to users:", e.message);
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN criminalRecordUrl text DEFAULT NULL AFTER guarantorCniUrl");
    } catch (e) {
      if (!e.message.includes("Duplicate column name")) console.error("Failed to add column criminalRecordUrl to users:", e.message);
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN verificationStatus varchar(50) DEFAULT 'unverified'");
    } catch (e) {
      if (!e.message.includes("Duplicate column name")) console.error("Failed to add column verificationStatus to users:", e.message);
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN totalWithdrawn double DEFAULT 0 AFTER earnings");
    } catch (e) {
      if (!e.message.includes("Duplicate column name")) console.error("Failed to add column totalWithdrawn to users:", e.message);
    }
    try {
      try {
        connection.query("ALTER TABLE users ADD COLUMN identityCardUrl LONGTEXT DEFAULT NULL");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column identityCardUrl to users:", e.message);
      }
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE users MODIFY COLUMN identityCardUrl LONGTEXT");
    } catch (e) {
    }
    try {
      try {
        connection.query("ALTER TABLE users ADD COLUMN identityCardBackUrl LONGTEXT DEFAULT NULL");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column identityCardBackUrl to users:", e.message);
      }
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE users MODIFY COLUMN identityCardBackUrl LONGTEXT");
    } catch (e) {
    }
    try {
      try {
        connection.query("ALTER TABLE users ADD COLUMN criminalRecordUrl LONGTEXT DEFAULT NULL");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column criminalRecordUrl to users:", e.message);
      }
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE users MODIFY COLUMN criminalRecordUrl LONGTEXT");
    } catch (e) {
    }
    try {
      try {
        connection.query("ALTER TABLE users ADD COLUMN guarantorCniUrl LONGTEXT DEFAULT NULL");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column guarantorCniUrl to users:", e.message);
      }
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE users MODIFY COLUMN guarantorCniUrl LONGTEXT");
    } catch (e) {
    }
    try {
      try {
        connection.query("ALTER TABLE users ADD COLUMN idCardFront LONGTEXT DEFAULT NULL");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column idCardFront to users:", e.message);
      }
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE users MODIFY COLUMN idCardFront LONGTEXT");
    } catch (e) {
    }
    try {
      try {
        connection.query("ALTER TABLE users ADD COLUMN idCardBack LONGTEXT DEFAULT NULL");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column idCardBack to users:", e.message);
      }
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE users MODIFY COLUMN idCardBack LONGTEXT");
    } catch (e) {
    }
    try {
      try {
        connection.query("ALTER TABLE users ADD COLUMN photoURL LONGTEXT DEFAULT NULL");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column photoURL to users:", e.message);
      }
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE users MODIFY COLUMN photoURL LONGTEXT");
    } catch (e) {
    }
    try {
      try {
        connection.query("ALTER TABLE users ADD COLUMN carteGriseUrl LONGTEXT DEFAULT NULL");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column carteGriseUrl to users:", e.message);
      }
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE users MODIFY COLUMN carteGriseUrl LONGTEXT");
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN termsAcceptedAt datetime DEFAULT NULL");
    } catch (e) {
      if (!e.message.includes("Duplicate column name")) console.error("Failed to add column termsAcceptedAt to users:", e.message);
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN driverType varchar(50) DEFAULT 'freelance'");
    } catch (e) {
      if (!e.message.includes("Duplicate column name")) console.error("Failed to add column driverType to users:", e.message);
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN resetCode varchar(255) DEFAULT NULL");
    } catch (e) {
      if (!e.message.includes("Duplicate column name")) console.error("Failed to add column resetCode to users:", e.message);
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN resetExpires varchar(255) DEFAULT NULL");
    } catch (e) {
      if (!e.message.includes("Duplicate column name")) console.error("Failed to add column resetExpires to users:", e.message);
    }
    connection.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id varchar(255) PRIMARY KEY,
        title varchar(255) NOT NULL,
        message text NOT NULL,
        type varchar(50) DEFAULT 'info',
        targetRole varchar(50) DEFAULT 'all',
        activeUntil datetime DEFAULT NULL,
        image_url LONGTEXT,
        createdAt datetime DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    try {
      try {
        connection.query("ALTER TABLE announcements ADD COLUMN type varchar(50) DEFAULT 'info'");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column type to announcements:", e.message);
      }
    } catch (e) {
    }
    try {
      try {
        connection.query("ALTER TABLE announcements ADD COLUMN targetRole varchar(50) DEFAULT 'all'");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column targetRole to announcements:", e.message);
      }
    } catch (e) {
    }
    try {
      try {
        connection.query("ALTER TABLE announcements ADD COLUMN activeUntil datetime DEFAULT NULL");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column activeUntil to announcements:", e.message);
      }
    } catch (e) {
    }
    try {
      try {
        connection.query("ALTER TABLE announcements ADD COLUMN is_active tinyint(1) DEFAULT 1");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column is_active to announcements:", e.message);
      }
    } catch (e) {
    }
    try {
      try {
        connection.query("ALTER TABLE announcements ADD COLUMN image_url LONGTEXT DEFAULT NULL");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column image_url to announcements:", e.message);
      }
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE withdrawals ADD COLUMN withdrawalInfo text DEFAULT NULL");
    } catch (e) {
      if (!e.message.includes("Duplicate column name")) console.error("Failed to add column withdrawalInfo to withdrawals:", e.message);
    }
    try {
      try {
        connection.query("ALTER TABLE deliveries ADD COLUMN lastMessageAt datetime DEFAULT NULL");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column lastMessageAt to deliveries:", e.message);
      }
    } catch (e) {
      console.error("Failed to add lastMessageAt to deliveries:", e.message);
    }
    try {
      try {
        connection.query("ALTER TABLE deliveries ADD COLUMN cancelledBy varchar(255) DEFAULT NULL");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column cancelledBy to deliveries:", e.message);
      }
    } catch (e) {
      console.error("Failed to add cancelledBy to deliveries:", e.message);
    }
    try {
      try {
        connection.query("ALTER TABLE deliveries ADD COLUMN rejectedBy TEXT DEFAULT NULL");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column rejectedBy to deliveries:", e.message);
      }
    } catch (e) {
      console.error("Failed to add rejectedBy to deliveries:", e.message);
    }
    try {
      try {
        connection.query("ALTER TABLE deliveries ADD COLUMN rating double DEFAULT NULL");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column rating to deliveries:", e.message);
      }
    } catch (e) {
    }
    try {
      try {
        connection.query("ALTER TABLE deliveries ADD COLUMN feedback TEXT DEFAULT NULL");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column feedback to deliveries:", e.message);
      }
    } catch (e) {
    }
    try {
      try {
        connection.query("ALTER TABLE deliveries ADD COLUMN proofImage LONGTEXT DEFAULT NULL");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column proofImage to deliveries:", e.message);
      }
    } catch (e) {
    }
    connection.query(`
      CREATE TABLE IF NOT EXISTS sectors (
        id varchar(255) PRIMARY KEY,
        name varchar(255) NOT NULL,
        city varchar(255) NOT NULL,
        isActive tinyint(1) DEFAULT 1,
        is_active tinyint(1) DEFAULT 1,
        image_url LONGTEXT DEFAULT NULL,
        createdAt datetime DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    try {
      try {
        connection.query("ALTER TABLE sectors ADD COLUMN isActive tinyint(1) DEFAULT 1");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column isActive to sectors:", e.message);
      }
    } catch (e) {
    }
    try {
      try {
        connection.query("ALTER TABLE sectors ADD COLUMN is_active tinyint(1) DEFAULT 1");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column is_active to sectors:", e.message);
      }
    } catch (e) {
    }
    try {
      try {
        connection.query("ALTER TABLE sectors ADD COLUMN image_url LONGTEXT DEFAULT NULL");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column image_url to sectors:", e.message);
      }
    } catch (e) {
    }
    try {
      try {
        connection.query("ALTER TABLE sectors ADD COLUMN updatedAt datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column updatedAt to sectors:", e.message);
      }
    } catch (e) {
    }
    connection.query(`
      CREATE TABLE IF NOT EXISTS bids (
        id varchar(255) PRIMARY KEY,
        deliveryId varchar(255) NOT NULL,
        driverId varchar(255) NOT NULL,
        driverName varchar(255) DEFAULT NULL,
        price double NOT NULL,
        proposedTime int DEFAULT NULL,
        reason text DEFAULT NULL,
        status varchar(50) DEFAULT 'pending',
        attempts int DEFAULT 1,
        createdAt datetime DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    connection.query(`
      CREATE TABLE IF NOT EXISTS tracking (
        id varchar(255) PRIMARY KEY,
        deliveryId varchar(255) NOT NULL,
        lat double NOT NULL,
        lng double NOT NULL,
        timestamp datetime DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id varchar(255) PRIMARY KEY,
        userId varchar(255) NOT NULL,
        title varchar(255) NOT NULL,
        message text NOT NULL,
        type varchar(50) DEFAULT 'info',
        link text,
        isRead tinyint(1) DEFAULT 0,
        createdAt datetime DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    connection.query(`
      CREATE TABLE IF NOT EXISTS historique_gains (
        id varchar(255) PRIMARY KEY,
        driverId varchar(255) NOT NULL,
        type varchar(50) NOT NULL,
        amount double NOT NULL,
        createdAt datetime DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    connection.query(`
      CREATE TABLE IF NOT EXISTS driver_mission_history (
        id varchar(255) PRIMARY KEY,
        driverId varchar(255) NOT NULL,
        deliveryId varchar(255) NOT NULL,
        action varchar(50) NOT NULL,
        createdAt datetime DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id varchar(255) PRIMARY KEY,
        deliveryId varchar(255) NOT NULL,
        text text NOT NULL,
        senderId varchar(255) NOT NULL,
        senderName varchar(255),
        senderRole varchar(50),
        createdAt datetime DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    connection.query(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        code varchar(255) PRIMARY KEY,
        type varchar(50) NOT NULL,
        value double NOT NULL,
        start_date varchar(255),
        end_date varchar(255),
        max_uses int,
        uses_count int DEFAULT 0,
        max_per_user int DEFAULT 1,
        is_active tinyint(1) DEFAULT 1,
        created_at datetime DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    connection.query(`
      CREATE TABLE IF NOT EXISTS promo_usages (
        id varchar(255) PRIMARY KEY,
        code varchar(255) NOT NULL,
        userId varchar(255) NOT NULL,
        deliveryId varchar(255),
        used_at datetime DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    connection.query(`
      CREATE TABLE IF NOT EXISTS user_push_tokens (
        id int AUTO_INCREMENT PRIMARY KEY,
        userId varchar(255) NOT NULL,
        token varchar(255) NOT NULL UNIQUE,
        deviceType varchar(50),
        createdAt datetime DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log("MariaDB: V\xE9rification/Ajout des colonnes de profil et syst\xE8me r\xE9ussie.");
  } catch (err) {
    console.warn("Migration MariaDB (profil) ignor\xE9e ou \xE9chou\xE9e:", err.message);
  }
  return {
    engine: "MariaDB",
    config: {
      host,
      database
    },
    prepare: (sql) => {
      if (sql.trim().toUpperCase().startsWith("PRAGMA")) {
        const pragmaMatch = sql.trim().match(/PRAGMA table_info\((.*?)\)/i);
        if (pragmaMatch && pragmaMatch[1]) {
          const tableName = pragmaMatch[1];
          return {
            get: () => ({}),
            all: () => {
              try {
                const cols = connection.query(`SHOW COLUMNS FROM ${tableName}`);
                return cols.map((c) => ({ name: c.Field }));
              } catch (e) {
                return [];
              }
            },
            run: () => ({ changes: 0 })
          };
        }
        return { get: () => ({}), all: () => [], run: () => ({ changes: 0 }) };
      }
      const execute = (args) => {
        let formattedSql = sql;
        formattedSql = formattedSql.replace(/INSERT\s+OR\s+IGNORE\s+INTO/i, "INSERT IGNORE INTO");
        formattedSql = formattedSql.replace(/INSERT\s+OR\s+REPLACE\s+INTO/i, "REPLACE INTO");
        const processedArgs = args.map((arg) => typeof arg === "boolean" ? arg ? 1 : 0 : arg);
        if (processedArgs && processedArgs.length > 0) {
          formattedSql = import_mysql2.default.format(formattedSql, processedArgs);
        }
        try {
          const result = connection.query(formattedSql);
          return result;
        } catch (e) {
          const errMsg = e.message || "";
          if (errMsg.includes("nativeNC") || errMsg.includes("socket") || errMsg.includes("connection") || errMsg.includes("read ECONNRESET") || errMsg.includes("write EPIPE")) {
            console.warn("MariaDB connection lost, attempting reconnect... (Error: " + errMsg + ")");
            try {
              connect();
              console.log("MariaDB reconnected successfully. Retrying query...");
              return connection.query(formattedSql);
            } catch (reconnectErr) {
              console.error("MariaDB reconnect failed:", reconnectErr);
              throw e;
            }
          }
          console.error("MariaDB query error:", e.message, "\\nSQL:", formattedSql);
          throw e;
        }
      };
      return {
        get: (...args) => {
          const res = execute(args);
          if (Array.isArray(res) && res.length > 0) return res[0];
          return void 0;
        },
        all: (...args) => {
          const res = execute(args);
          if (Array.isArray(res)) return res;
          return [];
        },
        run: (...args) => {
          const res = execute(args);
          return {
            changes: res.affectedRows || 0,
            lastInsertRowid: res.insertId || 0
          };
        }
      };
    },
    exec: (sql) => {
      if (sql.trim().toUpperCase().startsWith("PRAGMA")) return;
      try {
        connection.query(sql);
      } catch (err) {
        console.warn("DB exec warning:", err.message);
      }
    },
    transaction: (cb) => {
      return (...args) => {
        connection.query("START TRANSACTION");
        try {
          const res = cb(...args);
          connection.query("COMMIT");
          return res;
        } catch (e) {
          connection.query("ROLLBACK");
          throw e;
        }
      };
    },
    close: () => {
      if (connection.dispose) connection.dispose();
    }
  };
}

// backend/sqlite.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
function initSQLiteDB() {
  const dbPath = process.env.DATABASE_URL || import_path.default.join(process.cwd(), "local.db");
  let db2;
  let isCorrupted = false;
  const registerCompatCollations = (d) => {
    try {
      const compare = (a, b) => {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      };
      d.collation("utf8mb4_unicode_ci", compare);
      d.collation("utf8mb4_general_ci", compare);
    } catch (e) {
      console.warn("Failed to register compatibility collations:", e);
    }
  };
  try {
    db2 = new import_better_sqlite3.default(dbPath);
    registerCompatCollations(db2);
    const integrity = db2.prepare("PRAGMA integrity_check").get();
    if (integrity && integrity.integrity_check !== "ok" && integrity["integrity_check"] !== "ok") {
      isCorrupted = true;
    }
    if (!isCorrupted) {
      try {
        db2.prepare("SELECT 1 FROM deliveries LIMIT 1").get();
      } catch (err) {
        if (err.message && (err.message.includes("_users_old") || err.message.includes("malformed") || err.message.includes("corrupt") || err.message.includes("disk image"))) {
          isCorrupted = true;
        }
      }
    }
  } catch (err) {
    console.error("Early database load failure:", err);
    isCorrupted = true;
  }
  if (isCorrupted) {
    console.warn("Database structure is corrupted or malformed. Auto-rebuilding a fresh local.db...");
    if (db2) {
      try {
        db2.close();
      } catch {
      }
    }
    try {
      if (import_fs.default.existsSync(dbPath)) {
        import_fs.default.unlinkSync(dbPath);
      }
    } catch (fsErr) {
      console.error("Failed to delete corrupted local.db:", fsErr);
    }
    db2 = new import_better_sqlite3.default(dbPath);
    registerCompatCollations(db2);
  }
  try {
    db2.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    userId TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT, -- For local auth
    role TEXT CHECK(role IN ('client', 'driver', 'admin', 'superadmin')) NOT NULL,
    status TEXT DEFAULT 'online',
    accountStatus TEXT DEFAULT 'active', -- active, rejected, suspended
    isVerified INTEGER DEFAULT 0,
    city TEXT,
    neighborhood TEXT,
    verificationStatus TEXT DEFAULT 'pending',
    guarantorName TEXT,
    guarantorPhone TEXT,
    identityCardUrl TEXT,
    criminalRecordUrl TEXT,
    currentLocation TEXT, -- JSON string
    balance REAL DEFAULT 0,
    earnings REAL DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email, role)
  );

  CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY,
    clientId TEXT NOT NULL,
    clientName TEXT,
    driverId TEXT,
    driverName TEXT,
    origin TEXT NOT NULL, -- JSON string {lat, lng, address}
    destination TEXT NOT NULL, -- JSON string {lat, lng, address}
    cost REAL NOT NULL,
    status TEXT CHECK(status IN ('pending', 'accepted', 'picked_up', 'delivered', 'cancelled')) DEFAULT 'pending',
    paymentStatus TEXT DEFAULT 'pending',
    paymentMethod TEXT,
    paymentReference TEXT,
    isPaid INTEGER DEFAULT 0, -- Boolean
    paidToDriver INTEGER DEFAULT 0, -- Boolean
    pickupCode TEXT,
    deliveryCode TEXT,
    rejectedBy TEXT, -- JSON array
    proofImage TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(clientId) REFERENCES users(userId),
    FOREIGN KEY(driverId) REFERENCES users(userId)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    deliveryId TEXT NOT NULL,
    text TEXT NOT NULL,
    senderId TEXT NOT NULL,
    senderName TEXT,
    senderRole TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(deliveryId) REFERENCES deliveries(id),
    FOREIGN KEY(senderId) REFERENCES users(userId)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    link TEXT,
    isRead INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(userId)
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    targetRole TEXT DEFAULT 'all',
    activeUntil DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sectors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    isActive INTEGER DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL -- JSON string
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id TEXT PRIMARY KEY,
    driverId TEXT NOT NULL,
    driverName TEXT,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    method TEXT,
    phone TEXT,
    withdrawalInfo TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    processedAt DATETIME,
    FOREIGN KEY(driverId) REFERENCES users(userId)
  );

  CREATE TABLE IF NOT EXISTS tracking (
    id TEXT PRIMARY KEY,
    deliveryId TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(deliveryId) REFERENCES deliveries(id)
  );

  CREATE TABLE IF NOT EXISTS bids (
    id TEXT PRIMARY KEY,
    deliveryId TEXT NOT NULL,
    driverId TEXT NOT NULL,
    driverName TEXT,
    price REAL NOT NULL,
    proposedTime INTEGER,
    reason TEXT,
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected
    attempts INTEGER DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(deliveryId) REFERENCES deliveries(id),
    FOREIGN KEY(driverId) REFERENCES users(userId)
  );

  CREATE TABLE IF NOT EXISTS driver_mission_history (
    id TEXT PRIMARY KEY,
    driverId TEXT NOT NULL,
    deliveryId TEXT NOT NULL,
    action TEXT NOT NULL, -- 'accepted', 'rejected', 'assigned'
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_push_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    deviceType TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
  } catch (err) {
    console.error("Critical error during database schema creation:", err);
  }
  try {
    db2.exec("ALTER TABLE bids ADD COLUMN attempts INTEGER DEFAULT 1");
    console.log("Migration: Added column attempts to bids table");
  } catch (err) {
  }
  const colsToAdd = [
    { name: "vehicleType", type: "TEXT" },
    { name: "senderPhone", type: "TEXT" },
    { name: "recipientPhone", type: "TEXT" },
    { name: "packageDetails", type: "TEXT" },
    { name: "baseCost", type: "REAL" },
    { name: "clientProposedPrice", type: "REAL" },
    { name: "isUrgent", type: "INTEGER DEFAULT 0" },
    { name: "urgentFee", type: "REAL DEFAULT 0" },
    { name: "boostAmount", type: "REAL DEFAULT 0" },
    { name: "lastMessageAt", type: "TEXT" },
    { name: "cancelReason", type: "TEXT" },
    { name: "cancellationReason", type: "TEXT" },
    { name: "rejectedBy", type: "TEXT" },
    { name: "rating", type: "REAL" },
    { name: "feedback", type: "TEXT" },
    { name: "proofImage", type: "TEXT" }
  ];
  const withdrawCols = [
    { name: "withdrawalInfo", type: "TEXT" }
  ];
  const userCols = [
    { name: "rib", type: "TEXT" },
    { name: "guarantorName", type: "TEXT" },
    { name: "guarantorPhone", type: "TEXT" },
    { name: "identityCardUrl", type: "TEXT" },
    { name: "identityCardBackUrl", type: "TEXT" },
    { name: "criminalRecordUrl", type: "TEXT" },
    { name: "verificationStatus", type: "TEXT" },
    { name: "resetCode", type: "TEXT" },
    { name: "resetExpires", type: "TEXT" }
  ];
  colsToAdd.forEach((col) => {
    try {
      db2.exec(`ALTER TABLE deliveries ADD COLUMN ${col.name} ${col.type}`);
    } catch (err) {
    }
  });
  withdrawCols.forEach((col) => {
    try {
      db2.exec(`ALTER TABLE withdrawals ADD COLUMN ${col.name} ${col.type}`);
    } catch (err) {
    }
  });
  userCols.forEach((col) => {
    try {
      db2.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
    } catch (err) {
    }
  });
  try {
    const tableInfo = db2.prepare("SELECT sql FROM sqlite_schema WHERE type='table' AND name='users'").get();
    if (tableInfo && tableInfo.sql && !tableInfo.sql.includes("superadmin")) {
      console.log("Migration: Upgrading 'users' table check constraint to support 'superadmin'...");
      db2.exec("PRAGMA foreign_keys=OFF;");
      db2.exec("PRAGMA legacy_alter_table=ON;");
      db2.transaction(() => {
        db2.exec("ALTER TABLE users RENAME TO _users_old;");
        db2.exec(`
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          userId TEXT UNIQUE,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT,
          role TEXT CHECK(role IN ('client', 'driver', 'admin', 'superadmin')) NOT NULL,
          status TEXT DEFAULT 'online',
          accountStatus TEXT DEFAULT 'active',
          isVerified INTEGER DEFAULT 0,
          city TEXT,
          neighborhood TEXT,
          verificationStatus TEXT DEFAULT 'pending',
          guarantorName TEXT,
          guarantorPhone TEXT,
          identityCardUrl TEXT,
          criminalRecordUrl TEXT,
          currentLocation TEXT,
          balance REAL DEFAULT 0,
          earnings REAL DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
        const pragmaOld = db2.prepare("PRAGMA table_info(_users_old)").all();
        const pragmaNew = db2.prepare("PRAGMA table_info(users)").all();
        const oldColNames = new Set(pragmaOld.map((c) => c.name));
        const newColNames = pragmaNew.map((c) => c.name);
        const commonCols = newColNames.filter((c) => oldColNames.has(c)).join(", ");
        db2.exec(`INSERT INTO users (${commonCols}) SELECT ${commonCols} FROM _users_old;`);
        db2.exec("DROP TABLE _users_old;");
      })();
      db2.exec("PRAGMA legacy_alter_table=OFF;");
      db2.exec("PRAGMA foreign_keys=ON;");
      console.log("Migration: 'users' table check constraint upgraded successfully.");
    }
  } catch (migrationError) {
    console.error("Migration to support superadmin failed:", migrationError);
  }
  try {
    const tableInfo = db2.prepare("SELECT sql FROM sqlite_schema WHERE type='table' AND name='users'").get();
    if (tableInfo && tableInfo.sql && (tableInfo.sql.includes("email TEXT UNIQUE") || tableInfo.sql.includes("email TEXT NOT NULL UNIQUE") || tableInfo.sql.includes("UNIQUE(email)") || tableInfo.sql.includes("UNIQUE (email)"))) {
      console.log("Migration: Upgrading 'users' table email constraint to support composite unique(email, role)...");
      db2.exec("PRAGMA foreign_keys=OFF;");
      db2.exec("PRAGMA legacy_alter_table=ON;");
      db2.transaction(() => {
        db2.exec("ALTER TABLE users RENAME TO _users_old_email;");
        db2.exec(`
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          userId TEXT UNIQUE,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          password TEXT,
          role TEXT CHECK(role IN ('client', 'driver', 'admin', 'superadmin')) NOT NULL,
          status TEXT DEFAULT 'online',
          accountStatus TEXT DEFAULT 'active',
          isVerified INTEGER DEFAULT 0,
          city TEXT,
          neighborhood TEXT,
          verificationStatus TEXT DEFAULT 'pending',
          guarantorName TEXT,
          guarantorPhone TEXT,
          identityCardUrl TEXT,
          criminalRecordUrl TEXT,
          currentLocation TEXT,
          balance REAL DEFAULT 0,
          earnings REAL DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(email, role)
        );
      `);
        const pragmaOld = db2.prepare("PRAGMA table_info(_users_old_email)").all();
        const pragmaNew = db2.prepare("PRAGMA table_info(users)").all();
        const oldColNames = new Set(pragmaOld.map((c) => c.name));
        const newColNames = pragmaNew.map((c) => c.name);
        const commonCols = newColNames.filter((c) => oldColNames.has(c)).join(", ");
        db2.exec(`INSERT INTO users (${commonCols}) SELECT ${commonCols} FROM _users_old_email;`);
        db2.exec("DROP TABLE _users_old_email;");
      })();
      db2.exec("PRAGMA legacy_alter_table=OFF;");
      db2.exec("PRAGMA foreign_keys=ON;");
      console.log("Migration: 'users' table email constraint upgraded successfully.");
    }
  } catch (migrationError) {
    console.error("Migration to allow same email for multiple roles failed:", migrationError);
  }
  function addColumnIfNotExists(tableName, columnName, columnDef) {
    try {
      db2.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
      console.log(`Migration: Added ${columnName} to ${tableName}`);
    } catch (e) {
      if (!e.message.includes("duplicate column name")) {
        console.warn(`Migration notice for ${tableName}.${columnName}: ${e.message}`);
      }
    }
  }
  addColumnIfNotExists("users", "accountStatus", "TEXT DEFAULT 'active'");
  addColumnIfNotExists("users", "verificationStatus", "TEXT DEFAULT 'pending'");
  addColumnIfNotExists("deliveries", "lastMessageAt", "TEXT");
  addColumnIfNotExists("deliveries", "cancelledBy", "TEXT");
  addColumnIfNotExists("deliveries", "cancelReason", "TEXT");
  addColumnIfNotExists("deliveries", "rating", "REAL");
  addColumnIfNotExists("deliveries", "feedback", "TEXT");
  addColumnIfNotExists("users", "isVerified", "INTEGER DEFAULT 0");
  addColumnIfNotExists("users", "phone", "TEXT");
  addColumnIfNotExists("users", "vehicleType", "TEXT");
  addColumnIfNotExists("users", "licensePlate", "TEXT");
  addColumnIfNotExists("users", "identityCardBackUrl", "TEXT");
  addColumnIfNotExists("users", "idCardFront", "TEXT");
  addColumnIfNotExists("users", "idCardBack", "TEXT");
  addColumnIfNotExists("users", "guarantorCniUrl", "TEXT");
  addColumnIfNotExists("users", "walletBalance", "REAL DEFAULT 0");
  addColumnIfNotExists("users", "driverType", "TEXT");
  addColumnIfNotExists("users", "parentCompanyId", "TEXT");
  addColumnIfNotExists("users", "withdrawalRequested", "INTEGER DEFAULT 0");
  addColumnIfNotExists("users", "withdrawalAmount", "REAL DEFAULT 0");
  addColumnIfNotExists("users", "withdrawalMethod", "TEXT");
  addColumnIfNotExists("users", "withdrawalPhone", "TEXT");
  addColumnIfNotExists("users", "rib", "TEXT");
  addColumnIfNotExists("users", "idCardFront", "TEXT");
  addColumnIfNotExists("users", "idCardBack", "TEXT");
  addColumnIfNotExists("users", "guarantorName", "TEXT");
  addColumnIfNotExists("users", "guarantorPhone", "TEXT");
  addColumnIfNotExists("users", "guarantorCniUrl", "TEXT");
  addColumnIfNotExists("users", "totalWithdrawn", "REAL DEFAULT 0");
  addColumnIfNotExists("users", "withdrawalRequestedAt", "TEXT");
  addColumnIfNotExists("users", "updatedAt", "TEXT");
  addColumnIfNotExists("users", "termsAcceptedAt", "TEXT");
  addColumnIfNotExists("users", "sectors", "TEXT");
  addColumnIfNotExists("users", "favoriteAddresses", "TEXT");
  addColumnIfNotExists("users", "performanceScore", "REAL DEFAULT 100");
  addColumnIfNotExists("users", "cancellationRate", "REAL DEFAULT 0");
  addColumnIfNotExists("users", "totalEarnings", "REAL DEFAULT 0");
  addColumnIfNotExists("users", "dailyGoal", "REAL DEFAULT 0");
  addColumnIfNotExists("users", "photoURL", "TEXT");
  addColumnIfNotExists("users", "address", "TEXT");
  addColumnIfNotExists("users", "carteGriseUrl", "TEXT");
  addColumnIfNotExists("bids", "attempts", "INTEGER DEFAULT 1");
  try {
    db2.exec(`
    CREATE TABLE IF NOT EXISTS historique_gains (
      id TEXT PRIMARY KEY,
      driverId TEXT NOT NULL,
      type TEXT NOT NULL, -- course, retrait
      amount REAL NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(driverId) REFERENCES users(userId)
    );
  `);
    console.log("Database: Created table historique_gains if not exists");
  } catch (err) {
    console.error("Failed to create table historique_gains", err);
  }
  try {
    db2.exec(`
    CREATE TABLE IF NOT EXISTS promo_codes (
      code TEXT PRIMARY KEY,
      type TEXT NOT NULL, -- percentage, fixed
      value REAL NOT NULL,
      start_date TEXT, -- ISO Date string
      end_date TEXT,   -- ISO Date string
      max_uses INTEGER, -- maximum total usages (< 0 or NULL for unlimited)
      uses_count INTEGER DEFAULT 0,
      max_per_user INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS promo_usages (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      userId TEXT NOT NULL,
      deliveryId TEXT,
      used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(code) REFERENCES promo_codes(code),
      FOREIGN KEY(userId) REFERENCES users(userId)
    );
  `);
    console.log("Database: Created promo tables if not exists");
  } catch (err) {
    console.error("Failed to create promo tables:", err);
  }
  db2.engine = "SQLite (Local)";
  db2.config = {
    host: "local",
    database: import_path.default.basename(dbPath)
  };
  return db2;
}

// backend/db.ts
import_dotenv.default.config();
import_dotenv.default.config({ path: import_path2.default.join(process.cwd(), ".env") });
try {
  import_dotenv.default.config({ path: import_path2.default.join(__dirname, ".env") });
  import_dotenv.default.config({ path: import_path2.default.join(__dirname, "..", ".env") });
  import_dotenv.default.config({ path: import_path2.default.join(__dirname, "..", "..", ".env") });
} catch (e) {
}
var useMariaDB = process.env.DB_HOST !== void 0;
var db;
if (useMariaDB) {
  db = initMariaDB();
} else {
  db = initSQLiteDB();
}
var db_default = db;

// server.ts
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_uuid = require("uuid");
var import_genai = require("@google/genai");
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_app = require("firebase-admin/app");
var import_messaging = require("firebase-admin/messaging");
var import_fs2 = __toESM(require("fs"), 1);
var firebaseAdminApp = null;
function getFirebaseAdmin() {
  if (firebaseAdminApp) return firebaseAdminApp;
  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountVar) {
    try {
      let cleanedVar = serviceAccountVar.trim();
      if (cleanedVar.startsWith("'") && cleanedVar.endsWith("'") || cleanedVar.startsWith('"') && cleanedVar.endsWith('"')) {
        cleanedVar = cleanedVar.substring(1, cleanedVar.length - 1).trim();
      }
      cleanedVar = cleanedVar.replace(/\\n/g, "\n");
      if (cleanedVar.includes('\\"')) {
        cleanedVar = cleanedVar.replace(/\\"/g, '"');
      }
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(cleanedVar);
      } catch (err) {
        serviceAccount = new Function("return " + cleanedVar)();
      }
      firebaseAdminApp = (0, import_app.initializeApp)({
        credential: (0, import_app.cert)(serviceAccount)
      });
      console.log("[FCM] Firebase Admin initialis\xE9 avec les variables d'environnement.");
      return firebaseAdminApp;
    } catch (e) {
      console.error("[FCM] \xC9chec d'analyse de FIREBASE_SERVICE_ACCOUNT:", e);
    }
  }
  const saPath = import_path3.default.join(process.cwd(), "service-account.json");
  if (import_fs2.default.existsSync(saPath)) {
    try {
      const serviceAccount = JSON.parse(import_fs2.default.readFileSync(saPath, "utf8"));
      firebaseAdminApp = (0, import_app.initializeApp)({
        credential: (0, import_app.cert)(serviceAccount)
      });
      console.log("[FCM] Firebase Admin initialis\xE9 avec le fichier service-account.json.");
      return firebaseAdminApp;
    } catch (e) {
      console.error("[FCM] \xC9chec d'initialisation de Firebase Admin avec service-account.json:", e);
    }
  }
  console.warn("[FCM] Firebase Admin NON initialis\xE9. Les notifications push natives ne seront pas envoy\xE9es. Veuillez configurer la variable d'environnement FIREBASE_SERVICE_ACCOUNT ou placer un fichier service-account.json \xE0 la racine.");
  return null;
}
async function sendPushNotification(userId, title, body, data = {}) {
  try {
    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      console.log(`[FCM] Notification en attente (Firebase non initialis\xE9). Utilisateur: ${userId}, Titre: ${title}`);
      return;
    }
    const tokens = db_default.prepare("SELECT token FROM user_push_tokens WHERE userId = ?").all(userId);
    if (tokens.length === 0) {
      console.log(`[FCM] Aucun token de push enregistr\xE9 pour l'utilisateur: ${userId}`);
      return;
    }
    const registrationTokens = tokens.map((t) => t.token);
    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        click_action: "FLUTTER_NOTIFICATION_CLICK"
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "high_importance_channel",
          priority: "max",
          defaultSound: true,
          defaultVibrateTimings: true
        }
      },
      apns: {
        headers: {
          "apns-priority": "10"
        },
        payload: {
          aps: {
            sound: "default",
            badge: 1
          }
        }
      },
      tokens: registrationTokens
    };
    const response = await (0, import_messaging.getMessaging)(adminApp).sendEachForMulticast(message);
    console.log(`[FCM] Push envoy\xE9 avec succ\xE8s \xE0 ${response.successCount} appareils pour l'utilisateur ${userId}. Erreurs: ${response.failureCount}`);
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          if (error && (error.code === "messaging/invalid-registration-token" || error.code === "messaging/registration-token-not-registered")) {
            const badToken = registrationTokens[idx];
            db_default.prepare("DELETE FROM user_push_tokens WHERE token = ?").run(badToken);
            console.log(`[FCM] Token de push invalide supprim\xE9: ${badToken}`);
          }
        }
      });
    }
  } catch (err) {
    console.error("[FCM] Erreur lors de l'envoi de la notification push:", err);
  }
}
var originalPrepare = db_default.prepare;
db_default.prepare = function(sql) {
  const stmt = originalPrepare.call(db_default, sql);
  const isNotificationInsert = /INSERT\s+INTO\s+notifications/i.test(sql);
  if (isNotificationInsert && stmt) {
    const originalRun = stmt.run;
    stmt.run = function(...args) {
      const result = originalRun.apply(stmt, args);
      try {
        const columnsMatch = sql.match(/\(([^)]+)\)/);
        if (columnsMatch && columnsMatch[1]) {
          const columns = columnsMatch[1].split(",").map((c) => c.trim().toLowerCase());
          const userIdIdx = columns.indexOf("userid");
          const titleIdx = columns.indexOf("title");
          const messageIdx = columns.indexOf("message");
          const typeIdx = columns.indexOf("type");
          const linkIdx = columns.indexOf("link");
          const userId = userIdIdx !== -1 ? args[userIdIdx] : null;
          const title = titleIdx !== -1 ? args[titleIdx] : "";
          const message = messageIdx !== -1 ? args[messageIdx] : "";
          const type = typeIdx !== -1 ? args[typeIdx] : "";
          const link = linkIdx !== -1 ? args[linkIdx] : "";
          if (userId) {
            sendPushNotification(userId, title, message, {
              type: type || "info",
              link: link || ""
            });
          }
        }
      } catch (e) {
        console.error("[FCM Interceptor] Error intercepting notification insert:", e);
      }
      return result;
    };
  }
  return stmt;
};
import_dotenv2.default.config();
import_dotenv2.default.config({ path: import_path3.default.join(process.cwd(), ".env") });
try {
  import_dotenv2.default.config({ path: import_path3.default.join(__dirname, ".env") });
  import_dotenv2.default.config({ path: import_path3.default.join(__dirname, "..", ".env") });
} catch (e) {
  console.warn("Dotenv warning on specific directory resolution:", e);
}
var JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev";
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3e3;
  app.use((0, import_cors.default)());
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  function getClosestAvailableDriver(deliveryId, fromLoc, rejectedByList = []) {
    try {
      const drivers = db_default.prepare(`
        SELECT userId, name, currentLocation 
        FROM users 
        WHERE role = 'driver' 
          AND status = 'online' 
          AND accountStatus = 'active' 
          AND verificationStatus = 'verified'
      `).all();
      let closestDriver = null;
      let minDistance = Infinity;
      for (const driver of drivers) {
        if (rejectedByList.includes(driver.userId)) continue;
        let driverLoc = null;
        try {
          if (driver.currentLocation) driverLoc = JSON.parse(driver.currentLocation);
        } catch (e) {
        }
        if (driverLoc && driverLoc.lat && driverLoc.lng) {
          const dist = calculateDistance(fromLoc.lat, fromLoc.lng, driverLoc.lat, driverLoc.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closestDriver = driver;
          }
        } else {
          if (!closestDriver) {
            closestDriver = driver;
          }
        }
      }
      return closestDriver;
    } catch (err) {
      console.error("Error in getClosestAvailableDriver:", err);
      return null;
    }
  }
  const MASTER_ADMIN_EMAILS = ["mandemohamed68@gmail.com", "mandemohamed6868@gmail.com"];
  const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.warn(`[AUTH] No token provided for ${req.path}`);
      return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
      if (!decoded.userId) {
        console.error(`[AUTH] Token missing userId for ${decoded.email}`);
        return res.status(401).json({ error: "Invalid session structure" });
      }
      const user = db_default.prepare("SELECT role, name, email, accountStatus, userId, id FROM users WHERE userId = ? OR id = ? OR email = ?").get(decoded.userId, decoded.userId, decoded.email);
      if (!user) {
        if (MASTER_ADMIN_EMAILS.includes(decoded.email)) {
          console.warn(`[AUTH] Master Admin ${decoded.email} authenticated via token fallback (not found in DB)`);
          req.user = {
            ...decoded,
            isMaster: true,
            role: decoded.role || "superadmin",
            accountStatus: "active"
          };
          return next();
        }
        console.warn(`[AUTH] User not found for ID: ${decoded.userId}, Email: ${decoded.email}`);
        return res.status(401).json({ error: "User not found or role mismatch" });
      }
      if (user.accountStatus === "suspended") {
        const isMaster = MASTER_ADMIN_EMAILS.includes(user.email);
        if (!isMaster) {
          return res.status(403).json({ error: "ACCOUNT_SUSPENDED", details: "Votre compte a \xE9t\xE9 suspendu par l'administrateur. Veuillez prendre attache avec le support." });
        }
      }
      req.user = {
        ...decoded,
        role: user.role,
        name: user.name,
        email: user.email,
        userId: user.userId || user.id,
        isMaster: MASTER_ADMIN_EMAILS.includes(user.email)
      };
      next();
    } catch (err) {
      console.error(`[AUTH] JWT Error: ${err.message}`);
      res.status(401).json({ error: "Invalid token" });
    }
  };
  const checkAdmin = (req, res, next) => {
    if (req.user.role === "admin" || req.user.role === "superadmin" || req.user.isMaster) {
      next();
    } else {
      console.warn(`[API ACCESS DENIED] User ${req.user.email} (ID: ${req.user.userId}) attempted to access ADMIN endpoint: ${req.originalUrl}, but role is: '${req.user.role}'`);
      res.status(400).json({ error: `Access denied. Role 'admin' or 'superadmin' is required (your role: '${req.user.role}').` });
    }
  };
  const checkSuperAdmin = (req, res, next) => {
    if (req.user.role === "superadmin" || req.user.isMaster) {
      next();
    } else {
      console.warn(`[API ACCESS DENIED] User ${req.user.email} (ID: ${req.user.userId}) attempted to access superadmin endpoint, but role is: '${req.user.role}'`);
      res.status(400).json({ error: `Access denied. Superadmin role is required (your role: '${req.user.role}').` });
    }
  };
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Veuillez remplir tous les champs obligatoires (Nom, Email, Mot de passe)." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caract\xE8res." });
    }
    const targetRole = role || "client";
    try {
      const existingUser = db_default.prepare("SELECT * FROM users WHERE email = ? AND role = ?").get(email, targetRole);
      if (existingUser) {
        return res.status(400).json({ error: "Cette adresse email est d\xE9j\xE0 utilis\xE9e pour ce r\xF4le." });
      }
      const hashedPassword = await import_bcryptjs.default.hash(password, 10);
      const userId = (0, import_uuid.v4)();
      const stmt = db_default.prepare("INSERT INTO users (id, userId, name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)");
      stmt.run(userId, userId, name, email, hashedPassword, targetRole);
      if (targetRole === "driver") {
        let approvalMode = "manual";
        try {
          const row = db_default.prepare("SELECT value FROM config WHERE `key` = 'app_config'").get();
          if (row && row.value) {
            const appConfig = JSON.parse(row.value);
            if (appConfig.driverApprovalMode) {
              approvalMode = appConfig.driverApprovalMode;
            }
          }
        } catch (err) {
        }
        if (approvalMode === "automatic" || approvalMode === "disabled") {
          db_default.prepare("UPDATE users SET verificationStatus = 'verified', accountStatus = 'active', isVerified = 1 WHERE userId = ?").run(userId);
        } else {
          db_default.prepare("UPDATE users SET verificationStatus = 'pending', accountStatus = 'pending_approval', isVerified = 0 WHERE userId = ?").run(userId);
        }
      }
      const allowedFields = [
        "city",
        "neighborhood",
        "address",
        "driverType",
        "phone",
        "withdrawalPhone",
        "rib",
        "idCardFront",
        "idCardBack",
        "guarantorName",
        "guarantorPhone",
        "guarantorCniUrl",
        "status",
        "termsAcceptedAt",
        "vehicleType",
        "licensePlate",
        "sectors"
      ];
      const updates = [];
      const params = [];
      for (const field of allowedFields) {
        if (req.body[field] !== void 0) {
          updates.push(`${field} = ?`);
          params.push(req.body[field]);
        }
      }
      if (updates.length > 0) {
        params.push(userId);
        try {
          db_default.prepare(`UPDATE users SET ${updates.join(", ")} WHERE userId = ?`).run(...params);
        } catch (updateErr) {
          db_default.prepare("DELETE FROM users WHERE userId = ?").run(userId);
          if (updateErr.message && updateErr.message.includes("ER_DATA_TOO_LONG")) {
            return res.status(400).json({ error: "Image trop volumineuse, veuillez en choisir une autre (ex: compacter la photo de carte d'identit\xE9)." });
          }
          throw updateErr;
        }
      }
      const fullUser = db_default.prepare("SELECT * FROM users WHERE userId = ?").get(userId);
      delete fullUser.password;
      if (fullUser.currentLocation) {
        try {
          fullUser.currentLocation = JSON.parse(fullUser.currentLocation);
        } catch (e) {
        }
      }
      const token = import_jsonwebtoken.default.sign({ userId, email, role: targetRole }, JWT_SECRET);
      res.json({ token, user: fullUser });
    } catch (error) {
      if (error.message.includes("UNIQUE")) {
        return res.status(400).json({ error: "Cette adresse email est d\xE9j\xE0 utilis\xE9e pour ce r\xF4le." });
      }
      res.status(500).json({ error: "Erreur lors de l'inscription. Veuillez r\xE9essayer." });
    }
  });
  app.post("/api/auth/login", async (req, res) => {
    const { email, password, role } = req.body;
    try {
      let user = null;
      if (role) {
        user = db_default.prepare("SELECT * FROM users WHERE email = ? AND role = ?").get(email, role);
      }
      if (!user) {
        user = db_default.prepare("SELECT * FROM users WHERE email = ?").get(email);
      }
      if (!user || !await import_bcryptjs.default.compare(password, user.password)) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect." });
      }
      if (user.accountStatus === "suspended") {
        return res.status(403).json({ error: "ACCOUNT_SUSPENDED", details: "Votre compte a \xE9t\xE9 suspendu par l'administrateur. Veuillez prendre attache avec le support." });
      }
      delete user.password;
      const token = import_jsonwebtoken.default.sign({ userId: user.userId || user.id, email: user.email, role: user.role }, JWT_SECRET);
      res.json({ token, user });
    } catch (error) {
      res.status(500).json({ error: "Erreur de connexion serveur." });
    }
  });
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "L'adresse email est requise." });
    }
    try {
      const user = db_default.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (!user) {
        return res.json({ status: "ok", message: "Si cette adresse existe, un code de r\xE9initialisation lui a \xE9t\xE9 envoy\xE9." });
      }
      const configRow = db_default.prepare("SELECT value FROM config WHERE `key` = 'app_config'").get();
      const appConfig = configRow ? JSON.parse(configRow.value) : {};
      const isForgotActive = appConfig.isForgotPasswordActive !== false;
      if (!isForgotActive) {
        return res.status(400).json({ error: "La r\xE9initialisation de mot de passe par email est d\xE9sactiv\xE9e. Veuillez contacter un administrateur." });
      }
      const resetCode = Math.floor(1e5 + Math.random() * 9e5).toString();
      const expiresAt = (Date.now() + 15 * 60 * 1e3).toString();
      db_default.prepare("UPDATE users SET resetCode = ?, resetExpires = ? WHERE email = ?").run(resetCode, expiresAt, email);
      const host = appConfig.smtpHost || process.env.SMTP_HOST;
      const port = parseInt(appConfig.smtpPort || process.env.SMTP_PORT || "587");
      const userMail = appConfig.smtpUser || process.env.SMTP_USER;
      const passMail = appConfig.smtpPass || process.env.SMTP_PASS;
      const secure = appConfig.smtpSecure !== void 0 ? appConfig.smtpSecure : process.env.SMTP_SECURE === "true" || port === 465;
      const fromMail = appConfig.smtpFrom || process.env.SMTP_FROM || userMail || '"Faso Express" <noreply@fasoexpress.com>';
      if (host && userMail && passMail) {
        const transporter = import_nodemailer.default.createTransport({
          host,
          port,
          secure,
          auth: {
            user: userMail,
            pass: passMail
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        const mailOptions = {
          from: fromMail,
          to: email,
          subject: "R\xE9initialisation de votre mot de passe - Faso Express",
          text: `Bonjour ${user.name},

Vous avez demand\xE9 la r\xE9initialisation de votre mot de passe pour votre compte Faso Express.

Votre code de r\xE9initialisation est : ${resetCode}
Ce code est valable pendant 15 minutes.

Si vous n'\xEAtes pas \xE0 l'origine de cette demande, vous pouvez ignorer cet e-mail.

Cordialement,
L'\xE9quipe Faso Express`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f1f5f9; border-radius: 12px;">
              <h2 style="color: #f97316; text-align: center; font-weight: 900; text-transform: uppercase; margin-bottom: 20px;">FASO EXPRESS</h2>
              <p>Bonjour <strong>${user.name}</strong>,</p>
              <p>Vous avez demand\xE9 la r\xE9initialisation de votre mot de passe pour votre compte Faso Express.</p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <p style="font-size: 14px; color: #64748b; margin-top: 0; margin-bottom: 5px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.1em;">Code de r\xE9initialisation</p>
                <h1 style="font-size: 36px; color: #0f172a; margin: 0; font-weight: 900; letter-spacing: 0.2em;">${resetCode}</h1>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 5px; margin-bottom: 0;">Valable pendant 15 minutes</p>
              </div>
              <p style="color: #64748b; font-size: 13px;">Si vous n'\xEAtes pas \xE0 l'origine de cette demande, veuillez ignorer cet e-mail en toute s\xE9curit\xE9.</p>
              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
              <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-bottom: 0;">\xC9dit\xE9 par NME TECHNOLOGIE GROUP</p>
            </div>
          `
        };
        await transporter.sendMail(mailOptions);
        console.log(`[SMTP] Reset email successfully sent to ${email} with code ${resetCode}`);
      } else {
        console.log(`
==========================================`);
        console.log(`[DEV MODE] SMTP non configur\xE9 pour Forgot Password`);
        console.log(`Email : ${email}`);
        console.log(`Code de r\xE9initialisation : ${resetCode}`);
        console.log(`==========================================
`);
        return res.json({
          status: "ok",
          sandbox: true,
          code: resetCode,
          message: "L'envoi d'e-mail n'est pas enti\xE8rement configur\xE9. Le code de r\xE9initialisation s'affiche ici pour vos tests : " + resetCode
        });
      }
      res.json({ status: "ok", message: "Le code de r\xE9initialisation a \xE9t\xE9 envoy\xE9 par e-mail." });
    } catch (err) {
      console.error("Forgot password error:", err);
      res.status(500).json({ error: "Erreur lors du traitement de la demande de r\xE9initialisation." });
    }
  });
  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "Tous les champs sont requis (email, code, nouveau mot de passe)." });
    }
    try {
      const user = db_default.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (!user) {
        return res.status(404).json({ error: "Aucun utilisateur trouv\xE9 avec cette adresse email." });
      }
      if (!user.resetCode || user.resetCode !== code.trim()) {
        return res.status(400).json({ error: "Le code de r\xE9initialisation est incorrect." });
      }
      const expires = parseFloat(user.resetExpires || "0");
      if (Date.now() > expires) {
        return res.status(400).json({ error: "Le code de r\xE9initialisation a expir\xE9 (limite de 15 minutes d\xE9pass\xE9e)." });
      }
      const hashedPassword = await import_bcryptjs.default.hash(newPassword, 10);
      db_default.prepare("UPDATE users SET password = ?, resetCode = NULL, resetExpires = NULL WHERE email = ?").run(hashedPassword, email);
      res.json({ status: "ok", message: "Votre mot de passe a \xE9t\xE9 modifi\xE9 avec succ\xE8s. Vous pouvez maintenant vous connecter." });
    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).json({ error: "Erreur lors de la r\xE9initialisation du mot de passe." });
    }
  });
  app.get("/api/profile", authenticate, (req, res) => {
    const user = db_default.prepare("SELECT * FROM users WHERE userId = ?").get(req.user.userId);
    if (!user) return res.status(404).json({ error: "Utilisateur non trouv\xE9." });
    delete user.password;
    if (user.currentLocation) user.currentLocation = JSON.parse(user.currentLocation);
    res.json(user);
  });
  app.get("/api/users/:id", authenticate, (req, res) => {
    try {
      const user = db_default.prepare("SELECT * FROM users WHERE userId = ?").get(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouv\xE9." });
      }
      delete user.password;
      if (user.currentLocation) {
        try {
          user.currentLocation = JSON.parse(user.currentLocation);
        } catch {
        }
      }
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: "\xC9chec de la r\xE9cup\xE9ration de l'utilisateur." });
    }
  });
  app.get("/api/drivers/:id/mission-history", authenticate, (req, res) => {
    try {
      const driverId = req.params.id;
      const rows = db_default.prepare("SELECT * FROM driver_mission_history WHERE driverId = ? ORDER BY createdAt DESC").all(driverId);
      const enhancedRows = rows.map((r) => {
        let delivery = null;
        try {
          delivery = db_default.prepare("SELECT id, origin, destination, cost, status, clientName FROM deliveries WHERE id = ?").get(r.deliveryId);
          if (delivery) {
            if (typeof delivery.origin === "string") {
              try {
                delivery.origin = JSON.parse(delivery.origin);
              } catch (e) {
              }
            }
            if (typeof delivery.destination === "string") {
              try {
                delivery.destination = JSON.parse(delivery.destination);
              } catch (e) {
              }
            }
            delivery.from = delivery.origin || {};
            delivery.to = delivery.destination || {};
          }
        } catch (e) {
        }
        return {
          ...r,
          delivery
        };
      });
      res.json(enhancedRows);
    } catch (err) {
      console.error("Failed to fetch driver mission history:", err);
      res.status(500).json({ error: "Impossible de r\xE9cup\xE9rer l'historique des missions du livreur." });
    }
  });
  app.patch("/api/profile", authenticate, async (req, res) => {
    const updates = req.body;
    let fields = Object.keys(updates).filter((k) => k !== "userId" && k !== "id" && k !== "createdAt" && k !== "updatedAt");
    const FALLBACK_COLUMNS = /* @__PURE__ */ new Set([
      "name",
      "email",
      "password",
      "role",
      "status",
      "accountStatus",
      "isVerified",
      "city",
      "neighborhood",
      "verificationStatus",
      "guarantorName",
      "guarantorPhone",
      "identityCardUrl",
      "identityCardBackUrl",
      "criminalRecordUrl",
      "currentLocation",
      "balance",
      "earnings",
      "withdrawalPhone",
      "rib",
      "idCardFront",
      "idCardBack",
      "guarantorCniUrl",
      "termsAcceptedAt",
      "driverType",
      "resetCode",
      "resetExpires",
      "photoURL",
      "address",
      "carteGriseUrl",
      "updatedAt",
      "totalWithdrawn",
      "withdrawalRequested",
      "withdrawalAmount",
      "withdrawalMethod",
      "vehicleType",
      "licensePlate"
    ]);
    let validColumns = FALLBACK_COLUMNS;
    try {
      const dbColumns = db_default.prepare("PRAGMA table_info(users)").all();
      if (dbColumns && dbColumns.length > 0) {
        validColumns = new Set(dbColumns.map((c) => c.name));
      }
    } catch (schemaErr) {
      console.warn("Failed to retrieve users schema during validation:", schemaErr);
    }
    fields = fields.filter((f) => validColumns.has(f));
    if (fields.length === 0) return res.json({ status: "no changes" });
    const setClause = fields.map((f) => `${f} = ?`).join(", ");
    const values = await Promise.all(fields.map(async (f) => {
      let val = updates[f];
      if (f === "password" && typeof val === "string" && val.trim() !== "") {
        return await import_bcryptjs.default.hash(val, 10);
      }
      if (typeof val === "string" && val.includes("T") && val.endsWith("Z")) {
        val = val.slice(0, 19).replace("T", " ");
      }
      if (typeof val === "boolean") return val ? 1 : 0;
      if (typeof val === "object" && val !== null) return JSON.stringify(val);
      return val;
    }));
    try {
      const stmt = db_default.prepare(`UPDATE users SET ${setClause} WHERE userId = ?`);
      stmt.run(...values, req.user.userId);
      res.json({ status: "ok" });
    } catch (err) {
      console.error("Profile update DB error:", err);
      res.status(500).json({ error: "Update failed", details: err?.message || err?.toString() });
    }
  });
  app.post("/api/deliveries", authenticate, (req, res) => {
    const d = req.body;
    const id = (0, import_uuid.v4)();
    try {
      const commRow = db_default.prepare("SELECT value FROM config WHERE `key` = 'commissions'").get();
      const comm = commRow ? JSON.parse(commRow.value) : { minDeliveryCost: 500, tarifKm: 150, fraisFixes: 500 };
      let calculatedCost = d.cost;
      if (!calculatedCost && d.from && d.to) {
        const dist = calculateDistance(d.from.lat, d.from.lng, d.to.lat, d.to.lng);
        calculatedCost = Math.max(comm.minDeliveryCost, comm.fraisFixes + dist * comm.tarifKm);
        calculatedCost = Math.round(calculatedCost / 100) * 100;
      }
      const stmt = db_default.prepare(`
        INSERT INTO deliveries (
          id, clientId, clientName, origin, destination, cost, status, pickupCode, deliveryCode,
          vehicleType, senderPhone, recipientPhone, packageDetails, baseCost, clientProposedPrice, isUrgent, urgentFee, boostAmount
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id,
        req.user.userId,
        d.clientName || req.user.name || "",
        JSON.stringify(d.from || {}),
        JSON.stringify(d.to || {}),
        calculatedCost || 1e3,
        d.status || "pending",
        d.pickupCode || Math.random().toString(36).substr(2, 6).toUpperCase(),
        d.deliveryCode || Math.random().toString(36).substr(2, 6).toUpperCase(),
        d.vehicleType || "moto",
        d.senderPhone || "",
        d.recipientPhone || "",
        d.packageDetails ? JSON.stringify(d.packageDetails) : null,
        d.baseCost || d.estimatedCost || calculatedCost || 1e3,
        d.clientProposedPrice || d.cost || calculatedCost || 1e3,
        d.isUrgent ? 1 : 0,
        d.urgentFee || 0,
        d.boostAmount || 0
      );
      res.json({ id, cost: calculatedCost });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Creation failed", details: err?.message || err?.toString() });
    }
  });
  app.post("/api/app-notifications", authenticate, (req, res) => {
    const { userId, title, message, type, link } = req.body;
    const id = (0, import_uuid.v4)();
    try {
      db_default.prepare("INSERT INTO notifications (id, userId, title, message, type, link) VALUES (?, ?, ?, ?, ?, ?)").run(id, userId, title, message, type || "info", link || null);
      res.json({ id });
    } catch (err) {
      res.status(500).json({ error: "\xC9chec de la cr\xE9ation de la notification." });
    }
  });
  app.get("/api/deliveries", authenticate, (req, res) => {
    const { role, userId } = req.user;
    let query = "SELECT * FROM deliveries";
    const params = [];
    if (role === "client") {
      query += " WHERE clientId = ?";
      params.push(userId);
    } else if (role === "driver") {
      query += " WHERE (status = 'pending' OR driverId = ?)";
      params.push(userId);
    } else if (role !== "admin" && role !== "superadmin") {
      return res.status(400).json({ error: "Access denied" });
    }
    query += " ORDER BY createdAt DESC LIMIT 100";
    let deliveries = db_default.prepare(query).all(...params);
    if (role === "driver") {
      try {
        const driver = db_default.prepare("SELECT currentLocation FROM users WHERE userId = ?").get(userId);
        let driverLoc = null;
        if (driver && driver.currentLocation) {
          driverLoc = JSON.parse(driver.currentLocation);
        }
        deliveries = deliveries.filter((d) => {
          if (d.status !== "pending" && d.driverId === userId) return true;
          if (d.status !== "pending") return false;
          if (!driverLoc || !driverLoc.lat || !driverLoc.lng) return true;
          if (d.isUrgent) return true;
          let originData = typeof d.origin === "string" ? JSON.parse(d.origin) : d.origin;
          if (!originData || !originData.lat || !originData.lng) return true;
          const distanceKm = calculateDistance(driverLoc.lat, driverLoc.lng, originData.lat, originData.lng);
          const ageInMinutes = (Date.now() - new Date(d.createdAt).getTime()) / 6e4;
          if (distanceKm <= 3) return true;
          if (distanceKm <= 6 && ageInMinutes >= 1) return true;
          if (distanceKm <= 10 && ageInMinutes >= 3) return true;
          if (ageInMinutes >= 5) return true;
          return false;
        });
      } catch (e) {
        console.error("Error in dispatching logic:", e);
      }
    }
    deliveries.forEach((d) => {
      try {
        if (typeof d.origin === "string") d.origin = JSON.parse(d.origin);
      } catch (e) {
      }
      try {
        if (typeof d.destination === "string") d.destination = JSON.parse(d.destination);
      } catch (e) {
      }
      d.from = d.origin || {};
      d.to = d.destination || {};
      try {
        if (typeof d.rejectedBy === "string") d.rejectedBy = JSON.parse(d.rejectedBy);
      } catch (e) {
      }
      try {
        if (typeof d.packageDetails === "string") d.packageDetails = JSON.parse(d.packageDetails);
      } catch (e) {
      }
      if (d.driverId) {
        try {
          const driver = db_default.prepare("SELECT photoURL, phone, name FROM users WHERE userId = ?").get(d.driverId);
          if (driver) {
            d.driverPhoto = driver.photoURL;
            d.driverPhone = driver.phone;
            d.driverName = driver.name;
          }
        } catch (e) {
        }
      }
      try {
        const bids = db_default.prepare("SELECT * FROM bids WHERE deliveryId = ?").all(d.id);
        if (bids) {
          bids.forEach((b) => {
            b.timeEstimateMins = b.proposedTime;
            if (b.driverId) {
              try {
                const bDriver = db_default.prepare("SELECT photoURL, phone FROM users WHERE userId = ?").get(b.driverId);
                if (bDriver) {
                  b.driverPhoto = bDriver.photoURL;
                  b.driverPhone = bDriver.phone;
                }
              } catch (err) {
              }
            }
          });
        }
        d.bids = bids || [];
      } catch (e) {
        d.bids = [];
      }
    });
    res.json(deliveries);
  });
  app.get("/api/deliveries/:id", authenticate, (req, res) => {
    try {
      const d = db_default.prepare("SELECT * FROM deliveries WHERE id = ?").get(req.params.id);
      if (!d) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      try {
        if (typeof d.origin === "string") d.origin = JSON.parse(d.origin);
      } catch (e) {
      }
      try {
        if (typeof d.destination === "string") d.destination = JSON.parse(d.destination);
      } catch (e) {
      }
      d.from = d.origin || {};
      d.to = d.destination || {};
      try {
        if (typeof d.rejectedBy === "string") d.rejectedBy = JSON.parse(d.rejectedBy);
      } catch (e) {
      }
      try {
        if (typeof d.packageDetails === "string") d.packageDetails = JSON.parse(d.packageDetails);
      } catch (e) {
      }
      if (d.driverId) {
        try {
          const driver = db_default.prepare("SELECT photoURL, phone, name FROM users WHERE userId = ?").get(d.driverId);
          if (driver) {
            d.driverPhoto = driver.photoURL;
            d.driverPhone = driver.phone;
            d.driverName = driver.name;
          }
        } catch (e) {
        }
      }
      try {
        const bids = db_default.prepare("SELECT * FROM bids WHERE deliveryId = ?").all(d.id);
        if (bids) {
          bids.forEach((b) => {
            b.timeEstimateMins = b.proposedTime;
            if (b.driverId) {
              try {
                const bDriver = db_default.prepare("SELECT photoURL, phone FROM users WHERE userId = ?").get(b.driverId);
                if (bDriver) {
                  b.driverPhoto = bDriver.photoURL;
                  b.driverPhone = bDriver.phone;
                }
              } catch (err) {
              }
            }
          });
        }
        d.bids = bids || [];
      } catch (e) {
        d.bids = [];
      }
      res.json(d);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch delivery details" });
    }
  });
  app.patch("/api/deliveries/:id", authenticate, (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    if (updates.cancellationReason) {
      updates.cancelReason = updates.cancellationReason;
      delete updates.cancellationReason;
    }
    const fields = Object.keys(updates).filter((k) => {
      if (req.user.role === "admin" || req.user.role === "superadmin") {
        return k !== "id" && k !== "updatedAt" && k !== "createdAt" && k !== "cancelledBy";
      }
      return k !== "id" && k !== "clientId" && k !== "updatedAt" && k !== "createdAt" && k !== "cancelledBy";
    });
    if (fields.length === 0) return res.json({ status: "no changes" });
    const setClause = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => {
      let val = updates[f];
      if (typeof val === "string" && val.includes("T") && val.endsWith("Z")) {
        val = val.slice(0, 19).replace("T", " ");
      }
      if (typeof val === "boolean") return val ? 1 : 0;
      if (typeof val === "object" && val !== null) return JSON.stringify(val);
      return val;
    });
    try {
      const stmt = db_default.prepare(`UPDATE deliveries SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`);
      stmt.run(...values, id);
      if (updates.status === "accepted" && updates.driverId) {
        db_default.prepare("UPDATE bids SET status = 'accepted', updatedAt = CURRENT_TIMESTAMP WHERE deliveryId = ? AND driverId = ?").run(id, updates.driverId);
        db_default.prepare("UPDATE bids SET status = 'rejected', updatedAt = CURRENT_TIMESTAMP WHERE deliveryId = ? AND driverId != ?").run(id, updates.driverId);
        try {
          db_default.prepare(`
            INSERT INTO driver_mission_history (id, driverId, deliveryId, action, createdAt)
            VALUES (?, ?, ?, 'accepted', CURRENT_TIMESTAMP)
          `).run((0, import_uuid.v4)(), updates.driverId, id);
        } catch (err) {
          console.error("Failed to log acceptance to driver_mission_history:", err);
        }
      }
      if (updates.rejectedBy) {
        try {
          const oldDelivery = db_default.prepare("SELECT rejectedBy, origin FROM deliveries WHERE id = ?").get(id);
          let oldRejected = [];
          if (oldDelivery && oldDelivery.rejectedBy) {
            oldRejected = typeof oldDelivery.rejectedBy === "string" ? JSON.parse(oldDelivery.rejectedBy) : oldDelivery.rejectedBy;
          }
          const newRejected = Array.isArray(updates.rejectedBy) ? updates.rejectedBy : JSON.parse(updates.rejectedBy);
          const newlyRejectedDriverId = newRejected.find((driverId) => !oldRejected.includes(driverId)) || null;
          if (newlyRejectedDriverId) {
            db_default.prepare(`
              INSERT INTO driver_mission_history (id, driverId, deliveryId, action, createdAt)
              VALUES (?, ?, ?, 'rejected', CURRENT_TIMESTAMP)
            `).run((0, import_uuid.v4)(), newlyRejectedDriverId, id);
            let reassignmentMode = "manual";
            try {
              const configRow = db_default.prepare("SELECT value FROM config WHERE `key` = 'app_config'").get();
              if (configRow && configRow.value) {
                const appConfig = JSON.parse(configRow.value);
                if (appConfig.reassignmentMode) reassignmentMode = appConfig.reassignmentMode;
              }
            } catch (err) {
            }
            if (reassignmentMode === "automatic" && oldDelivery) {
              let originLoc = null;
              try {
                originLoc = typeof oldDelivery.origin === "string" ? JSON.parse(oldDelivery.origin) : oldDelivery.origin;
              } catch (e) {
              }
              if (originLoc && originLoc.lat && originLoc.lng) {
                const nextDriver = getClosestAvailableDriver(id, originLoc, newRejected);
                if (nextDriver) {
                  db_default.prepare(`
                    UPDATE deliveries 
                    SET driverId = ?, driverName = ?, status = 'accepted', updatedAt = CURRENT_TIMESTAMP 
                    WHERE id = ?
                  `).run(nextDriver.userId, nextDriver.name, id);
                  db_default.prepare(`
                    INSERT INTO notifications (id, userId, title, message, type)
                    VALUES (?, ?, ?, ?, 'success')
                  `).run((0, import_uuid.v4)(), nextDriver.userId, "Mission affect\xE9e automatiquement", `La course #${id.slice(-6).toUpperCase()} vous a \xE9t\xE9 r\xE9affect\xE9e automatiquement.`, "success");
                  db_default.prepare(`
                    INSERT INTO driver_mission_history (id, driverId, deliveryId, action, createdAt)
                    VALUES (?, ?, ?, 'assigned', CURRENT_TIMESTAMP)
                  `).run((0, import_uuid.v4)(), nextDriver.userId, id);
                }
              }
            }
          }
        } catch (err) {
          console.error("Error processing driver rejection or auto-reassignment:", err);
        }
      }
      if (updates.status === "delivered") {
        try {
          const delivery = db_default.prepare("SELECT driverId, cost, clientProposedPrice FROM deliveries WHERE id = ?").get(id);
          if (delivery && delivery.driverId) {
            const finalCost = delivery.clientProposedPrice || delivery.cost || 0;
            const configRows = db_default.prepare("SELECT * FROM config").all();
            const commissionsRow = configRows.find((c) => c.key === "commissions");
            const commissionSettings = commissionsRow ? JSON.parse(commissionsRow.value) : { driverSharePercent: 85 };
            const driverShare = commissionSettings.driverSharePercent || 85;
            const driverAmt = Math.floor(finalCost * driverShare / 100);
            db_default.prepare(`
              INSERT INTO historique_gains (id, driverId, type, amount, createdAt)
              VALUES (?, ?, 'course', ?, CURRENT_TIMESTAMP)
            `).run((0, import_uuid.v4)(), delivery.driverId, driverAmt);
          }
        } catch (err) {
          console.error("Failed to log gain for completed delivery:", err);
        }
      }
      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Update failed" });
    }
  });
  app.delete("/api/deliveries/:id", authenticate, (req, res) => {
    const { id } = req.params;
    try {
      db_default.prepare("DELETE FROM tracking WHERE deliveryId = ?").run(id);
      db_default.prepare("DELETE FROM bids WHERE deliveryId = ?").run(id);
      db_default.prepare("DELETE FROM messages WHERE deliveryId = ?").run(id);
      db_default.prepare("DELETE FROM deliveries WHERE id = ?").run(id);
      res.json({ status: "ok" });
    } catch (err) {
      console.error("Delete failed:", err);
      res.status(500).json({ error: "\xC9chec de la suppression.", details: err?.message });
    }
  });
  app.post("/api/deliveries/:id/messages", authenticate, (req, res) => {
    const { id: deliveryId } = req.params;
    const { text, senderName, senderRole } = req.body;
    const id = (0, import_uuid.v4)();
    try {
      const stmt = db_default.prepare("INSERT INTO messages (id, deliveryId, text, senderId, senderName, senderRole) VALUES (?, ?, ?, ?, ?, ?)");
      stmt.run(id, deliveryId, text, req.user.userId, senderName, senderRole);
      db_default.prepare("UPDATE deliveries SET lastMessageAt = CURRENT_TIMESTAMP WHERE id = ?").run(deliveryId);
      try {
        const delivery = db_default.prepare("SELECT clientId, driverId FROM deliveries WHERE id = ?").get(deliveryId);
        if (delivery) {
          const recipientId = req.user.userId === delivery.clientId ? delivery.driverId : delivery.clientId;
          if (recipientId) {
            sendPushNotification(recipientId, `Nouveau message de ${senderName}`, text, {
              type: "message",
              deliveryId
            });
          }
        }
      } catch (pushErr) {
        console.warn("[FCM] Ignored push notification error inside message create:", pushErr);
      }
      res.json({ id });
    } catch (err) {
      res.status(500).json({ error: "\xC9chec de l'envoi du message." });
    }
  });
  app.get("/api/deliveries/:id/messages", authenticate, (req, res) => {
    const { id: deliveryId } = req.params;
    const messages = db_default.prepare("SELECT * FROM messages WHERE deliveryId = ? ORDER BY createdAt ASC").all(deliveryId);
    res.json(messages);
  });
  app.get("/api/app-notifications", authenticate, (req, res) => {
    try {
      const notifications = db_default.prepare("SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50").all(req.user.userId);
      res.json(notifications);
    } catch (err) {
      console.error("[API] Failed to fetch notifications:", err);
      res.status(500).json({ error: "\xC9chec de la r\xE9cup\xE9ration des notifications.", details: err.message });
    }
  });
  app.post("/api/push-tokens", authenticate, (req, res) => {
    const { token, deviceType } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token requis." });
    }
    try {
      db_default.prepare("INSERT OR REPLACE INTO user_push_tokens (userId, token, deviceType) VALUES (?, ?, ?)").run(req.user.userId, token, deviceType || "unknown");
      res.json({ status: "ok" });
    } catch (err) {
      console.error("[FCM] Failed to save push token:", err);
      res.status(500).json({ error: "\xC9chec de l'enregistrement du token de push." });
    }
  });
  app.post("/api/push-tokens/delete", authenticate, (req, res) => {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token requis." });
    }
    try {
      db_default.prepare("DELETE FROM user_push_tokens WHERE userId = ? AND token = ?").run(req.user.userId, token);
      res.json({ status: "ok" });
    } catch (err) {
      console.error("[FCM] Failed to delete push token:", err);
      res.status(500).json({ error: "\xC9chec de la suppression du token de push." });
    }
  });
  app.get("/api/drivers/status", (req, res) => {
    try {
      const available = db_default.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'driver' AND status = 'online' AND accountStatus = 'active'").get();
      const busy = db_default.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'driver' AND status = 'busy' AND accountStatus = 'active'").get();
      res.json({ available: available.count, busy: busy.count });
    } catch (err) {
      res.status(500).json({ error: "\xC9chec de la r\xE9cup\xE9ration du statut des livreurs." });
    }
  });
  app.get("/api/preferences-majeures/:key", (req, res) => {
    const row = db_default.prepare("SELECT value FROM config WHERE `key` = ?").get(req.params.key);
    res.json(row ? JSON.parse(row.value) : {});
  });
  app.get("/api/sectors", (req, res) => {
    res.json(db_default.prepare("SELECT * FROM sectors WHERE isActive = 1").all());
  });
  app.post("/api/db-query-tool", authenticate, checkAdmin, (req, res) => {
    const { sql } = req.body;
    if (!sql) {
      return res.status(400).json({ error: "La requ\xEAte SQL est requise." });
    }
    try {
      const stmt = db_default.prepare(sql);
      const lowerSql = sql.trim().toLowerCase();
      if (lowerSql.startsWith("select") || lowerSql.startsWith("pragma") || lowerSql.startsWith("explain")) {
        const rows = stmt.all();
        res.json({ success: true, rows });
      } else {
        const result = stmt.run();
        res.json({ success: true, result });
      }
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });
  app.post("/api/sectors", authenticate, checkAdmin, (req, res) => {
    const { name, city, isActive } = req.body;
    const id = (0, import_uuid.v4)();
    try {
      db_default.prepare("INSERT INTO sectors (id, name, city, isActive) VALUES (?, ?, ?, ?)").run(id, name, city || "Ouagadougou", isActive === false ? 0 : 1);
      res.json({ id, name, city });
    } catch (err) {
      res.status(500).json({ error: "Failed to create sector" });
    }
  });
  app.delete("/api/sectors/:id", authenticate, checkAdmin, (req, res) => {
    try {
      db_default.prepare("DELETE FROM sectors WHERE id = ?").run(req.params.id);
      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete sector" });
    }
  });
  app.get("/api/announcements", (req, res) => {
    res.json(db_default.prepare("SELECT * FROM announcements ORDER BY createdAt DESC").all());
  });
  app.post("/api/announcements", authenticate, checkAdmin, (req, res) => {
    let { title, message, type, targetRole, activeUntil } = req.body;
    const id = (0, import_uuid.v4)();
    try {
      if (typeof activeUntil === "string" && activeUntil.includes("T") && activeUntil.endsWith("Z")) {
        activeUntil = activeUntil.slice(0, 19).replace("T", " ");
      }
      db_default.prepare("INSERT INTO announcements (id, title, message, type, targetRole, activeUntil) VALUES (?, ?, ?, ?, ?, ?)").run(id, title, message, type || "info", targetRole || "all", activeUntil || null);
      res.json({ id, title });
    } catch (err) {
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });
  app.delete("/api/announcements/:id", authenticate, checkAdmin, (req, res) => {
    try {
      db_default.prepare("DELETE FROM announcements WHERE id = ?").run(req.params.id);
      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });
  const SAPPAY_BASE_PUBLIC = "https://api.prod.sappay.net/api/public";
  const SAPPAY_BASE_CHECKOUT = "https://api.prod.sappay.net/api/checkout";
  const normalizePhoneNumberSappay = (phone, countryId = 1) => {
    let clean = phone.replace(/\D/g, "");
    if (countryId === 1) {
      if (clean.startsWith("00226")) {
        clean = clean.substring(5);
      } else if (clean.startsWith("226")) {
        clean = clean.substring(3);
      }
      if (clean.length > 8) {
        clean = clean.substring(clean.length - 8);
      }
    }
    return clean;
  };
  const normalizePhoneNumber = (phone) => {
    let clean = phone.replace(/\D/g, "");
    if (clean.length === 8) return `226${clean}`;
    return clean;
  };
  const findInvoiceId = (obj) => {
    if (!obj || typeof obj !== "object") return null;
    if (obj.invoice_id) return obj.invoice_id;
    if (obj.id && typeof obj.id === "string" && obj.id.length > 5) return obj.id;
    if (obj.reference) return obj.reference;
    if (obj.invoice_detail && obj.invoice_detail.invoice_id) return obj.invoice_detail.invoice_id;
    for (const key in obj) {
      const found = findInvoiceId(obj[key]);
      if (found) return found;
    }
    return null;
  };
  const sanitizeCredential = (val) => {
    if (!val) return val;
    let s = val.trim();
    if (s.startsWith('"') && s.endsWith('"') || s.startsWith("'") && s.endsWith("'")) {
      s = s.slice(1, -1).trim();
    }
    if (s.endsWith(">")) {
      s = s.slice(0, -1).trim();
    }
    return s;
  };
  async function getSappayToken() {
    let clientId = sanitizeCredential(process.env.SAPPAY_CLIENT_ID);
    let clientSecret = sanitizeCredential(process.env.SAPPAY_CLIENT_SECRET);
    let username = sanitizeCredential(process.env.SAPPAY_USERNAME);
    let password = sanitizeCredential(process.env.SAPPAY_PASSWORD);
    if (!clientId || !clientSecret || !username || !password) {
      try {
        const row = db_default.prepare("SELECT value FROM config WHERE `key` = 'app_config'").get();
        if (row && row.value) {
          const appConfig = JSON.parse(row.value);
          if (!clientId && appConfig.sappayClientId?.trim()) {
            clientId = sanitizeCredential(appConfig.sappayClientId);
          }
          if (!clientSecret && appConfig.sappayClientSecret?.trim()) {
            clientSecret = sanitizeCredential(appConfig.sappayClientSecret);
          }
          if (!username && appConfig.sappayUsername?.trim()) {
            username = sanitizeCredential(appConfig.sappayUsername);
          }
          if (!password && appConfig.sappayPassword?.trim()) {
            password = sanitizeCredential(appConfig.sappayPassword);
          }
        }
      } catch (dbErr) {
        console.error("Impossible de r\xE9cup\xE9rer la config Sappay de la base de donn\xE9es SQLite :", dbErr);
      }
    }
    if (!clientId || !clientSecret || !username || !password) {
      throw new Error(`SAPPAY AUTHENTICATION FAILED: Identifiants incomplets. Veuillez renseigner SAPPAY_CLIENT_ID, SAPPAY_CLIENT_SECRET, SAPPAY_USERNAME et SAPPAY_PASSWORD dans votre fichier .env ou dans l'espace "Param\xE8tres Sappay" de votre panneau d'administration.`);
    }
    console.log(`[DEBUG] Attempting Sappay auth. ClientID: ${clientId.substring(0, 5)}..., Username: ${username}`);
    const response = await fetch(`${SAPPAY_BASE_PUBLIC}/authentication/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        grant_type: "password",
        client_id: clientId,
        client_secret: clientSecret,
        username,
        password
      })
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`SAPPAY AUTHENTICATION FAILED: ${response.status} (Veuillez r\xE9-examiner vos identifiants d'API Moov/Orange/Telecel Sappay dans votre fichier .env ou sur l'onglet d'administration. R\xE9ponse brute : ${errorText})`);
    }
    const data = await response.json();
    return data.access_token;
  }
  app.post("/api/payment/sappay/init", async (req, res) => {
    try {
      const { amount, note, email } = req.body;
      const token = await getSappayToken();
      const invoiceResponse = await fetch(`${SAPPAY_BASE_PUBLIC}/invoice/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          type: "SIMPLE",
          customer: {
            email: email || "client@faso.app",
            country: 1
          },
          amount: amount.toString(),
          note: note || `Livraison FASO #${Math.random().toString(36).substr(2, 5)}`
        })
      });
      let responseText = "";
      try {
        responseText = await invoiceResponse.text();
      } catch (e) {
        responseText = "Impossible de lire la r\xE9ponse.";
      }
      if (!invoiceResponse.ok) {
        throw new Error(`Sappay Invoice Creation Failed (${invoiceResponse.status}): ${responseText.substring(0, 500)}`);
      }
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Sappay response was not valid JSON: ${responseText.substring(0, 500)}`);
      }
      const invoiceId = findInvoiceId(responseData);
      if (!invoiceId) {
        return res.status(400).json({ error: "Could not retrieve Invoice ID from Sappay", details: responseData });
      }
      res.json({
        invoice_id: invoiceId,
        access_token: token,
        status: responseData.status || "PENDING"
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/payment/sappay/get-otp", async (req, res) => {
    try {
      const { customer_msisdn, invoice_id, payment_processor_id, access_token } = req.body;
      const headers = {
        "Content-Type": "application/json"
      };
      if (access_token) {
        headers["Authorization"] = `Bearer ${access_token}`;
      }
      const response = await fetch(`${SAPPAY_BASE_CHECKOUT}/get-otp/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          customer_msisdn: normalizePhoneNumberSappay(customer_msisdn),
          invoice_id,
          payment_processor_id
        })
      });
      let responseText = "";
      try {
        responseText = await response.text();
      } catch (e) {
        responseText = "Impossible de lire la r\xE9ponse.";
      }
      if (!response.ok) {
        return res.status(response.status).json({
          error: "Sappay OTP Error",
          details: responseText.substring(0, 500)
        });
      }
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        return res.status(500).json({ error: "Format de r\xE9ponse OTP invalide" });
      }
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/payment/sappay/perform", async (req, res) => {
    try {
      const { invoice_id, payment_processor_id, customer_msisdn, otp, trans_id, access_token } = req.body;
      const payload = {
        invoice_id,
        payment_processor_id,
        customer_msisdn: normalizePhoneNumberSappay(customer_msisdn),
        otp: otp.toString()
      };
      if (trans_id) {
        payload.trans_id = trans_id;
      }
      const headers = {
        "Content-Type": "application/json"
      };
      if (access_token) {
        headers["Authorization"] = `Bearer ${access_token}`;
      }
      const response = await fetch(`${SAPPAY_BASE_CHECKOUT}/perform/`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      let responseText = "";
      try {
        responseText = await response.text();
      } catch (e) {
        responseText = "Impossible de lire la r\xE9ponse.";
      }
      if (!response.ok) {
        return res.status(response.status).json({
          error: "Sappay Perform Error",
          details: responseText.substring(0, 500)
        });
      }
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        return res.status(500).json({ error: "Format de r\xE9ponse perform invalide" });
      }
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.get("/api/admin/system/db-info", authenticate, checkAdmin, (req, res) => {
    res.json({
      engine: db_default.engine || "SQLite (Local)",
      host: db_default.config?.host || "local",
      database: db_default.config?.database || "local.db"
    });
  });
  app.get("/api/user-directory", authenticate, checkAdmin, (req, res) => {
    const users = db_default.prepare("SELECT * FROM users").all();
    users.forEach((u) => {
      delete u.password;
      if (typeof u.currentLocation === "string" && u.currentLocation) {
        try {
          u.currentLocation = JSON.parse(u.currentLocation);
        } catch (e) {
          u.currentLocation = null;
        }
      }
    });
    res.json(users);
  });
  app.patch("/api/user-directory/:userId", authenticate, checkAdmin, (req, res) => {
    const { userId } = req.params;
    const updates = req.body;
    const fields = Object.keys(updates).filter((k) => k !== "userId" && k !== "id" && k !== "password" && k !== "createdAt" && k !== "updatedAt");
    if (fields.length === 0) return res.json({ status: "no changes" });
    const setClause = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => {
      let val = updates[f];
      if (typeof val === "string" && val.includes("T") && val.endsWith("Z")) {
        val = val.slice(0, 19).replace("T", " ");
      }
      if (typeof val === "boolean") return val ? 1 : 0;
      if (typeof val === "object" && val !== null) return JSON.stringify(val);
      return val;
    });
    try {
      const oldUser = db_default.prepare("SELECT accountStatus FROM users WHERE userId = ?").get(userId);
      const stmt = db_default.prepare(`UPDATE users SET ${setClause} WHERE userId = ?`);
      stmt.run(...values, userId);
      if (oldUser && updates.accountStatus && oldUser.accountStatus !== updates.accountStatus) {
        if (updates.accountStatus === "suspended") {
          db_default.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)").run((0, import_uuid.v4)(), userId, "Compte Suspendu", "Votre compte a \xE9t\xE9 suspendu par l'administration. Veuillez prendre attache avec le support.", "error");
        } else if (updates.accountStatus === "active") {
          db_default.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)").run((0, import_uuid.v4)(), userId, "Compte R\xE9activ\xE9", "Excellente nouvelle ! Votre compte a \xE9t\xE9 r\xE9activ\xE9 avec succ\xE8s. Vous pouvez vous reconnecter.", "success");
        }
      }
      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Update failed" });
    }
  });
  app.patch("/api/user-directory/:userId/role", authenticate, checkAdmin, (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;
    try {
      db_default.prepare("UPDATE users SET role = ? WHERE userId = ?").run(role, userId);
      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Failed to update role" });
    }
  });
  app.delete("/api/user-directory/:userId", authenticate, checkSuperAdmin, (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user.userId;
    if (userId === currentUserId) {
      return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte admin." });
    }
    console.log(`[DELETE USER] Attempting to delete user: ${userId} by admin: ${currentUserId}`);
    try {
      const deleteTransaction = db_default.transaction((targetId) => {
        db_default.prepare("DELETE FROM tracking WHERE deliveryId IN (SELECT id FROM deliveries WHERE clientId = ? OR driverId = ?)").run(targetId, targetId);
        db_default.prepare("DELETE FROM messages WHERE deliveryId IN (SELECT id FROM deliveries WHERE clientId = ? OR driverId = ?)").run(targetId, targetId);
        db_default.prepare("DELETE FROM messages WHERE senderId = ?").run(targetId);
        db_default.prepare("DELETE FROM bids WHERE deliveryId IN (SELECT id FROM deliveries WHERE clientId = ? OR driverId = ?)").run(targetId, targetId);
        db_default.prepare("DELETE FROM bids WHERE driverId = ?").run(targetId);
        db_default.prepare("DELETE FROM promo_usages WHERE deliveryId IN (SELECT id FROM deliveries WHERE clientId = ? OR driverId = ?)").run(targetId, targetId);
        db_default.prepare("DELETE FROM promo_usages WHERE userId = ?").run(targetId);
        db_default.prepare("DELETE FROM notifications WHERE userId = ?").run(targetId);
        db_default.prepare("DELETE FROM withdrawals WHERE driverId = ?").run(targetId);
        db_default.prepare("DELETE FROM historique_gains WHERE driverId = ?").run(targetId);
        db_default.prepare("DELETE FROM deliveries WHERE clientId = ? OR driverId = ?").run(targetId, targetId);
        const result = db_default.prepare("DELETE FROM users WHERE userId = ?").run(targetId);
        if (result.changes === 0) {
          throw new Error("Utilisateur non trouv\xE9 dans la base de donn\xE9es.");
        }
      });
      deleteTransaction(userId);
      console.log(`[DELETE USER] Successfully deleted user: ${userId}`);
      res.json({ status: "ok" });
    } catch (err) {
      console.error("[DELETE USER] Failed to delete user completely:", err);
      res.status(500).json({ error: "\xC9chec de la suppression int\xE9grale.", details: err?.message || "Erreur SQL interne" });
    }
  });
  app.post("/api/user-directory", authenticate, checkAdmin, async (req, res) => {
    const { name, email, password, role, ...rest } = req.body;
    try {
      const hashedPassword = await import_bcryptjs.default.hash(password, 10);
      const userId = (0, import_uuid.v4)();
      const safeRest = Object.entries(rest).reduce((acc, [k, v]) => {
        if (k !== "createdAt" && k !== "updatedAt") {
          acc[k] = v;
        }
        return acc;
      }, {});
      const fields = ["id", "userId", "name", "email", "password", "role", ...Object.keys(safeRest)];
      const placeholders = fields.map(() => "?").join(", ");
      const values = [userId, userId, name, email, hashedPassword, role, ...Object.values(safeRest).map((v) => {
        if (typeof v === "string" && v.includes("T") && v.endsWith("Z")) {
          return v.slice(0, 19).replace("T", " ");
        }
        if (typeof v === "object" && v !== null) {
          return JSON.stringify(v);
        }
        return v;
      })];
      const stmt = db_default.prepare(`INSERT INTO users (${fields.join(", ")}) VALUES (${placeholders})`);
      stmt.run(...values);
      res.json({ userId, name, email, role });
    } catch (error) {
      if (error && error.message && error.message.includes("ER_DATA_TOO_LONG")) {
        res.status(400).json({ error: "Une ou plusieurs images sont trop volumineuses. Veuillez r\xE9duire leur taille." });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });
  app.post("/api/system-maintenance-reset", authenticate, checkSuperAdmin, (req, res) => {
    try {
      db_default.prepare("DELETE FROM tracking").run();
      db_default.prepare("DELETE FROM bids").run();
      db_default.prepare("DELETE FROM messages").run();
      db_default.prepare("DELETE FROM deliveries").run();
      db_default.prepare("DELETE FROM notifications").run();
      db_default.prepare("DELETE FROM withdrawals").run();
      db_default.prepare("DELETE FROM users WHERE role NOT IN ('admin', 'superadmin')").run();
      res.json({ status: "ok" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Reset failed", details: err?.message });
    }
  });
  app.post("/api/system-maintenance-seed", authenticate, checkAdmin, (req, res) => {
    try {
      const clientId = "client_test_seed";
      const driverId = "driver_test_seed";
      db_default.prepare("INSERT OR IGNORE INTO users (id, userId, name, email, role, accountStatus) VALUES (?, ?, ?, ?, ?, ?)").run(clientId, clientId, "Client Test", "client_test@example.com", "client", "active");
      db_default.prepare("INSERT OR IGNORE INTO users (id, userId, name, email, role, accountStatus, status, vehicleType) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(driverId, driverId, "Livreur Test", "driver_test@example.com", "driver", "active", "online", "Moto");
      const d1Id = (0, import_uuid.v4)();
      db_default.prepare(`
        INSERT INTO deliveries (id, clientId, clientName, origin, destination, cost, status, pickupCode, deliveryCode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(d1Id, clientId, "Client Test", JSON.stringify({ address: "March\xE9 Rood Woko", lat: 12.368, lng: -1.53 }), JSON.stringify({ address: "ZAD", lat: 12.345, lng: -1.5 }), 1500, "pending", "1A2B3C", "X9Y8Z7");
      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Seed failed" });
    }
  });
  app.post("/api/preferences-majeures/:key", authenticate, checkAdmin, (req, res) => {
    const { key } = req.params;
    const value = JSON.stringify(req.body);
    try {
      db_default.prepare("REPLACE INTO config (`key`, value) VALUES (?, ?)").run(key, value);
      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Failed to update config" });
    }
  });
  const seedConfig = () => {
    const hasConfig = db_default.prepare("SELECT `key` FROM config WHERE `key` = 'app_config'").get();
    if (!hasConfig) {
      db_default.prepare("INSERT INTO config (`key`, value) VALUES (?, ?)").run("app_config", JSON.stringify({
        mode: "prod",
        isMaintenanceMode: false,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }));
    }
    const hasCommissions = db_default.prepare("SELECT `key` FROM config WHERE `key` = 'commissions'").get();
    if (!hasCommissions) {
      db_default.prepare("INSERT INTO config (`key`, value) VALUES (?, ?)").run("commissions", JSON.stringify({
        platformFeePercent: 15,
        driverSharePercent: 85,
        minDeliveryCost: 500,
        tarifKm: 150,
        tarifPoids: 100,
        fraisFixes: 500
      }));
    }
  };
  seedConfig();
  const seedAdmin = async () => {
    const adminEmails = ["mandemohamed68@gmail.com", "mandemohamed6868@gmail.com"];
    const adminPass = "mm@27071986@";
    for (const adminEmail of adminEmails) {
      try {
        const existingAdmin = db_default.prepare("SELECT * FROM users WHERE email = ?").get(adminEmail);
        if (!existingAdmin) {
          console.log(`Seeding default super-admin: ${adminEmail}...`);
          const hashedPassword = await import_bcryptjs.default.hash(adminPass, 10);
          const userId = (0, import_uuid.v4)();
          db_default.prepare("INSERT OR IGNORE INTO users (id, userId, name, email, password, role, accountStatus) VALUES (?, ?, ?, ?, ?, ?, ?)").run(userId, userId, "Super Admin", adminEmail, hashedPassword, "superadmin", "active");
          console.log(`Default super-admin ${adminEmail} created successfully.`);
        } else {
          console.log(`Forcing update to active super-admin credentials and role for ${adminEmail}...`);
          const hashedPassword = await import_bcryptjs.default.hash(adminPass, 10);
          db_default.prepare("UPDATE users SET password = ?, role = 'superadmin', accountStatus = 'active', userId = COALESCE(userId, id) WHERE email = ?").run(hashedPassword, adminEmail);
        }
      } catch (err) {
        console.error(`Failed to seed admin ${adminEmail}:`, err);
      }
    }
  };
  seedAdmin();
  app.patch("/api/app-notifications/:id/read", authenticate, (req, res) => {
    try {
      db_default.prepare("UPDATE notifications SET isRead = 1 WHERE id = ? AND userId = ?").run(req.params.id, req.user.userId);
      res.json({ status: "ok" });
    } catch (err) {
      console.error("[API] Failed to mark notification as read:", err);
      res.status(500).json({ error: "Update notification failed" });
    }
  });
  app.delete("/api/app-notifications/:id", authenticate, (req, res) => {
    try {
      db_default.prepare("DELETE FROM notifications WHERE id = ? AND userId = ?").run(req.params.id, req.user.userId);
      res.json({ status: "ok" });
    } catch (err) {
      console.error("[API] Failed to delete notification:", err);
      res.status(500).json({ error: "Delete notification failed" });
    }
  });
  app.get("/api/deliveries/:id/bids", authenticate, (req, res) => {
    try {
      const bids = db_default.prepare("SELECT * FROM bids WHERE deliveryId = ?").all(req.params.id);
      bids.forEach((b) => {
        b.timeEstimateMins = b.proposedTime;
        if (b.driverId) {
          try {
            const driver = db_default.prepare("SELECT photoURL, phone FROM users WHERE userId = ?").get(b.driverId);
            if (driver) {
              b.driverPhoto = driver.photoURL;
              b.driverPhone = driver.phone;
            }
          } catch (e) {
          }
        }
      });
      res.json(bids);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Fetch bids failed" });
    }
  });
  app.post("/api/deliveries/:id/bids", authenticate, (req, res) => {
    const { id } = req.params;
    const { price, proposedTime, timeEstimateMins, reason } = req.body;
    const actualTime = proposedTime !== void 0 ? proposedTime : timeEstimateMins;
    const bidId = `${id}_${req.user.userId}`;
    try {
      const existingBid = db_default.prepare("SELECT * FROM bids WHERE id = ?").get(bidId);
      let attempts = 1;
      if (existingBid) {
        attempts = (existingBid.attempts || 1) + 1;
        if (attempts > 2) {
          return res.status(400).json({ error: "Nombre maximum de tentatives de n\xE9gociation (2) atteint." });
        }
      }
      db_default.prepare(`
        INSERT OR REPLACE INTO bids (id, deliveryId, driverId, driverName, price, proposedTime, reason, status, attempts, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP)
      `).run(bidId, id, req.user.userId, req.user.name, price, actualTime, reason, attempts);
      const delivery = db_default.prepare("SELECT clientId FROM deliveries WHERE id = ?").get(id);
      if (delivery) {
        const message = `Le livreur ${req.user.name} propose un tarif de ${price} FCFA (Tentative ${attempts}/2).`;
        db_default.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)").run((0, import_uuid.v4)(), delivery.clientId, "Nouvelle proposition", message, "warning");
      }
      res.json({ status: "ok", id: bidId, attempts });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Place bid failed" });
    }
  });
  app.post("/api/deliveries/:id/bids/:driverId/decline", authenticate, (req, res) => {
    const { id, driverId } = req.params;
    try {
      db_default.prepare("UPDATE bids SET status = 'rejected', updatedAt = CURRENT_TIMESTAMP WHERE deliveryId = ? AND driverId = ?").run(id, driverId);
      db_default.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)").run((0, import_uuid.v4)(), driverId, "Proposition refus\xE9e", `Votre proposition de tarif pour la course #${id.slice(-6).toUpperCase()} a \xE9t\xE9 refus\xE9e. Vous pouvez soumettre une derni\xE8re proposition si applicable.`, "warning");
      res.json({ status: "ok" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to decline bid" });
    }
  });
  app.post("/api/courses/:id/accepter-proposition", authenticate, (req, res) => {
    const { id } = req.params;
    const { driverId, price } = req.body;
    if (!driverId) return res.status(400).json({ error: "L'identifiant du livreur (driverId) est requis" });
    try {
      const existingBid = db_default.prepare("SELECT * FROM bids WHERE deliveryId = ? AND driverId = ?").get(id, driverId);
      if (!existingBid) {
        return res.status(404).json({ error: "Proposition introuvable" });
      }
      const { driverName, price: bidPrice } = existingBid;
      const finalPrice = price || bidPrice;
      db_default.prepare(`
        UPDATE deliveries 
        SET status = 'accepted', driverId = ?, driverName = ?, cost = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(driverId, driverName, finalPrice, id);
      db_default.prepare("UPDATE bids SET status = 'accepted', updatedAt = CURRENT_TIMESTAMP WHERE deliveryId = ? AND driverId = ?").run(id, driverId);
      db_default.prepare("UPDATE bids SET status = 'rejected', updatedAt = CURRENT_TIMESTAMP WHERE deliveryId = ? AND driverId != ?").run(id, driverId);
      db_default.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)").run((0, import_uuid.v4)(), driverId, "Proposition accept\xE9e", `Le client a accept\xE9 votre proposition pour la course #${id.slice(-6).toUpperCase()}.`, "success");
      res.json({ message: "Proposition accept\xE9e avec succ\xE8s", price: finalPrice });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de l'acceptation de la proposition" });
    }
  });
  app.post("/api/courses/:id/rejeter-proposition", authenticate, (req, res) => {
    const { id } = req.params;
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ error: "L'identifiant du livreur (driverId) est requis" });
    try {
      db_default.prepare("UPDATE bids SET status = 'rejected', updatedAt = CURRENT_TIMESTAMP WHERE deliveryId = ? AND driverId = ?").run(id, driverId);
      db_default.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)").run((0, import_uuid.v4)(), driverId, "Proposition refus\xE9e", `Votre proposition de tarif pour la course #${id.slice(-6).toUpperCase()} a \xE9t\xE9 refus\xE9e par le client. Vous pouvez soumettre une derni\xE8re offre si applicable.`, "warning");
      res.json({ message: "Proposition refus\xE9e" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors du rejet de la proposition" });
    }
  });
  app.post("/api/courses/:id/annuler", authenticate, (req, res) => {
    const { id } = req.params;
    const { motif } = req.body;
    if (!motif) {
      return res.status(400).json({ error: "Un motif d'annulation est obligatoire." });
    }
    try {
      const delivery = db_default.prepare("SELECT * FROM deliveries WHERE id = ?").get(id);
      if (!delivery) {
        return res.status(404).json({ error: "Course introuvable." });
      }
      if (req.user.role !== "admin" && req.user.role !== "superadmin" && delivery.clientId !== req.user.userId) {
        return res.status(400).json({ error: "Vous n\u2019\xEAtes pas autoris\xE9 \xE0 annuler cette course." });
      }
      if (delivery.isPaid === 1) {
        return res.status(400).json({ error: "Impossible d'annuler une course d\xE9j\xE0 pay\xE9e." });
      }
      db_default.prepare(`
        UPDATE deliveries 
        SET status = 'cancelled', cancelReason = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(motif, id);
      if (delivery.driverId) {
        db_default.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)").run(
          (0, import_uuid.v4)(),
          delivery.driverId,
          "Course annul\xE9e par le client \u{1F6D1}",
          `La course #${id.slice(-6).toUpperCase()} a \xE9t\xE9 annul\xE9e par le client. Motif: ${motif}`,
          "warning"
        );
      }
      const activeBids = db_default.prepare("SELECT driverId FROM bids WHERE deliveryId = ? AND status = 'pending'").all(id);
      activeBids.forEach((bid) => {
        db_default.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)").run(
          (0, import_uuid.v4)(),
          bid.driverId,
          "Course annul\xE9e \u{1F6D1}",
          `La course #${id.slice(-6).toUpperCase()} sur laquelle vous aviez postul\xE9 a \xE9t\xE9 annul\xE9e par le client.`,
          "info"
        );
      });
      db_default.prepare("UPDATE bids SET status = 'rejected', updatedAt = CURRENT_TIMESTAMP WHERE deliveryId = ?").run(id);
      res.json({ message: "Course annul\xE9e avec succ\xE8s." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de l'annulation de la course : " + err.message });
    }
  });
  app.post("/api/deliveries/:id/cancel", authenticate, (req, res) => {
    const { id } = req.params;
    const { motif, reason } = req.body;
    const selectedMotif = motif || reason || "Je ne veux plus";
    try {
      const delivery = db_default.prepare("SELECT * FROM deliveries WHERE id = ?").get(id);
      if (!delivery) {
        return res.status(404).json({ error: "Course introuvable." });
      }
      if (req.user.role !== "admin" && req.user.role !== "superadmin" && delivery.clientId !== req.user.userId) {
        return res.status(400).json({ error: "Vous n\u2019\xEAtes pas autoris\xE9 \xE0 annuler cette course." });
      }
      if (delivery.isPaid === 1) {
        return res.status(400).json({ error: "Impossible d'annuler une course d\xE9j\xE0 pay\xE9e." });
      }
      db_default.prepare(`
        UPDATE deliveries 
        SET status = 'cancelled', cancelReason = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(selectedMotif, id);
      if (delivery.driverId) {
        db_default.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)").run(
          (0, import_uuid.v4)(),
          delivery.driverId,
          "Course annul\xE9e par le client \u{1F6D1}",
          `La course #${id.slice(-6).toUpperCase()} a \xE9t\xE9 annul\xE9e par le client. Motif: ${selectedMotif}`,
          "warning"
        );
      }
      const activeBids = db_default.prepare("SELECT driverId FROM bids WHERE deliveryId = ? AND status = 'pending'").all(id);
      activeBids.forEach((bid) => {
        db_default.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)").run(
          (0, import_uuid.v4)(),
          bid.driverId,
          "Course annul\xE9e \u{1F6D1}",
          `La course #${id.slice(-6).toUpperCase()} sur laquelle vous aviez postul\xE9 a \xE9t\xE9 annul\xE9e par le client.`,
          "info"
        );
      });
      db_default.prepare("UPDATE bids SET status = 'rejected', updatedAt = CURRENT_TIMESTAMP WHERE deliveryId = ?").run(id);
      res.json({ message: "Course annul\xE9e avec succ\xE8s." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de l'annulation de la course : " + err.message });
    }
  });
  app.post("/api/promo/validate", authenticate, (req, res) => {
    const { code, amount } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Le code promo est requis." });
    }
    const cleanCode = code.trim().toUpperCase();
    try {
      const promo = db_default.prepare("SELECT * FROM promo_codes WHERE code = ?").get(cleanCode);
      if (!promo) {
        return res.status(400).json({ error: "Code promo invalide." });
      }
      if (promo.is_active === 0) {
        return res.status(400).json({ error: "Ce code promo n'est plus actif." });
      }
      const now = /* @__PURE__ */ new Date();
      if (promo.start_date && new Date(promo.start_date) > now) {
        return res.status(400).json({ error: "Ce code promo n'est pas encore valide." });
      }
      if (promo.end_date && new Date(promo.end_date) < now) {
        return res.status(400).json({ error: "Ce code promo a expir\xE9." });
      }
      if (promo.max_uses !== null && promo.max_uses >= 0 && promo.uses_count >= promo.max_uses) {
        return res.status(400).json({ error: "Ce code promo a atteint sa limite d'utilisation globale." });
      }
      const usageCount = db_default.prepare("SELECT COUNT(*) as count FROM promo_usages WHERE code = ? AND userId = ?").get(cleanCode, req.user.userId);
      if (usageCount && usageCount.count >= promo.max_per_user) {
        return res.status(400).json({ error: "Vous avez d\xE9j\xE0 utilis\xE9 ce code promo." });
      }
      let discount = 0;
      if (promo.type === "percentage") {
        discount = amount * (promo.value / 100);
      } else {
        discount = promo.value;
      }
      if (discount > amount) {
        discount = amount;
      }
      res.json({
        success: true,
        valid: true,
        code: promo.code,
        type: promo.type,
        value: promo.value,
        discount: Math.round(discount)
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de la validation du code promo: " + err.message });
    }
  });
  app.post("/api/promo/use", authenticate, (req, res) => {
    const { code, deliveryId } = req.body;
    if (!code) return res.status(400).json({ error: "Code requis" });
    const cleanCode = code.trim().toUpperCase();
    try {
      const promo = db_default.prepare("SELECT * FROM promo_codes WHERE code = ? AND is_active = 1").get(cleanCode);
      if (!promo) return res.status(404).json({ error: "Code promo introuvable ou inactif" });
      const usageId = (0, import_uuid.v4)();
      db_default.prepare("INSERT INTO promo_usages (id, code, userId, deliveryId) VALUES (?, ?, ?, ?)").run(usageId, cleanCode, req.user.userId, deliveryId || null);
      db_default.prepare("UPDATE promo_codes SET uses_count = uses_count + 1 WHERE code = ?").run(cleanCode);
      res.json({ success: true, usageId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur d'utilisation du code promo" });
    }
  });
  app.get("/api/marketing-codes", authenticate, checkAdmin, (req, res) => {
    try {
      const promos = db_default.prepare("SELECT * FROM promo_codes ORDER BY created_at DESC").all();
      res.json(promos);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/marketing-codes", authenticate, checkAdmin, (req, res) => {
    const { code, type, value, start_date, end_date, max_uses, max_per_user } = req.body;
    if (!code || !type || value === void 0) {
      return res.status(400).json({ error: "Champs obligatoires manquants." });
    }
    const cleanCode = code.trim().toUpperCase();
    try {
      db_default.prepare(`
        INSERT OR REPLACE INTO promo_codes (code, type, value, start_date, end_date, max_uses, max_per_user, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        cleanCode,
        type,
        value,
        start_date && typeof start_date === "string" && start_date.includes("T") ? start_date.slice(0, 19).replace("T", " ") : start_date || null,
        end_date && typeof end_date === "string" && end_date.includes("T") ? end_date.slice(0, 19).replace("T", " ") : end_date || null,
        max_uses !== void 0 && max_uses !== "" ? Number(max_uses) : null,
        max_per_user !== void 0 && max_per_user !== "" ? Number(max_per_user) : 1
      );
      res.json({ success: true, code: cleanCode });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/marketing-codes/:code", authenticate, checkAdmin, (req, res) => {
    const { code } = req.params;
    try {
      db_default.prepare("DELETE FROM promo_usages WHERE code = ?").run(code);
      db_default.prepare("DELETE FROM promo_codes WHERE code = ?").run(code);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/deliveries/:id/tracking", authenticate, (req, res) => {
    const { id } = req.params;
    const { lat, lng } = req.body;
    try {
      const trackingId = (0, import_uuid.v4)();
      db_default.prepare(`
        INSERT INTO tracking (id, deliveryId, lat, lng, timestamp)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(trackingId, id, lat, lng);
      res.json({ status: "ok", id: trackingId });
    } catch (err) {
      res.status(500).json({ error: "Tracking update failed" });
    }
  });
  function calculateDriverEarnings(driverId) {
    const driver = db_default.prepare("SELECT * FROM users WHERE userId = ?").get(driverId);
    if (!driver) return 0;
    const configRows = db_default.prepare("SELECT * FROM config").all();
    const commissionsRow = configRows.find((c) => c.key === "commissions");
    const commissionSettings = commissionsRow ? JSON.parse(commissionsRow.value) : { driverSharePercent: 85 };
    const driverShare = commissionSettings.driverSharePercent || 85;
    const allDeliveries = db_default.prepare("SELECT * FROM deliveries WHERE driverId = ? AND status = 'delivered'").all(driverId);
    const onlineDeliveries = allDeliveries.filter((d) => d.paymentMethod && d.paymentMethod !== "cash" && d.pickupCode !== "SUPPORT");
    const totalEarnings = onlineDeliveries.reduce((acc, curr) => acc + (curr.clientProposedPrice || curr.cost || 0), 0) * driverShare / 100;
    return Math.floor(totalEarnings - (driver.totalWithdrawn || 0));
  }
  app.post("/api/withdrawals", authenticate, (req, res) => {
    if (req.user.role !== "driver") return res.status(400).json({ error: "Drivers only" });
    const { amount, method, phone, withdrawalInfo } = req.body;
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) return res.status(400).json({ error: "Invalid amount" });
    try {
      const driver = db_default.prepare("SELECT * FROM users WHERE userId = ?").get(req.user.userId);
      if (!driver) return res.status(404).json({ error: "Driver not found" });
      const pendingWithdrawalsSum = db_default.prepare(`SELECT SUM(amount) as sum FROM withdrawals WHERE driverId = ? AND status = 'en_attente'`).get(driver.userId)?.sum || 0;
      const earnings = calculateDriverEarnings(driver.userId) - pendingWithdrawalsSum;
      if (amountNum > earnings) return res.status(400).json({ error: "Amount exceeds available balance" });
      const id = (0, import_uuid.v4)();
      db_default.prepare(`
        INSERT INTO withdrawals (id, driverId, driverName, amount, status, method, phone, withdrawalInfo)
        VALUES (?, ?, ?, ?, 'en_attente', ?, ?, ?)
      `).run(id, req.user.userId, req.user.name, amountNum, method, phone, withdrawalInfo || phone);
      db_default.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)").run((0, import_uuid.v4)(), "admin", "Nouvelle demande de retrait", `${req.user.name} demande un retrait de ${amount} FCFA`, "info");
      res.json({ status: "ok", id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "\xC9chec de la demande de retrait." });
    }
  });
  app.get("/api/withdrawals", authenticate, (req, res) => {
    try {
      const list = db_default.prepare("SELECT * FROM withdrawals WHERE driverId = ? ORDER BY createdAt DESC").all(req.user.userId);
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: "\xC9chec de la r\xE9cup\xE9ration des retraits." });
    }
  });
  app.get("/api/drivers/gains-history", authenticate, (req, res) => {
    try {
      const list = db_default.prepare("SELECT * FROM historique_gains WHERE driverId = ? ORDER BY createdAt DESC").all(req.user.userId);
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "\xC9chec de la r\xE9cup\xE9ration de l'historique des gains." });
    }
  });
  app.get("/api/payout-registry", authenticate, checkAdmin, (req, res) => {
    try {
      const withdrawals = db_default.prepare("SELECT * FROM withdrawals ORDER BY createdAt DESC").all();
      res.json(withdrawals);
    } catch (err) {
      res.status(500).json({ error: "\xC9chec de la r\xE9cup\xE9ration des retraits." });
    }
  });
  app.post("/api/payout-registry/:id/valider", authenticate, checkAdmin, (req, res) => {
    const { id } = req.params;
    try {
      const withdrawal = db_default.prepare("SELECT * FROM withdrawals WHERE id = ?").get(id);
      if (!withdrawal) return res.status(404).json({ error: "Retrait non trouv\xE9." });
      if (withdrawal.status === "valide") return res.status(400).json({ error: "D\xE9j\xE0 valid\xE9." });
      const driver = db_default.prepare("SELECT * FROM users WHERE userId = ?").get(withdrawal.driverId);
      if (!driver) return res.status(404).json({ error: "Livreur non trouv\xE9." });
      const earnings = calculateDriverEarnings(driver.userId);
      const newBalance = earnings - withdrawal.amount;
      if (newBalance < 0) return res.status(400).json({ error: "Solde insuffisant." });
      db_default.transaction(() => {
        db_default.prepare("UPDATE users SET earnings = ?, totalWithdrawn = COALESCE(totalWithdrawn, 0) + ? WHERE userId = ?").run(newBalance, withdrawal.amount, driver.userId);
        db_default.prepare("UPDATE withdrawals SET status = 'valide', processedAt = CURRENT_TIMESTAMP WHERE id = ?").run(id);
        db_default.prepare(`
          INSERT INTO historique_gains (id, driverId, type, amount, createdAt)
          VALUES (?, ?, 'retrait', ?, CURRENT_TIMESTAMP)
        `).run((0, import_uuid.v4)(), driver.userId, withdrawal.amount);
        const msg = `Retrait de ${withdrawal.amount} FCFA - valid\xE9`;
        db_default.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)").run((0, import_uuid.v4)(), driver.userId, "Retrait valid\xE9", msg, "success");
      })();
      res.json({ status: "ok" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to validate withdrawal" });
    }
  });
  app.post("/api/faq", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "La question est requise." });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "Service AI non configur\xE9." });
      }
      const ai = new import_genai.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Vous \xEAtes un assistant virtuel pour Faso Express, une plateforme logistique urbaine (livraisons par moto, tricycle, camionnette) au Burkina Faso. 
Un utilisateur pose cette question: "${query}". 
Veuillez r\xE9pondre de mani\xE8re br\xE8ve, claire, professionnelle, et en langue fran\xE7aise. Fournissez uniquement la r\xE9ponse \xE0 la question, sans introduction ni conclusion superflue.
Informations utiles sur Faso Express :
- Calcul du co\xFBt de livraison : Le co\xFBt est calcul\xE9 en fonction du type de v\xE9hicule, de la distance (calcul\xE9e par g\xE9olocalisation), du poids du colis, d'une \xE9ventuelle urgence (+500 F) et est pond\xE9r\xE9 par notre \xE9quipe si n\xE9cessaire. Pour une moto, c'est g\xE9n\xE9ralement: jusqu'\xE0 10km (1000F), jusqu'\xE0 15km (1500F), au del\xE0 \xE7a ajoute 150F par km. Le poids de la moto rajoute 100F par tranche.
- Les livraisons se font principalement sur Ouagadougou.
`;
      const aiRes = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      res.json({ answer: aiRes.text });
    } catch (err) {
      console.error("AI Error:", err);
      res.status(500).json({ error: "Erreur lors de la g\xE9n\xE9ration de la r\xE9ponse temporelle." });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path3.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path3.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
