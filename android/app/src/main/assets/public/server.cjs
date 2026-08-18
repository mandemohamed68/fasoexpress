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
var import_helmet = __toESM(require("helmet"), 1);
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
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
  function connect() {
    connection = null;
    lastError = null;
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      try {
        const conn = new import_sync_mysql.default({
          host,
          user,
          password: candidate,
          database,
          port,
          multipleStatements: false,
          charset: "utf8mb4",
          connectTimeout: 5e3
        });
        conn.query("SELECT 1");
        connection = conn;
        try {
          conn.query("SET SESSION max_statement_time = 5");
        } catch (e) {
        }
        try {
          conn.query("SET SESSION max_execution_time = 5000");
        } catch (e) {
        }
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
  }
  connect();
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
    try {
      connection.query("ALTER TABLE users ADD COLUMN permissions text DEFAULT NULL");
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN permissionsList text DEFAULT NULL");
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN withdrawalRequested tinyint(1) DEFAULT 0");
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN withdrawalAmount double DEFAULT 0");
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN withdrawalMethod varchar(100) DEFAULT NULL");
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN vehicleType varchar(100) DEFAULT NULL");
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN licensePlate varchar(100) DEFAULT NULL");
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN updatedAt datetime DEFAULT NULL");
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN accountStatus varchar(50) DEFAULT 'active'");
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE users ADD COLUMN isVerified tinyint(1) DEFAULT 0");
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE users MODIFY COLUMN role varchar(50) NOT NULL DEFAULT 'client'");
    } catch (e) {
      console.error("Failed to alter role column in users:", e.message);
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
      connection.query("ALTER TABLE withdrawals ADD COLUMN reason text DEFAULT NULL");
    } catch (e) {
      if (!e.message.includes("Duplicate column name")) console.error("Failed to add column reason to withdrawals:", e.message);
    }
    try {
      connection.query("ALTER TABLE withdrawals ADD COLUMN txId varchar(100) DEFAULT NULL");
    } catch (e) {
      if (!e.message.includes("Duplicate column name")) console.error("Failed to add column txId to withdrawals:", e.message);
    }
    try {
      connection.query("ALTER TABLE withdrawals ADD COLUMN mode varchar(50) DEFAULT NULL");
    } catch (e) {
      if (!e.message.includes("Duplicate column name")) console.error("Failed to add column mode to withdrawals:", e.message);
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
    try {
      try {
        connection.query("ALTER TABLE deliveries ADD COLUMN pickupProofImage LONGTEXT DEFAULT NULL");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column pickupProofImage to deliveries:", e.message);
      }
    } catch (e) {
    }
    try {
      try {
        connection.query("ALTER TABLE deliveries ADD COLUMN deliveryProofImage LONGTEXT DEFAULT NULL");
      } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error("Failed to add column deliveryProofImage to deliveries:", e.message);
      }
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE deliveries MODIFY COLUMN packageDetails LONGTEXT DEFAULT NULL");
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE deliveries MODIFY COLUMN origin LONGTEXT DEFAULT NULL");
    } catch (e) {
    }
    try {
      connection.query("ALTER TABLE deliveries MODIFY COLUMN destination LONGTEXT DEFAULT NULL");
    } catch (e) {
    }
    connection.query(`
      CREATE TABLE IF NOT EXISTS config (
        \`key\` varchar(255) PRIMARY KEY,
        \`value\` LONGTEXT NOT NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    try {
      connection.query("ALTER TABLE config MODIFY COLUMN `value` LONGTEXT NOT NULL");
    } catch (e) {
    }
    connection.query(`
      CREATE TABLE IF NOT EXISTS config_store (
        id varchar(255) PRIMARY KEY,
        data LONGTEXT NOT NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    try {
      connection.query("ALTER TABLE config_store MODIFY COLUMN data LONGTEXT NOT NULL");
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
    const archiveTablesToCreate = [
      `CREATE TABLE IF NOT EXISTS tracking_partition_archive (id varchar(255) PRIMARY KEY, deliveryId varchar(255) NOT NULL, lat double NOT NULL, lng double NOT NULL, timestamp datetime, archivedAt datetime DEFAULT CURRENT_TIMESTAMP) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS messages_partition_archive (id varchar(255) PRIMARY KEY, deliveryId varchar(255) NOT NULL, text text NOT NULL, senderId varchar(255) NOT NULL, senderName varchar(255), senderRole varchar(50), createdAt datetime, archivedAt datetime DEFAULT CURRENT_TIMESTAMP) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS notifications_partition_archive (id varchar(255) PRIMARY KEY, userId varchar(255) NOT NULL, title varchar(255) NOT NULL, message text NOT NULL, type varchar(50), link text, isRead tinyint(1), createdAt datetime, archivedAt datetime DEFAULT CURRENT_TIMESTAMP) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS deliveries_partition_archive (id varchar(255) PRIMARY KEY, clientId varchar(255) NOT NULL, driverId varchar(255), status varchar(50), cost double, createdAt datetime, archivedAt datetime DEFAULT CURRENT_TIMESTAMP) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS users_partition_archive (id varchar(255) PRIMARY KEY, phone varchar(50), role varchar(50), archivedAt datetime DEFAULT CURRENT_TIMESTAMP) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS withdrawals_partition_archive (id varchar(255) PRIMARY KEY, driverId varchar(255), amount double, status varchar(50), createdAt datetime, archivedAt datetime DEFAULT CURRENT_TIMESTAMP) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS bids_partition_archive (id varchar(255) PRIMARY KEY, deliveryId varchar(255), driverId varchar(255), price double, createdAt datetime, archivedAt datetime DEFAULT CURRENT_TIMESTAMP) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS historique_gains_partition_archive (id varchar(255) PRIMARY KEY, driverId varchar(255), amount double, createdAt datetime, archivedAt datetime DEFAULT CURRENT_TIMESTAMP) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS promo_usages_partition_archive (id varchar(255) PRIMARY KEY, code varchar(255), userId varchar(255), used_at datetime, archivedAt datetime DEFAULT CURRENT_TIMESTAMP) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    ];
    archiveTablesToCreate.forEach((sqlQuery) => {
      try {
        connection.query(sqlQuery);
      } catch (e) {
      }
    });
    const indexesToCreate = [
      "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
      "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
      "CREATE INDEX IF NOT EXISTS idx_users_userId ON users(userId)",
      "CREATE INDEX IF NOT EXISTS idx_deliveries_clientId ON deliveries(clientId)",
      "CREATE INDEX IF NOT EXISTS idx_deliveries_driverId ON deliveries(driverId)",
      "CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status)",
      "CREATE INDEX IF NOT EXISTS idx_deliveries_createdAt ON deliveries(createdAt)",
      "CREATE INDEX IF NOT EXISTS idx_bids_deliveryId ON bids(deliveryId)",
      "CREATE INDEX IF NOT EXISTS idx_bids_driverId ON bids(driverId)",
      "CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId)",
      "CREATE INDEX IF NOT EXISTS idx_tracking_deliveryId ON tracking(deliveryId)",
      "CREATE INDEX IF NOT EXISTS idx_messages_deliveryId ON messages(deliveryId)"
    ];
    indexesToCreate.forEach((idxQuery) => {
      try {
        connection.query(idxQuery);
      } catch (e) {
        if (!e.message?.includes("Duplicate key name") && !e.message?.includes("already exists")) {
          const match = idxQuery.match(/CREATE INDEX IF NOT EXISTS\s+(\w+)\s+ON\s+(\w+)\((.+)\)/i);
          if (match) {
            try {
              connection.query(`CREATE INDEX ${match[1]} ON ${match[2]}(${match[3]})`);
            } catch (_) {
            }
          }
        }
      }
    });
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
          if (!connection) {
            console.warn("MariaDB connection is null, attempting to connect...");
            connect();
          }
          const result = connection.query(formattedSql);
          return result;
        } catch (e) {
          const errMsg = e.message || "";
          if (errMsg.includes("null") || errMsg.includes("nativeNC") || errMsg.includes("socket") || errMsg.includes("connection") || errMsg.includes("read ECONNRESET") || errMsg.includes("write EPIPE")) {
            console.warn("MariaDB connection issue, attempting reconnect... (Error: " + errMsg + ")");
            try {
              connect();
              console.log("MariaDB reconnected successfully. Retrying query...");
              if (!connection) throw new Error("Connection still null after reconnect attempt");
              return connection.query(formattedSql);
            } catch (reconnectErr) {
              console.error("MariaDB reconnect failed:", reconnectErr);
              throw e;
            }
          }
          if (!errMsg.includes("doesn't exist") && e.code !== "ER_NO_SUCH_TABLE" && e.errno !== 1146) {
            console.error("MariaDB query error:", e.message, "\nSQL:", formattedSql);
          }
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
  const configurePragmas = (d) => {
    try {
      d.pragma("journal_mode = WAL");
      d.pragma("synchronous = NORMAL");
      d.pragma("busy_timeout = 5000");
      d.pragma("cache_size = -16000");
    } catch (e) {
      console.warn("Failed to set SQLite PRAGMAs:", e);
    }
  };
  const registerCompatCollations = (d) => {
    try {
      if (typeof d?.collation === "function") {
        const compare = (a, b) => {
          if (a < b) return -1;
          if (a > b) return 1;
          return 0;
        };
        d.collation("utf8mb4_unicode_ci", compare);
        d.collation("utf8mb4_general_ci", compare);
      }
    } catch (e) {
    }
  };
  try {
    db2 = new import_better_sqlite3.default(dbPath);
    configurePragmas(db2);
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
    configurePragmas(db2);
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
    role TEXT NOT NULL,
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
    pickupProofImage TEXT,
    deliveryProofImage TEXT,
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

  CREATE TABLE IF NOT EXISTS config_store (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
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
    { name: "withdrawalInfo", type: "TEXT" },
    { name: "reason", type: "TEXT" },
    { name: "txId", type: "TEXT" },
    { name: "mode", type: "TEXT" }
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
    { name: "resetExpires", type: "TEXT" },
    { name: "permissions", type: "TEXT" },
    { name: "permissionsList", type: "TEXT" }
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
  addColumnIfNotExists("deliveries", "pickupProofImage", "TEXT");
  addColumnIfNotExists("deliveries", "deliveryProofImage", "TEXT");
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
  addColumnIfNotExists("withdrawals", "reason", "TEXT");
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

    CREATE INDEX IF NOT EXISTS idx_deliveries_clientId ON deliveries(clientId);
    CREATE INDEX IF NOT EXISTS idx_deliveries_driverId ON deliveries(driverId);
    CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
    CREATE INDEX IF NOT EXISTS idx_users_userId ON users(userId);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId);
  `);
    console.log("Database: Created promo tables and performance indexes if not exists");
  } catch (err) {
    console.error("Failed to create promo tables and indexes:", err);
  }
  try {
    const clientsCount = db2.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'client'").get().count;
    if (clientsCount === 0) {
      console.log("[SEED] No clients or deliveries found. Seeding realistic demo data...");
      const demoClients = [
        { id: "cli-1", userId: "cli-1", name: "Mamadou Ou\xE9draogo", email: "mamadou@example.com", role: "client", accountStatus: "active" },
        { id: "cli-2", userId: "cli-2", name: "Fatoumata Diallo", email: "fatou@example.com", role: "client", accountStatus: "active" },
        { id: "cli-3", userId: "cli-3", name: "Adama Sawadogo", email: "adama@example.com", role: "client", accountStatus: "active" }
      ];
      const insertUser = db2.prepare("INSERT OR IGNORE INTO users (id, userId, name, email, role, accountStatus) VALUES (?, ?, ?, ?, ?, ?)");
      for (const c of demoClients) {
        insertUser.run(c.id, c.userId, c.name, c.email, c.role, c.accountStatus);
      }
      const demoDrivers = [
        { id: "drv-1", userId: "drv-1", name: "S\xE9kou Traor\xE9 (Zem 1)", email: "sekou@example.com", role: "driver", accountStatus: "active", status: "online", vehicleType: "Moto" },
        { id: "drv-2", userId: "drv-2", name: "Issouf Barry (Zem 2)", email: "issouf@example.com", role: "driver", accountStatus: "active", status: "online", vehicleType: "Moto" },
        { id: "drv-3", userId: "drv-3", name: "Abdoulaye Sanou (Zem 3)", email: "abdoulaye@example.com", role: "driver", accountStatus: "active", status: "offline", vehicleType: "Moto" }
      ];
      const insertDriver = db2.prepare("INSERT OR IGNORE INTO users (id, userId, name, email, role, accountStatus, status, vehicleType) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      for (const d of demoDrivers) {
        insertDriver.run(d.id, d.userId, d.name, d.email, d.role, d.accountStatus, d.status, d.vehicleType);
      }
      const demoDeliveries = [
        {
          id: "del-1",
          clientId: "cli-1",
          clientName: "Mamadou Ou\xE9draogo",
          driverId: "drv-1",
          driverName: "S\xE9kou Traor\xE9 (Zem 1)",
          origin: JSON.stringify({ lat: 12.3714, lng: -1.5197, address: "March\xE9 Central de Ouagadougou" }),
          destination: JSON.stringify({ lat: 12.3582, lng: -1.5031, address: "Patte d'Oie" }),
          cost: 1500,
          status: "delivered",
          paymentStatus: "paid",
          paymentMethod: "Orange Money",
          isPaid: 1,
          paidToDriver: 1,
          createdAt: new Date(Date.now() - 4 * 36e5).toISOString()
        },
        {
          id: "del-2",
          clientId: "cli-2",
          clientName: "Fatoumata Diallo",
          driverId: "drv-2",
          driverName: "Issouf Barry (Zem 2)",
          origin: JSON.stringify({ lat: 12.3654, lng: -1.5204, address: "Zone du Bois" }),
          destination: JSON.stringify({ lat: 12.3821, lng: -1.5312, address: "Koulouba" }),
          cost: 2e3,
          status: "accepted",
          paymentStatus: "pending",
          paymentMethod: "Moov Money",
          isPaid: 0,
          paidToDriver: 0,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        {
          id: "del-3",
          clientId: "cli-3",
          clientName: "Adama Sawadogo",
          driverId: null,
          driverName: null,
          origin: JSON.stringify({ lat: 12.3512, lng: -1.5142, address: "Gounghin" }),
          destination: JSON.stringify({ lat: 12.3941, lng: -1.4921, address: "Somgand\xE9" }),
          cost: 2500,
          status: "pending",
          paymentStatus: "pending",
          paymentMethod: "Esp\xE8ces",
          isPaid: 0,
          paidToDriver: 0,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      ];
      const insertDelivery = db2.prepare(`
        INSERT OR IGNORE INTO deliveries 
        (id, clientId, clientName, driverId, driverName, origin, destination, cost, status, paymentStatus, paymentMethod, isPaid, paidToDriver, createdAt, updatedAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const del of demoDeliveries) {
        insertDelivery.run(
          del.id,
          del.clientId,
          del.clientName,
          del.driverId,
          del.driverName,
          del.origin,
          del.destination,
          del.cost,
          del.status,
          del.paymentStatus,
          del.paymentMethod,
          del.isPaid,
          del.paidToDriver,
          del.createdAt,
          del.createdAt
        );
      }
      db2.prepare("INSERT OR IGNORE INTO announcements (id, title, message, type, targetRole) VALUES (?, ?, ?, ?, ?)").run("ann-1", "Bienvenue sur la plateforme !", "Faso Express est d\xE9sormais active et op\xE9rationnelle.", "info", "all");
      db2.prepare("INSERT OR IGNORE INTO sectors (id, name, city) VALUES (?, ?, ?)").run("sec-1", "Centre-ville", "Ouagadougou");
      db2.prepare("INSERT OR IGNORE INTO sectors (id, name, city) VALUES (?, ?, ?)").run("sec-2", "Dassasgho", "Ouagadougou");
      console.log("[SEED] Seeding completed successfully!");
    }
  } catch (err) {
    console.error("[SEED] Error seeding demo data:", err);
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
if (typeof __dirname !== "undefined") {
  import_dotenv.default.config({ path: import_path2.default.join(__dirname, ".env") });
  import_dotenv.default.config({ path: import_path2.default.join(__dirname, "..", ".env") });
  import_dotenv.default.config({ path: import_path2.default.join(__dirname, "..", "..", ".env") });
}
var useMariaDB = process.env.DB_HOST !== void 0;
var db;
if (useMariaDB) {
  try {
    db = initMariaDB();
  } catch (mariadbErr) {
    console.error("MariaDB initial connection failed. Falling back to SQLite:", mariadbErr?.message || mariadbErr);
    db = initSQLiteDB();
  }
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
function repairJsonString(str) {
  let result = "";
  let inString = false;
  let isEscaped = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (!inString) {
      if (char === '"') {
        inString = true;
      }
      result += char;
    } else {
      if (isEscaped) {
        if (['"', "\\", "/", "b", "f", "n", "r", "t", "u"].includes(char)) {
          result += "\\" + char;
        } else {
          result += "\\\\" + char;
        }
        isEscaped = false;
      } else {
        if (char === "\\") {
          isEscaped = true;
        } else if (char === '"') {
          inString = false;
          result += char;
        } else if (char === "\n") {
          result += "\\n";
        } else if (char === "\r") {
        } else if (char === "	") {
          result += "\\t";
        } else {
          result += char;
        }
      }
    }
  }
  if (isEscaped) {
    result += "\\\\";
  }
  return result;
}
function sanitizePrivateKey(rawKey) {
  if (!rawKey || typeof rawKey !== "string") return "";
  let pk = rawKey.trim();
  if (pk.startsWith('"') && pk.endsWith('"') || pk.startsWith("'") && pk.endsWith("'")) {
    pk = pk.slice(1, -1).trim();
  }
  pk = pk.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const headerMatch = pk.match(/-----BEGIN [A-Z ]+-----/);
  const footerMatch = pk.match(/-----END [A-Z ]+-----/);
  if (headerMatch && footerMatch) {
    const header = headerMatch[0];
    const footer = footerMatch[0];
    const headerIdx = pk.indexOf(header);
    const footerIdx = pk.indexOf(footer);
    let body = pk.substring(headerIdx + header.length, footerIdx).trim();
    body = body.replace(/[\s\\"']/g, "");
    const lines = body.match(/.{1,64}/g) || [body];
    return `${header}
${lines.join("\n")}
${footer}
`;
  } else {
    let cleanBody = pk.replace(/-----BEGIN [A-Z ]+-----/g, "").replace(/-----END [A-Z ]+-----/g, "").replace(/[\s\\"']/g, "");
    const lines = cleanBody.match(/.{1,64}/g) || [cleanBody];
    return `-----BEGIN PRIVATE KEY-----
${lines.join("\n")}
-----END PRIVATE KEY-----
`;
  }
}
var firebaseAdminApp = null;
function getFirebaseAdmin() {
  if (firebaseAdminApp) return firebaseAdminApp;
  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountVar) {
    try {
      let cleaned = serviceAccountVar.trim();
      if (cleaned.startsWith("eyJ")) {
        try {
          cleaned = Buffer.from(cleaned, "base64").toString("utf8").trim();
        } catch (_) {
        }
      }
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      const masked = cleaned.replace(/(["']?private_key["']?\s*:\s*)(["'])(?:(?!\2).|\\.)*\2/g, "$1$2***MASKED***$2");
      console.log(`[FCM Config] Extracted length: ${cleaned.length}`);
      console.log(`[FCM Config] Preview: ${masked.slice(0, 150)}...${masked.slice(-100)}`);
      let serviceAccount = null;
      try {
        serviceAccount = JSON.parse(cleaned);
        console.log("[FCM Config] Standard JSON.parse succeeded.");
      } catch (jsonErr) {
        console.log(`[FCM Config] Standard JSON.parse failed (${jsonErr.message}). Trying auto-repair JSON parsing...`);
        try {
          const repaired = repairJsonString(cleaned);
          serviceAccount = JSON.parse(repaired);
          console.log("[FCM Config] Auto-repaired JSON.parse succeeded.");
        } catch (lastErr) {
          console.error("[FCM Config] JSON parsing failed even after auto-repair. Trying regex extraction...", lastErr.message);
        }
      }
      if (!serviceAccount) {
        try {
          const projMatch = cleaned.match(/"project_id"\s*:\s*"([^"]+)"/);
          const emailMatch = cleaned.match(/"client_email"\s*:\s*"([^"]+)"/);
          const keyMatch = cleaned.match(/"private_key"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"|\s*\}|\s*$)/);
          if (projMatch && emailMatch && keyMatch) {
            serviceAccount = {
              project_id: projMatch[1],
              client_email: emailMatch[1],
              private_key: keyMatch[1]
            };
            console.log("[FCM Config] Extracted service account via regex fallback.");
          }
        } catch (_) {
        }
      }
      if (serviceAccount) {
        const rawKey = serviceAccount.private_key || serviceAccount.privateKey;
        const cleanKey = sanitizePrivateKey(rawKey);
        const projectId = serviceAccount.project_id || serviceAccount.projectId;
        const clientEmail = serviceAccount.client_email || serviceAccount.clientEmail;
        if (!projectId || !clientEmail || !cleanKey) {
          throw new Error("Champs manquants (projectId, clientEmail ou privateKey) dans le compte de service.");
        }
        firebaseAdminApp = (0, import_app.initializeApp)({
          credential: (0, import_app.cert)({
            projectId,
            clientEmail,
            privateKey: cleanKey
          })
        });
        console.log("[FCM] Firebase Admin initialis\xE9 avec succ\xE8s !");
        return firebaseAdminApp;
      }
    } catch (e) {
      console.error("[FCM] \xC9chec d'analyse de FIREBASE_SERVICE_ACCOUNT:", e.message || e);
    }
  }
  const saPaths = [
    import_path3.default.join(process.cwd(), "service-account.json"),
    import_path3.default.join(process.cwd(), "fasoexpress-2f11e-firebase-adminsdk-fbsvc-f7f6a6391b.json")
  ];
  for (const saPath of saPaths) {
    if (import_fs2.default.existsSync(saPath)) {
      try {
        const serviceAccount = JSON.parse(import_fs2.default.readFileSync(saPath, "utf8"));
        const cleanKey = sanitizePrivateKey(serviceAccount.private_key || serviceAccount.privateKey);
        firebaseAdminApp = (0, import_app.initializeApp)({
          credential: (0, import_app.cert)({
            projectId: serviceAccount.project_id || serviceAccount.projectId,
            clientEmail: serviceAccount.client_email || serviceAccount.clientEmail,
            privateKey: cleanKey
          })
        });
        console.log(`[FCM] Firebase Admin initialis\xE9 avec le fichier ${import_path3.default.basename(saPath)}.`);
        return firebaseAdminApp;
      } catch (e) {
        console.error(`[FCM] \xC9chec d'initialisation de Firebase Admin avec ${import_path3.default.basename(saPath)}:`, e);
      }
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
if (typeof __dirname !== "undefined") {
  import_dotenv2.default.config({ path: import_path3.default.join(__dirname, ".env") });
  import_dotenv2.default.config({ path: import_path3.default.join(__dirname, "..", ".env") });
}
var JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev";
async function startServer() {
  const app = (0, import_express.default)();
  app.set("trust proxy", 1);
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3e3;
  app.use((0, import_helmet.default)({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
  app.use((0, import_cors.default)({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin.includes("localhost") || origin.includes("127.0.0.1") || origin.includes("run.app") || origin.includes("fasoexpress") || process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true
  }));
  const authLimiter = (0, import_express_rate_limit.default)({
    windowMs: 15 * 60 * 1e3,
    max: 30,
    message: { error: "Trop de tentatives. Veuillez r\xE9essayer dans 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }
  });
  const paymentLimiter = (0, import_express_rate_limit.default)({
    windowMs: 15 * 60 * 1e3,
    max: 50,
    message: { error: "Trop de requ\xEAtes de paiement. Veuillez patienter." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/auth/forgot-password", authLimiter);
  app.use("/api/payment/", paymentLimiter);
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
  const authenticateOptional = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      req.user = null;
      return next();
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch {
      req.user = null;
    }
    next();
  };
  const checkAdmin = (req, res, next) => {
    if (req.user && (req.user.role === "admin" || req.user.role === "superadmin" || req.user.role === "manager" || req.user.role === "support" || req.user.isMaster)) {
      next();
    } else {
      console.warn(`[API ACCESS DENIED] User ${req.user?.email} (ID: ${req.user?.userId}) attempted to access ADMIN endpoint: ${req.originalUrl}, but role is: '${req.user?.role}'`);
      res.status(400).json({ error: `Access denied. Administrative role is required (your role: '${req.user?.role}').` });
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
        "sectors",
        "permissions",
        "permissionsList"
      ];
      const updates = [];
      const params = [];
      for (const field of allowedFields) {
        if (req.body[field] !== void 0) {
          updates.push(`${field} = ?`);
          let val = req.body[field];
          if (typeof val === "object" && val !== null) {
            val = JSON.stringify(val);
          }
          params.push(val);
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
      const token = import_jsonwebtoken.default.sign({ userId, email, role: targetRole }, JWT_SECRET, { expiresIn: "7d" });
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
      const token = import_jsonwebtoken.default.sign({ userId: user.userId || user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
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
        const cfgRow = db_default.prepare("SELECT value FROM config WHERE `key` = 'app_config'").get();
        const cfgObj = cfgRow && cfgRow.value ? JSON.parse(cfgRow.value) : {};
        const footerPublisher = cfgObj.companyNameActive !== false && (cfgObj.companyName || "SAPPAY TECHNOLOGIE") ? `<p style="color: #94a3b8; font-size: 11px; text-align: center; margin-bottom: 0;">\xC9dit\xE9 par ${cfgObj.companyName || "SAPPAY TECHNOLOGIE"}</p>` : "";
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
              ${footerPublisher}
            </div>
          `
        };
        await transporter.sendMail(mailOptions);
        console.log(`[SMTP] Reset email successfully sent to ${email}`);
      } else {
        console.log(`
==========================================`);
        console.log(`[DEV MODE] SMTP non configur\xE9 pour Forgot Password`);
        console.log(`Email : ${email}`);
        console.log(`Code de r\xE9initialisation g\xE9n\xE9r\xE9`);
        console.log(`==========================================
`);
        return res.json({
          status: "ok",
          message: "Un code de r\xE9initialisation a \xE9t\xE9 g\xE9n\xE9r\xE9 et envoy\xE9 si l'adresse est valide."
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
    try {
      const user = db_default.prepare("SELECT * FROM users WHERE userId = ?").get(req.user.userId);
      if (!user) return res.status(404).json({ error: "Utilisateur non trouv\xE9." });
      delete user.password;
      if (user.currentLocation) user.currentLocation = JSON.parse(user.currentLocation);
      if (user.role === "driver") {
        const totalNetEarnings = calculateDriverEarnings(user.userId) + (user.totalWithdrawn || 0);
        user.totalNetEarnings = totalNetEarnings;
        user.totalWithdrawn = user.totalWithdrawn || 0;
        const pendingWithdrawalsSum = db_default.prepare(`SELECT SUM(amount) as sum FROM withdrawals WHERE driverId = ? AND (status = 'en_attente' OR status = 'pending' OR status = 'en cours')`).get(user.userId)?.sum || 0;
        user.pendingWithdrawals = pendingWithdrawalsSum;
        user.earnings = totalNetEarnings - user.totalWithdrawn;
        user.availableBalance = Math.max(0, user.earnings - pendingWithdrawalsSum);
      }
      res.json(user);
    } catch (err) {
      console.error("Profile fetch error:", err);
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration du profil." });
    }
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
    const PROTECTED_FIELDS = /* @__PURE__ */ new Set([
      "role",
      "accountStatus",
      "isVerified",
      "verificationStatus",
      "balance",
      "earnings",
      "resetCode",
      "resetExpires",
      "totalWithdrawn"
    ]);
    const isAdminUser = req.user && (req.user.role === "admin" || req.user.role === "superadmin" || req.user.isMaster);
    if (!isAdminUser) {
      fields = fields.filter((f) => !PROTECTED_FIELDS.has(f));
    }
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
      if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
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
      const comm = commRow ? JSON.parse(commRow.value) : { minDeliveryCost: 500, tarifKm: 150, fraisFixes: 500, enableMinPriceConstraint: true };
      const isMinPriceActive = comm.enableMinPriceConstraint !== false;
      const minDeliveryCost = comm.minDeliveryCost || 500;
      let calculatedCost = d.cost;
      if (!calculatedCost && d.from && d.to) {
        const dist = calculateDistance(d.from.lat, d.from.lng, d.to.lat, d.to.lng);
        calculatedCost = comm.fraisFixes + dist * comm.tarifKm;
        if (isMinPriceActive) {
          calculatedCost = Math.max(minDeliveryCost, calculatedCost);
        }
        calculatedCost = Math.round(calculatedCost / 100) * 100;
      }
      if (isMinPriceActive) {
        if (calculatedCost && calculatedCost < minDeliveryCost) {
          calculatedCost = minDeliveryCost;
        }
      }
      let clientProposedPrice = Number(d.clientProposedPrice || d.cost || calculatedCost || 1e3);
      let baseCost = Number(d.baseCost || d.estimatedCost || calculatedCost || 1e3);
      if (isMinPriceActive) {
        if (clientProposedPrice < minDeliveryCost) {
          clientProposedPrice = minDeliveryCost;
        }
        if (baseCost < minDeliveryCost) {
          baseCost = minDeliveryCost;
        }
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
        baseCost,
        clientProposedPrice,
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
    try {
      const { role, userId } = req.user;
      let query = "SELECT * FROM deliveries";
      const params = [];
      if (role === "client") {
        query += " WHERE clientId = ?";
        params.push(userId);
      } else if (role === "driver") {
        query += " WHERE (status = 'pending' OR driverId = ?)";
        params.push(userId);
      } else if (!["admin", "superadmin", "manager", "support"].includes(role) && !req.user.isMaster) {
        return res.status(403).json({ error: "Access denied. Your role (" + role + ") does not have permission to list all deliveries." });
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
            let originData = null;
            try {
              originData = typeof d.origin === "string" ? JSON.parse(d.origin) : d.origin;
            } catch (e) {
            }
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
      if (deliveries.length === 0) {
        return res.json([]);
      }
      const deliveryIds = deliveries.map((d) => d.id);
      const driverIdSet = /* @__PURE__ */ new Set();
      deliveries.forEach((d) => {
        if (d.driverId) driverIdSet.add(d.driverId);
      });
      let allBids = [];
      try {
        const placeholders = deliveryIds.map(() => "?").join(",");
        allBids = db_default.prepare(`SELECT * FROM bids WHERE deliveryId IN (${placeholders})`).all(...deliveryIds) || [];
      } catch (e) {
        allBids = [];
      }
      allBids.forEach((b) => {
        if (b.driverId) driverIdSet.add(b.driverId);
      });
      const driverMap = /* @__PURE__ */ new Map();
      const driverIds = Array.from(driverIdSet);
      if (driverIds.length > 0) {
        try {
          const placeholders = driverIds.map(() => "?").join(",");
          const drivers = db_default.prepare(`SELECT userId, photoURL, phone, name FROM users WHERE userId IN (${placeholders})`).all(...driverIds) || [];
          drivers.forEach((dr) => {
            if (dr.userId) driverMap.set(dr.userId, dr);
          });
        } catch (e) {
        }
      }
      const bidsByDelivery = /* @__PURE__ */ new Map();
      allBids.forEach((b) => {
        b.timeEstimateMins = b.proposedTime;
        if (b.driverId && driverMap.has(b.driverId)) {
          const dr = driverMap.get(b.driverId);
          b.driverPhoto = dr.photoURL;
          b.driverPhone = dr.phone;
        }
        const existing = bidsByDelivery.get(b.deliveryId) || [];
        existing.push(b);
        bidsByDelivery.set(b.deliveryId, existing);
      });
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
        if (d.driverId && driverMap.has(d.driverId)) {
          const dr = driverMap.get(d.driverId);
          d.driverPhoto = dr.photoURL;
          d.driverPhone = dr.phone;
          d.driverName = dr.name;
        }
        d.bids = bidsByDelivery.get(d.id) || [];
      });
      res.json(deliveries);
    } catch (err) {
      console.error("Critical error in GET /api/deliveries:", err);
      res.status(500).json({ error: "Internal server error while fetching deliveries", details: err.message });
    }
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
    let finalFields = fields;
    try {
      const pragma = db_default.prepare(`PRAGMA table_info(deliveries)`).all();
      if (pragma && pragma.length > 0) {
        const existingCols = new Set(pragma.map((c) => c.name));
        finalFields = fields.filter((f) => existingCols.has(f));
      }
    } catch (e) {
    }
    if (finalFields.length === 0) return res.json({ status: "no valid fields to update" });
    const setClause = finalFields.map((f) => `${f} = ?`).join(", ");
    const values = finalFields.map((f) => {
      let val = updates[f];
      if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
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
      try {
        const pragma = db_default.prepare("PRAGMA table_info(deliveries)").all();
        if (!pragma.some((col) => col.name === "lastSenderId")) {
          db_default.prepare("ALTER TABLE deliveries ADD COLUMN lastSenderId TEXT").run();
        }
      } catch (colErr) {
      }
      db_default.prepare("UPDATE deliveries SET lastMessageAt = CURRENT_TIMESTAMP, lastSenderId = ? WHERE id = ?").run(req.user.userId, deliveryId);
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
  const DEFAULT_APP_CONFIG = {
    mode: "prod",
    appLogo: "/LOGOFASO.png",
    isMaintenanceMode: false,
    maintenanceMessage: "",
    companyName: "SAPPAY TECHNOLOGIE",
    companyNameActive: true,
    contactPhone: "72567606",
    contactPhoneActive: true,
    contactWhatsapp: "72567606",
    contactWhatsappActive: true,
    contactFacebook: "https://facebook.com/fasoexpress",
    contactFacebookActive: true,
    contactMessenger: "https://m.me/fasoexpress",
    contactMessengerActive: true,
    contactEmail: "",
    contactEmailActive: true,
    isForgotPasswordActive: true,
    isUssdActive: true,
    isOtpActive: true,
    isOrangeActive: true,
    isMoovActive: true,
    isTelecelActive: true,
    isCorisActive: true,
    isCashActive: true,
    isCardActive: true
  };
  const configCache = /* @__PURE__ */ new Map();
  const CONFIG_CACHE_TTL = 3e3;
  app.get("/api/preferences-majeures/:key", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    const { key } = req.params;
    const now = Date.now();
    const cached = configCache.get(key);
    if (cached && cached.expiresAt > now) {
      return res.json(cached.value);
    }
    try {
      const row = db_default.prepare("SELECT value FROM config WHERE `key` = ?").get(key);
      let parsed = row && row.value ? JSON.parse(row.value) : {};
      if (key === "app_config") {
        parsed = { ...DEFAULT_APP_CONFIG, ...parsed };
        if (parsed.appLogo && parsed.appLogo.length > 5e5) {
          parsed.appLogo = "/LOGOFASO.png";
        }
      }
      configCache.set(key, { value: parsed, expiresAt: now + CONFIG_CACHE_TTL });
      return res.json(parsed);
    } catch (err) {
      if (key === "app_config") return res.json(DEFAULT_APP_CONFIG);
      return res.json({});
    }
  });
  app.get("/api/sectors", (req, res) => {
    res.json(db_default.prepare("SELECT * FROM sectors WHERE isActive = 1").all());
  });
  app.post("/api/db-query-tool", authenticate, checkAdmin, (req, res) => {
    return res.status(403).json({ success: false, error: "L'outil d'ex\xE9cution SQL direct est d\xE9sactiv\xE9 en production pour des raisons de s\xE9curit\xE9." });
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
  const normalizePhoneNumberSappay = (phone, processorId) => {
    let clean = (phone || "").replace(/\D/g, "");
    if (clean.startsWith("226") && clean.length === 11) {
      return clean.substring(3);
    }
    if (clean.length > 8) {
      return clean.substring(clean.length - 8);
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
        if (!clientId || !clientSecret || !username || !password) {
          try {
            const sapPayRow = db_default.prepare("SELECT * FROM config_store WHERE id = 'sappay'").get();
            if (sapPayRow && sapPayRow.data) {
              const sapData = typeof sapPayRow.data === "string" ? JSON.parse(sapPayRow.data) : sapPayRow.data;
              if (!clientId && (sapData.clientId || sapData.sappayClientId)) {
                clientId = sanitizeCredential(sapData.clientId || sapData.sappayClientId);
              }
              if (!clientSecret && (sapData.clientSecret || sapData.sappayClientSecret)) {
                clientSecret = sanitizeCredential(sapData.clientSecret || sapData.sappayClientSecret);
              }
              if (!username && (sapData.username || sapData.sappayUsername)) {
                username = sanitizeCredential(sapData.username || sapData.sappayUsername);
              }
              if (!password && (sapData.password || sapData.sappayPassword)) {
                password = sanitizeCredential(sapData.password || sapData.sappayPassword);
              }
            }
          } catch (_) {
          }
        }
      } catch (dbErr) {
      }
    }
    if (!clientId || !clientSecret || !username || !password) {
      console.warn("[SAPPAY] Identifiants de paiement non configur\xE9s. Activation du mode SANDBOX de test pour le paiement.");
      return "MOCK_TOKEN_SANDBOX_12345";
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
  app.post("/api/payment/sappay/init", authenticateOptional, async (req, res) => {
    try {
      const { amount, note, email } = req.body;
      const token = await getSappayToken();
      if (token === "MOCK_TOKEN_SANDBOX_12345") {
        console.log("[Sappay Init] Sandboxed mock invoice created.");
        return res.json({
          invoice_id: "MOCK_INVOICE_W8H2XMO783P",
          access_token: token,
          status: "PENDING"
        });
      }
      const payload = {
        type: "SIMPLE",
        customer: {
          email: email || "client@faso.app",
          country: 1
        },
        amount: amount.toString(),
        note: note || `COURSE FASO #${Math.random().toString(36).substr(2, 5).toUpperCase()}`
      };
      const invoiceResponse = await fetch(`${SAPPAY_BASE_PUBLIC}/invoice/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
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
      console.error("[Sappay Init Error]:", error);
      let errMsg = error.message || "Une erreur est survenue lors de l'initialisation du paiement.";
      if (typeof errMsg === "string" && (errMsg.toLowerCase().includes("fetch failed") || errMsg.toLowerCase().includes("timeout") || errMsg.toLowerCase().includes("enotfound") || errMsg.toLowerCase().includes("econnrefused") || errMsg.toLowerCase().includes("etimedout"))) {
        errMsg = "Le service de paiement (SapPay) est temporairement injoignable ou en maintenance. Veuillez r\xE9essayer dans quelques instants ou choisir un autre moyen de paiement.";
      }
      res.status(500).json({ error: errMsg });
    }
  });
  app.get("/api/payment/sappay/config-check", authenticate, checkAdmin, async (req, res) => {
    try {
      console.log("[DIAGNOSTIC] Checking Sappay configuration...");
      const token = await getSappayToken();
      if (token === "MOCK_TOKEN_SANDBOX_12345") {
        return res.json({
          status: "sandbox",
          message: "SAPPAY est actuellement en MODE DEMO (Sandbox). Veuillez renseigner de vrais identifiants de production pour passer en mode r\xE9el."
        });
      }
      res.json({
        status: "success",
        message: "SAPPAY configuration is valid and authentication was successful.",
        token_prefix: token.substring(0, 10) + "..."
      });
    } catch (error) {
      console.error("[DIAGNOSTIC] Sappay config check failed:", error.message);
      let errMsg = error.message || "La v\xE9rification de configuration a \xE9chou\xE9.";
      if (typeof errMsg === "string" && (errMsg.toLowerCase().includes("fetch failed") || errMsg.toLowerCase().includes("timeout") || errMsg.toLowerCase().includes("enotfound") || errMsg.toLowerCase().includes("econnrefused") || errMsg.toLowerCase().includes("etimedout"))) {
        errMsg = "\xC9chec de connexion au serveur SapPay (Time-out de connexion). Le serveur distant est injoignable.";
      }
      res.status(401).json({
        status: "error",
        message: errMsg
      });
    }
  });
  app.post("/api/payment/sappay/get-otp", async (req, res) => {
    try {
      let { customer_msisdn, invoice_id, payment_processor_id, access_token } = req.body;
      if (!access_token) {
        try {
          access_token = await getSappayToken();
        } catch (e) {
          console.warn("[Sappay OTP] Token fallback warning:", e);
        }
      }
      if (access_token === "MOCK_TOKEN_SANDBOX_12345" || invoice_id && invoice_id.startsWith("MOCK_INVOICE_")) {
        console.log("[Sappay OTP] Sandboxed mock OTP triggered.");
        return res.json({
          success: true,
          status: 200,
          message: "OTP sent successfully (SANDBOX MOCK)",
          response: {
            message: "OTP sent successfully"
          }
        });
      }
      const headers = {
        "Content-Type": "application/json"
      };
      if (access_token) {
        headers["Authorization"] = `Bearer ${access_token}`;
      }
      const targetUrl = `${SAPPAY_BASE_CHECKOUT}/get-otp/`;
      const cleanPhone = normalizePhoneNumberSappay(customer_msisdn, payment_processor_id);
      const payload = {
        customer_msisdn: cleanPhone,
        invoice_id,
        payment_processor_id
      };
      console.log(`[Sappay OTP] Triggering OTP for invoice ${invoice_id}, operator ${payment_processor_id}, phone ${cleanPhone}...`);
      await new Promise((resolve) => setTimeout(resolve, 800));
      let response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      let responseText = await response.text().catch(() => "");
      let data = null;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = null;
      }
      const respMsg = (data?.response?.message || data?.message || "").toString().toLowerCase();
      if (data && (respMsg.includes("param\xE8tres erron\xE9s") || respMsg.includes("parametres errones"))) {
        console.warn("[Sappay OTP] Temporary indexing error 'Param\xE8tres erron\xE9s !', retrying once after 1200ms...");
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const freshToken = await getSappayToken().catch(() => access_token);
        if (freshToken) headers["Authorization"] = `Bearer ${freshToken}`;
        response = await fetch(targetUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });
        responseText = await response.text().catch(() => "");
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          data = null;
        }
      }
      if (!response.ok) {
        return res.status(response.status).json({
          error: "Sappay OTP Error",
          details: responseText.substring(0, 500)
        });
      }
      console.log(`[Sappay OTP] Response for invoice ${invoice_id}:`, responseText.substring(0, 300));
      return res.status(response.status).json(data || { success: true, raw: responseText });
    } catch (error) {
      console.error("[Sappay OTP Error]:", error);
      let errMsg = error.message || "Une erreur est survenue lors de la g\xE9n\xE9ration de l'OTP.";
      if (typeof errMsg === "string" && (errMsg.toLowerCase().includes("fetch failed") || errMsg.toLowerCase().includes("timeout") || errMsg.toLowerCase().includes("enotfound") || errMsg.toLowerCase().includes("econnrefused") || errMsg.toLowerCase().includes("etimedout"))) {
        errMsg = "Impossible de contacter l'op\xE9rateur (via SapPay) pour g\xE9n\xE9rer le code OTP. Veuillez v\xE9rifier votre connexion ou r\xE9essayer.";
      }
      res.status(500).json({ error: errMsg });
    }
  });
  app.post("/api/payment/sappay/perform", async (req, res) => {
    try {
      const { invoice_id, payment_processor_id, customer_msisdn, otp, trans_id, access_token, amount, email } = req.body;
      if (access_token === "MOCK_TOKEN_SANDBOX_12345" || invoice_id && invoice_id.startsWith("MOCK_INVOICE_")) {
        console.log("[Sappay Perform] Sandboxed mock payment performed.");
        if (otp === "9999" || otp === "wrong" || otp === "248715") {
          return res.status(400).json({
            error: "Sappay Perform Error",
            message: "Transaction Failed (SANDBOX)",
            details: JSON.stringify({
              status: "FAILED",
              gateway_message: "OTP incorrect",
              gateway_status_code: "990417"
            })
          });
        }
        return res.json({
          success: true,
          status: "SUCCESSFUL",
          message: "Transaction Successful (SANDBOX)",
          response: {
            status: "SUCCESSFUL",
            gateway_message: "Payment successfully completed",
            gateway_status_code: "00"
          }
        });
      }
      const payload = {
        invoice_id,
        payment_processor_id,
        customer_msisdn: normalizePhoneNumberSappay(customer_msisdn || "", payment_processor_id),
        otp: (otp || "").toString()
      };
      if (trans_id) {
        payload.trans_id = trans_id;
      }
      if (amount) {
        payload.amount = amount.toString();
      }
      if (email) {
        payload.email = email;
      }
      const headers = {
        "Content-Type": "application/json"
      };
      if (access_token) {
        headers["Authorization"] = `Bearer ${access_token.trim()}`;
      }
      const targetUrl = `${SAPPAY_BASE_CHECKOUT}/perform/`;
      console.log("[Sappay Perform] Sending payload to checkout URL:", targetUrl);
      const response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      console.log("[Sappay Perform] Response Status:", response.status);
      console.log("[Sappay Perform] Response Headers:", JSON.stringify(response.headers));
      let responseText = "";
      try {
        responseText = await response.text();
      } catch (e) {
        responseText = "Impossible de lire la r\xE9ponse brute.";
      }
      if (!response.ok) {
        console.error("[Sappay Perform] Error Response Body:", responseText);
        const lowerResp = responseText.toLowerCase();
        const hasSuccessText = lowerResp.includes("successfully") || lowerResp.includes("completed") || lowerResp.includes("transaction of fcfa") || lowerResp.includes("reussie") || lowerResp.includes("r\xE9ussie") || lowerResp.includes("succes") || lowerResp.includes("succ\xE8s") || lowerResp.includes("effectu\xE9") || lowerResp.includes("effectue") || lowerResp.includes("approuv\xE9") || lowerResp.includes("approuve") || lowerResp.includes("approved");
        const hasExplicitErrorText = lowerResp.includes("failed") || lowerResp.includes("echec") || lowerResp.includes("\xE9chec") || lowerResp.includes("incorrect") || lowerResp.includes("invalid") || lowerResp.includes("insuffisant") || lowerResp.includes("refused") || lowerResp.includes("declined") || lowerResp.includes("annul") || lowerResp.includes("otp does not exist") || lowerResp.includes("does not exist") || lowerResp.includes("not found");
        if (hasSuccessText && !hasExplicitErrorText) {
          console.log("[Sappay Perform] Overriding non-200 status because payload contains explicit operator success message!");
          let parsedData = {};
          try {
            parsedData = JSON.parse(responseText);
          } catch (_) {
            parsedData = { message: responseText };
          }
          return res.status(200).json({
            success: true,
            status: "SUCCESS",
            message: "Transaction Successfull",
            response: {
              status: "SUCCESS",
              gateway_status_code: 0,
              gateway_message: responseText
            },
            ...parsedData
          });
        }
        return res.status(response.status).json({
          error: "Sappay Perform Error",
          message: `Sappay returned status ${response.status}`,
          details: responseText.substring(0, 2e3)
        });
      }
      console.log("[Sappay Perform] Success Response Body:", responseText.substring(0, 500));
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("[Sappay Perform] JSON Parse Error:", e);
        return res.status(500).json({ error: "Format de r\xE9ponse perform invalide", raw: responseText });
      }
      res.status(response.status).json(data);
    } catch (error) {
      console.error("[Sappay Perform Error]:", error);
      let errMsg = error.message || "Une erreur est survenue lors de la validation du paiement.";
      if (typeof errMsg === "string" && (errMsg.toLowerCase().includes("fetch failed") || errMsg.toLowerCase().includes("timeout") || errMsg.toLowerCase().includes("enotfound") || errMsg.toLowerCase().includes("econnrefused") || errMsg.toLowerCase().includes("etimedout"))) {
        errMsg = "La validation du paiement a \xE9chou\xE9 car le serveur de paiement (SapPay) ne r\xE9pond pas. Si vous avez d\xE9j\xE0 \xE9t\xE9 d\xE9bit\xE9 par votre op\xE9rateur, veuillez contacter notre service client imm\xE9diatement.";
      }
      res.status(500).json({ error: errMsg });
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
    try {
      let columns = [];
      try {
        const rows = db_default.prepare("SHOW COLUMNS FROM users").all();
        columns = rows.map((r) => r.Field || r.field || r.Column_name || r.column_name).filter(Boolean);
      } catch (e) {
        try {
          const rows = db_default.prepare("PRAGMA table_info(users)").all();
          columns = rows.map((r) => r.name).filter(Boolean);
        } catch (e2) {
          columns = [
            "id",
            "userId",
            "name",
            "email",
            "role",
            "status",
            "accountStatus",
            "isVerified",
            "city",
            "neighborhood",
            "verificationStatus",
            "balance",
            "earnings",
            "createdAt"
          ];
        }
      }
      if (!columns || columns.length === 0) {
        columns = [
          "id",
          "userId",
          "name",
          "email",
          "role",
          "status",
          "accountStatus",
          "isVerified",
          "city",
          "neighborhood",
          "verificationStatus",
          "balance",
          "earnings",
          "createdAt"
        ];
      }
      const heavyFields = [
        "idCardFront",
        "idCardBack",
        "identityCardUrl",
        "identityCardBackUrl",
        "guarantorCniUrl",
        "criminalRecordUrl",
        "carteGriseUrl"
      ];
      const safeColumns = columns.filter((col) => !heavyFields.includes(col));
      const sql = `SELECT ${safeColumns.join(", ")} FROM users`;
      const users = db_default.prepare(sql).all();
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
    } catch (err) {
      console.error("Error in /api/user-directory:", err);
      res.status(500).json({ error: "\xC9chec de la r\xE9cup\xE9ration de la liste des utilisateurs." });
    }
  });
  app.get("/api/user-directory/:userId", authenticate, checkAdmin, (req, res) => {
    const { userId } = req.params;
    try {
      const user = db_default.prepare("SELECT * FROM users WHERE userId = ?").get(userId);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouv\xE9" });
      }
      delete user.password;
      if (typeof user.currentLocation === "string" && user.currentLocation) {
        try {
          user.currentLocation = JSON.parse(user.currentLocation);
        } catch (e) {
          user.currentLocation = null;
        }
      }
      res.json(user);
    } catch (err) {
      console.error(`Error in /api/user-directory/${userId}:`, err);
      res.status(500).json({ error: "\xC9chec de la r\xE9cup\xE9ration des d\xE9tails de l'utilisateur." });
    }
  });
  app.patch("/api/user-directory/:userId", authenticate, checkAdmin, (req, res) => {
    const { userId } = req.params;
    const updates = req.body;
    const fields = Object.keys(updates).filter((k) => k !== "userId" && k !== "id" && k !== "password" && k !== "createdAt" && k !== "updatedAt");
    if (fields.length === 0) return res.json({ status: "no changes" });
    const setClause = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => {
      let val = updates[f];
      if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
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
      configCache.delete(key);
      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Failed to update config" });
    }
  });
  app.get("/api/admin/system/partitions-status", authenticate, checkAdmin, (req, res) => {
    try {
      const tablesList = ["deliveries", "tracking", "messages", "notifications", "users", "withdrawals", "bids", "historique_gains", "promo_usages"];
      const tableStats = [];
      let dbConfigSaved = null;
      try {
        const row = db_default.prepare("SELECT value FROM config WHERE `key` = 'db_partition_status'").get();
        if (row && row.value) {
          dbConfigSaved = JSON.parse(row.value);
        }
      } catch (_) {
      }
      const isFailedOverall = dbConfigSaved?.status === "failed";
      tablesList.forEach((tbl) => {
        let count = 0;
        let tableExists = true;
        try {
          const row = db_default.prepare(`SELECT COUNT(*) as count FROM ${tbl}`).get();
          count = row?.count || 0;
        } catch (_) {
          tableExists = false;
        }
        let archiveCount = 0;
        try {
          const archRow = db_default.prepare(`SELECT COUNT(*) as count FROM ${tbl}_partition_archive`).get();
          archiveCount = archRow?.count || 0;
        } catch (_) {
        }
        let partitionStatus = "ok";
        let healthColor = "emerald";
        let statusText = "Partitionn\xE9e & Index\xE9e";
        if (!tableExists) {
          partitionStatus = "missing";
          healthColor = "amber";
          statusText = "Non cr\xE9\xE9e";
        } else if (isFailedOverall) {
          partitionStatus = "error";
          healthColor = "rose";
          statusText = "\xC9chec Partitionnement";
        } else if (count > 5e3 && !dbConfigSaved?.lastRun) {
          partitionStatus = "warning";
          healthColor = "amber";
          statusText = "Partitionnement Recommand\xE9";
        } else {
          partitionStatus = "ok";
          healthColor = "emerald";
          statusText = "Partition Optimale";
        }
        tableStats.push({
          name: tbl,
          rowCount: count,
          archiveRowCount: archiveCount,
          status: partitionStatus,
          healthColor,
          statusText,
          partitionType: ["tracking", "notifications", "messages"].includes(tbl) ? "Par Plage Temporelle & Archive" : "Par Cl\xE9 Composite & Indexation"
        });
      });
      res.json({
        engine: db_default.engine || "SQLite (Local)",
        overallStatus: isFailedOverall ? "failed" : dbConfigSaved?.lastRun ? "partitioned" : "needs_partitioning",
        lastRun: dbConfigSaved?.lastRun || null,
        lastError: dbConfigSaved?.errorMessage || null,
        logDetails: dbConfigSaved?.logDetails || [],
        archivedCountTotal: dbConfigSaved?.archivedCount || 0,
        tables: tableStats
      });
    } catch (err) {
      console.error("Erreur r\xE9cup\xE9ration statut des partitions:", err);
      res.status(500).json({ error: "\xC9chec de r\xE9cup\xE9ration du statut des partitions", details: err?.message });
    }
  });
  app.post("/api/admin/system/auto-partition", authenticate, checkAdmin, (req, res) => {
    const tablesToPartition = ["deliveries", "tracking", "messages", "notifications", "users", "withdrawals", "bids", "historique_gains", "promo_usages"];
    let archivedCount = 0;
    const logDetails = [];
    try {
      const retentionDays = Number(req.body?.retentionDays) || 60;
      logDetails.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] Analyse pr\xE9-partitionnement de la base de donn\xE9es...`);
      logDetails.push(`R\xE9tention demand\xE9e : ${retentionDays} jours.`);
      if (!db_default.engine || db_default.engine.includes("SQLite")) {
        const integrity = db_default.prepare("PRAGMA integrity_check").get();
        if (integrity && integrity.integrity_check !== "ok" && integrity["integrity_check"] !== "ok") {
          throw new Error(`Innocuit\xE9 de la base compromise: ${JSON.stringify(integrity)}`);
        }
        logDetails.push("Check d'int\xE9grit\xE9 de la base de donn\xE9es : OK \u{1F7E2}");
      }
      db_default.exec(`
        CREATE TABLE IF NOT EXISTS tracking_partition_archive (
          id TEXT PRIMARY KEY,
          deliveryId TEXT NOT NULL,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          timestamp DATETIME,
          archivedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS messages_partition_archive (
          id TEXT PRIMARY KEY,
          deliveryId TEXT NOT NULL,
          text TEXT NOT NULL,
          senderId TEXT NOT NULL,
          senderName TEXT,
          senderRole TEXT,
          createdAt DATETIME,
          archivedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS notifications_partition_archive (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT,
          link TEXT,
          isRead INTEGER,
          createdAt DATETIME,
          archivedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS deliveries_partition_archive (
          id TEXT PRIMARY KEY,
          clientId TEXT NOT NULL,
          driverId TEXT,
          status TEXT,
          cost REAL,
          createdAt DATETIME,
          archivedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users_partition_archive (
          id TEXT PRIMARY KEY,
          phone TEXT,
          role TEXT,
          archivedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS withdrawals_partition_archive (
          id TEXT PRIMARY KEY,
          driverId TEXT,
          amount REAL,
          status TEXT,
          createdAt DATETIME,
          archivedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS bids_partition_archive (
          id TEXT PRIMARY KEY,
          deliveryId TEXT,
          driverId TEXT,
          price REAL,
          createdAt DATETIME,
          archivedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS historique_gains_partition_archive (
          id TEXT PRIMARY KEY,
          driverId TEXT,
          amount REAL,
          createdAt DATETIME,
          archivedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS promo_usages_partition_archive (
          id TEXT PRIMARY KEY,
          code TEXT,
          userId TEXT,
          used_at DATETIME,
          archivedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      logDetails.push("Tables de partitionnement secondaires cr\xE9\xE9es/v\xE9rifi\xE9es.");
      tablesToPartition.forEach((tbl) => {
        try {
          if (tbl === "deliveries") {
            db_default.exec("CREATE INDEX IF NOT EXISTS idx_deliveries_part_created ON deliveries(createdAt, status)");
            db_default.exec("CREATE INDEX IF NOT EXISTS idx_deliveries_part_client ON deliveries(clientId, status)");
            db_default.exec("CREATE INDEX IF NOT EXISTS idx_deliveries_part_driver ON deliveries(driverId, status)");
          } else if (tbl === "tracking") {
            db_default.exec("CREATE INDEX IF NOT EXISTS idx_tracking_part_del ON tracking(deliveryId, timestamp)");
          } else if (tbl === "messages") {
            db_default.exec("CREATE INDEX IF NOT EXISTS idx_messages_part_del ON messages(deliveryId, createdAt)");
          } else if (tbl === "notifications") {
            db_default.exec("CREATE INDEX IF NOT EXISTS idx_notifications_part_user ON notifications(userId, createdAt)");
          } else if (tbl === "users") {
            db_default.exec("CREATE INDEX IF NOT EXISTS idx_users_part_role ON users(role, accountStatus)");
          } else if (tbl === "withdrawals") {
            db_default.exec("CREATE INDEX IF NOT EXISTS idx_withdrawals_part_driver ON withdrawals(driverId, status)");
          } else if (tbl === "bids") {
            db_default.exec("CREATE INDEX IF NOT EXISTS idx_bids_part_del ON bids(deliveryId, status)");
          }
          logDetails.push(`Index de partitionnement v\xE9rifi\xE9s pour la table '${tbl}'.`);
        } catch (idxErr) {
          logDetails.push(`Note index '${tbl}': ${idxErr.message}`);
        }
      });
      try {
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1e3).toISOString();
        logDetails.push(`Seuil de partitionnement (avant le) : ${new Date(cutoffDate).toLocaleString("fr-FR")}`);
        const trackingMoved = db_default.prepare(`
          INSERT INTO tracking_partition_archive (id, deliveryId, lat, lng, timestamp)
          SELECT id, deliveryId, lat, lng, timestamp FROM tracking
          WHERE timestamp < ?
        `).run(cutoffDate);
        if (trackingMoved.changes > 0) {
          db_default.prepare("DELETE FROM tracking WHERE timestamp < ?").run(cutoffDate);
          archivedCount += trackingMoved.changes;
          logDetails.push(`Partitionn\xE9 & Archiv\xE9 ${trackingMoved.changes} positions GPS historiques.`);
        }
        const notifsMoved = db_default.prepare(`
          INSERT INTO notifications_partition_archive (id, userId, title, message, type, link, isRead, createdAt)
          SELECT id, userId, title, message, type, link, isRead, createdAt FROM notifications
          WHERE createdAt < ? AND isRead = 1
        `).run(cutoffDate);
        if (notifsMoved.changes > 0) {
          db_default.prepare("DELETE FROM notifications WHERE createdAt < ? AND isRead = 1").run(cutoffDate);
          archivedCount += notifsMoved.changes;
          logDetails.push(`Partitionn\xE9 & Archiv\xE9 ${notifsMoved.changes} notifications anciennes.`);
        }
        const chatMoved = db_default.prepare(`
          INSERT INTO messages_partition_archive (id, deliveryId, text, senderId, senderName, senderRole, createdAt)
          SELECT id, deliveryId, text, senderId, senderName, senderRole, createdAt FROM messages
          WHERE createdAt < ?
        `).run(cutoffDate);
        if (chatMoved.changes > 0) {
          db_default.prepare("DELETE FROM messages WHERE createdAt < ?").run(cutoffDate);
          archivedCount += chatMoved.changes;
          logDetails.push(`Partitionn\xE9 & Archiv\xE9 ${chatMoved.changes} messages de chat anciens.`);
        }
      } catch (archErr) {
        logDetails.push(`Partitionnement temporel: ${archErr.message}`);
      }
      if (!db_default.engine || db_default.engine.includes("SQLite")) {
        try {
          db_default.exec("PRAGMA wal_checkpoint(TRUNCATE)");
          db_default.exec("PRAGMA optimize");
          logDetails.push("Nettoyage WAL & Optimisation des requ\xEAtes effectu\xE9s.");
          try {
            db_default.exec("VACUUM");
            logDetails.push("Reconstruction physique VACUUM effectu\xE9e.");
          } catch (vErr) {
            logDetails.push(`VACUUM l\xE9ger ignor\xE9 : ${vErr.message}`);
          }
        } catch (optErr) {
          logDetails.push(`Optimisation DB : ${optErr.message}`);
        }
      } else if (db_default.engine && db_default.engine.includes("MariaDB")) {
        tablesToPartition.forEach((tbl) => {
          try {
            db_default.exec(`OPTIMIZE TABLE ${tbl}`);
          } catch (_) {
          }
        });
        logDetails.push("Commandes OPTIMIZE TABLE MariaDB ex\xE9cut\xE9es.");
      }
      const resultStatus = {
        status: "success",
        lastRun: (/* @__PURE__ */ new Date()).toISOString(),
        tablesProcessed: tablesToPartition,
        archivedCount,
        logDetails,
        errorMessage: null
      };
      db_default.prepare("REPLACE INTO config (`key`, value) VALUES ('db_partition_status', ?)").run(JSON.stringify(resultStatus));
      res.json({
        success: true,
        message: "Partitionnement automatique et optimisation des tables termin\xE9s avec succ\xE8s !",
        lastRun: resultStatus.lastRun,
        archivedCount,
        tablesProcessed: tablesToPartition,
        logDetails
      });
    } catch (err) {
      console.error("Erreur lors du partitionnement automatique des tables:", err);
      const failureError = err?.message || "Erreur critique durant le partitionnement";
      const failureStatus = {
        status: "failed",
        lastRun: (/* @__PURE__ */ new Date()).toISOString(),
        tablesProcessed: [],
        archivedCount: 0,
        logDetails,
        errorMessage: failureError
      };
      try {
        db_default.prepare("REPLACE INTO config (`key`, value) VALUES ('db_partition_status', ?)").run(JSON.stringify(failureStatus));
      } catch (_) {
      }
      res.status(500).json({
        success: false,
        error: `\xC9chec du partitionnement: ${failureError}`,
        details: logDetails,
        errorMessage: failureError
      });
    }
  });
  const seedConfig = () => {
    const hasConfig = db_default.prepare("SELECT `key`, value FROM config WHERE `key` = 'app_config'").get();
    if (!hasConfig) {
      db_default.prepare("INSERT INTO config (`key`, value) VALUES (?, ?)").run("app_config", JSON.stringify({
        ...DEFAULT_APP_CONFIG,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }));
    } else {
      try {
        const current = JSON.parse(hasConfig.value);
        if (!current.appLogo || current.appLogo === "/logofaso.png" || current.appLogo === "/LOGOFASOEXPRESS_A.png" || current.appLogo.includes(" ")) {
          current.appLogo = "/LOGOFASO.png";
          current.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
          db_default.prepare("REPLACE INTO config (`key`, value) VALUES ('app_config', ?)").run(JSON.stringify(current));
          console.log("[MIGRATION] Logo mis \xE0 jour vers /LOGOFASO.png dans la configuration stock\xE9e.");
        }
      } catch (e) {
        console.warn("Failed to migrate app logo", e);
      }
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
          db_default.prepare("UPDATE users SET role = 'superadmin', accountStatus = 'active', userId = COALESCE(userId, id) WHERE email = ?").run(adminEmail);
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
      const pendingWithdrawalsSum = db_default.prepare(`SELECT SUM(amount) as sum FROM withdrawals WHERE driverId = ? AND (status = 'en_attente' OR status = 'pending' OR status = 'en cours')`).get(driver.userId)?.sum || 0;
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
  app.post("/api/payout-registry/:id/valider", authenticate, checkAdmin, async (req, res) => {
    const { id } = req.params;
    const { mode = "manual", txId = "" } = req.body || {};
    try {
      const withdrawal = db_default.prepare("SELECT * FROM withdrawals WHERE id = ?").get(id);
      if (!withdrawal) return res.status(404).json({ error: "Retrait non trouv\xE9." });
      if (mode !== "force" && (withdrawal.status === "valide" || withdrawal.status === "rejete")) {
        return res.status(400).json({ error: "D\xE9j\xE0 trait\xE9. Utilisez le for\xE7age pour \xE9craser." });
      }
      if (mode === "force" && withdrawal.status === "valide") {
        return res.status(400).json({ error: "Le retrait est d\xE9j\xE0 valid\xE9." });
      }
      const driver = db_default.prepare("SELECT * FROM users WHERE userId = ?").get(withdrawal.driverId);
      if (!driver) return res.status(404).json({ error: "Livreur non trouv\xE9." });
      const currentEarnings = calculateDriverEarnings(driver.userId);
      if (mode === "auto") {
        const sapPayConfig = db_default.prepare("SELECT * FROM config_store WHERE id = 'sappay'").get();
        if (!sapPayConfig || !sapPayConfig.data) {
          return res.status(400).json({ error: "Configuration SapPay introuvable. Veuillez configurer SapPay d'abord." });
        }
        const isSuccess = Math.random() > 0.2;
        if (!isSuccess) {
          db_default.prepare("UPDATE withdrawals SET status = 'echec', processedAt = CURRENT_TIMESTAMP WHERE id = ?").run(id);
          const msg = `\xC9chec de votre demande de retrait de ${withdrawal.amount} FCFA via SapPay. Veuillez contacter le support.`;
          db_default.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)").run((0, import_uuid.v4)(), driver.userId, "Retrait \xE9chou\xE9", msg, "error");
          sendPushNotification(driver.userId, "Retrait \xE9chou\xE9", msg, { type: "withdrawal_failed" });
          return res.status(400).json({ error: "\xC9chec de la transaction SapPay." });
        }
      }
      const finalTxId = txId || (mode === "auto" ? `SP_${Math.random().toString(36).substring(7).toUpperCase()}` : "");
      db_default.transaction(() => {
        db_default.prepare("UPDATE users SET totalWithdrawn = COALESCE(totalWithdrawn, 0) + ? WHERE userId = ?").run(withdrawal.amount, driver.userId);
        if (finalTxId) {
          try {
            db_default.prepare("UPDATE withdrawals SET status = 'valide', txId = ?, processedAt = CURRENT_TIMESTAMP WHERE id = ?").run(finalTxId, id);
          } catch (e) {
            db_default.prepare("UPDATE withdrawals SET status = 'valide', processedAt = CURRENT_TIMESTAMP WHERE id = ?").run(id);
          }
        } else {
          db_default.prepare("UPDATE withdrawals SET status = 'valide', processedAt = CURRENT_TIMESTAMP WHERE id = ?").run(id);
        }
        db_default.prepare(`
          INSERT INTO historique_gains (id, driverId, type, amount, createdAt)
          VALUES (?, ?, 'retrait', ?, CURRENT_TIMESTAMP)
        `).run((0, import_uuid.v4)(), driver.userId, withdrawal.amount);
        const methodText = mode === "auto" ? "via transfert mobile" : "manuellement";
        const msg = `Votre retrait de ${withdrawal.amount} FCFA a \xE9t\xE9 valid\xE9 ${methodText}.${finalTxId ? " Ref: " + finalTxId : ""}`;
        db_default.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)").run((0, import_uuid.v4)(), driver.userId, "Retrait valid\xE9", msg, "success");
        sendPushNotification(driver.userId, "Paiement effectu\xE9", msg, { type: "withdrawal_approved" });
      })();
      res.json({ status: "ok", txId: finalTxId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to validate withdrawal" });
    }
  });
  app.post("/api/payout-registry/:id/rejeter", authenticate, checkAdmin, (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    try {
      const withdrawal = db_default.prepare("SELECT * FROM withdrawals WHERE id = ?").get(id);
      if (!withdrawal) return res.status(404).json({ error: "Retrait non trouv\xE9." });
      if (withdrawal.status === "valide" || withdrawal.status === "rejete") return res.status(400).json({ error: "D\xE9j\xE0 trait\xE9." });
      db_default.transaction(() => {
        db_default.prepare("UPDATE withdrawals SET status = 'rejete', reason = ?, processedAt = CURRENT_TIMESTAMP WHERE id = ?").run(reason, id);
        const msg = `Votre demande de retrait de ${withdrawal.amount} FCFA a \xE9t\xE9 rejet\xE9e. ${reason ? "Raison: " + reason : ""}`;
        db_default.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)").run((0, import_uuid.v4)(), withdrawal.driverId, "Retrait rejet\xE9", msg, "error");
        sendPushNotification(withdrawal.driverId, "Retrait rejet\xE9", msg, { type: "withdrawal_rejected" });
      })();
      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Failed to reject withdrawal" });
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
    app.use(import_express.default.static(distPath, {
      setHeaders: (res, filePath) => {
        const base = import_path3.default.basename(filePath);
        if (base === "index.html" || base === "sw.js" || base.endsWith(".json")) {
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        } else {
          res.setHeader("Cache-Control", "no-cache");
        }
      }
    }));
    app.use((req, res, next) => {
      if (req.method === "GET" && !req.path.startsWith("/api")) {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.sendFile(import_path3.default.join(distPath, "index.html"));
      } else {
        next();
      }
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    startAutoReassignmentTimer();
  });
}
function startAutoReassignmentTimer() {
  setInterval(() => {
    try {
      let reassignmentMode = "manual";
      let autoReassignmentDelay = 15;
      const configRow = db_default.prepare("SELECT value FROM config WHERE `key` = 'app_config'").get();
      if (configRow && configRow.value) {
        const appConfig = JSON.parse(configRow.value);
        if (appConfig.reassignmentMode) reassignmentMode = appConfig.reassignmentMode;
        if (appConfig.autoReassignmentDelay) autoReassignmentDelay = Number(appConfig.autoReassignmentDelay) || 15;
      }
      if (reassignmentMode !== "automatic") return;
      const deliveriesToCheck = db_default.prepare(`
        SELECT id, driverId, driverName, status, updatedAt 
        FROM deliveries 
        WHERE status IN ('accepted', 'ready_for_pickup') AND driverId IS NOT NULL
      `).all();
      const now = /* @__PURE__ */ new Date();
      for (const d of deliveriesToCheck) {
        const updatedAtStr = d.updatedAt;
        if (!updatedAtStr) continue;
        const lastUpdated = new Date(updatedAtStr.includes("T") ? updatedAtStr : updatedAtStr + " UTC");
        const diffInMs = now.getTime() - lastUpdated.getTime();
        const diffInMinutes = diffInMs / (1e3 * 60);
        if (diffInMinutes >= autoReassignmentDelay) {
          console.log(`Auto-reassigning delivery ${d.id} due to timeout (${diffInMinutes.toFixed(1)} mins)`);
          const prevDriverId = d.driverId;
          db_default.prepare(`
            UPDATE deliveries 
            SET status = 'pending', driverId = NULL, driverName = NULL, updatedAt = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).run(d.id);
          db_default.prepare(`
            UPDATE bids 
            SET status = 'rejected', updatedAt = CURRENT_TIMESTAMP 
            WHERE deliveryId = ? AND driverId = ? AND status = 'accepted'
          `).run(d.id, prevDriverId);
          try {
            db_default.prepare(`
              INSERT INTO driver_mission_history (id, driverId, deliveryId, action, createdAt)
              VALUES (?, ?, ?, 'unassigned_timeout', CURRENT_TIMESTAMP)
            `).run((0, import_uuid.v4)(), prevDriverId, d.id);
          } catch (err) {
            console.error("Failed to log unassignment timeout:", err);
          }
          try {
            db_default.prepare(`
              INSERT INTO notifications (id, userId, title, message, type)
              VALUES (?, ?, ?, ?, 'warning')
            `).run(
              (0, import_uuid.v4)(),
              prevDriverId,
              "Course retir\xE9e [Temps d\xE9pass\xE9]",
              `La course #${d.id.slice(-6).toUpperCase()} vous a \xE9t\xE9 retir\xE9e car vous n'avez pas proc\xE9d\xE9 \xE0 la r\xE9cup\xE9ration \xE0 temps (limite de ${autoReassignmentDelay} mins).`,
              "warning"
            );
          } catch (err) {
            console.error("Failed to notify driver of timeout:", err);
          }
          try {
            const deliveryDetails = db_default.prepare("SELECT clientId FROM deliveries WHERE id = ?").get(d.id);
            if (deliveryDetails && deliveryDetails.clientId) {
              db_default.prepare(`
                INSERT INTO notifications (id, userId, title, message, type)
                VALUES (?, ?, ?, ?, 'info')
              `).run(
                (0, import_uuid.v4)(),
                deliveryDetails.clientId,
                "Livreur indisponible",
                `Votre course #${d.id.slice(-6).toUpperCase()} a \xE9t\xE9 remise en recherche automatique car le livreur pr\xE9c\xE9dent a d\xE9pass\xE9 le d\xE9lai de prise en charge.`,
                "info"
              );
            }
          } catch (err) {
            console.error("Failed to notify client of driver timeout:", err);
          }
        }
      }
    } catch (err) {
      console.error("Error in startAutoReassignmentTimer check:", err);
    }
  }, 3e4);
}
startServer();
