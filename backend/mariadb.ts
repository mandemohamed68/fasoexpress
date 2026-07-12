import mysql2 from 'mysql2';
// @ts-ignore
import SyncMysql from 'sync-mysql';

function cleanEnvVal(val: string | undefined, defaultVal = ''): string {
  if (!val) return defaultVal;
  let s = val.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.substring(1, s.length - 1);
  }
  return s;
}

export default function initMariaDB() {
  const host = cleanEnvVal(process.env.DB_HOST, '127.0.0.1');
  const user = cleanEnvVal(process.env.DB_USER, 'root');
  const database = cleanEnvVal(process.env.DB_NAME, 'faso_express_db');
  const rawPort = cleanEnvVal(process.env.DB_PORT, '3306');
  const port = parseInt(rawPort) || 3306;

  const passwordRaw = process.env.DB_PASSWORD || process.env.DB_PASS || '';

  // Buildez une liste unique de candidats de mots de passe à tester
  const candidates: string[] = [];
  
  // 1. Password brut
  candidates.push(passwordRaw);

  // 2. Password nettoyé (sans guillemets externes si présents)
  const cleaned = cleanEnvVal(passwordRaw);
  if (!candidates.includes(cleaned)) {
    candidates.push(cleaned);
  }

  // 3. Password avec double guillemets explicites (ex: "mm@27071986@")
  const withDoubleQuotes = `"${cleaned}"`;
  if (!candidates.includes(withDoubleQuotes)) {
    candidates.push(withDoubleQuotes);
  }

  // 4. Password avec simple guillemets explicites (ex: 'mm@27071986@')
  const withSingleQuotes = `'${cleaned}'`;
  if (!candidates.includes(withSingleQuotes)) {
    candidates.push(withSingleQuotes);
  }

  console.log(`MariaDB: Tentative de connexion (host=${host}, port=${port}, user=${user}, database=${database}). ${candidates.length} variantes de mot de passe à tester.`);

  let connection: any = null;
  let lastError: any = null;

  function connect() {
    connection = null;
    lastError = null;
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      try {
        const conn = new SyncMysql({
          host,
          user,
          password: candidate,
          database,
          port,
          multipleStatements: true,
          charset: 'utf8mb4'
        });
        // Test de la connexion avec une requête simple
        conn.query("SELECT 1");
        connection = conn;
        
        // Ensure session collation matches the database collation to avoid mix of collations errors
        try {
          conn.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
        } catch (e) {}

        // Ensure database itself is utf8mb4
        try {
          conn.query(`ALTER DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        } catch (e) {}

        console.log(`MariaDB: Connexion réussie à la tentative ${i + 1}/${candidates.length} (Longueur MDP utilisée: ${candidate.length}) !`);
        break;
      } catch (err: any) {
        console.warn(`MariaDB: Tentative ${i + 1}/${candidates.length} échouée avec mot de passe de longueur ${candidate.length}: ${err.message}`);
        lastError = err;
      }
    }

    if (!connection) {
      console.error("MariaDB: Toutes les tentatives de connexion ont échoué.");
      throw lastError || new Error("Impossible de se connecter à MariaDB avec les configurations de mot de passe fournies.");
    }
  }

  // Initial connection
  connect();

  // MIGRATION: Auto-add withdrawalPhone column if missing
  try {
    // Force character set for existing tables
    const tablesToFix = ['users', 'deliveries', 'notifications', 'announcements', 'sectors', 'bids', 'withdrawals', 'config', 'tracking', 'messages', 'promo_codes', 'promo_usages', 'historique_gains'];
    for (const t of tablesToFix) {
      try { connection.query(`ALTER TABLE \`${t}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`); } catch(e) {}
    }

    try { connection.query("ALTER TABLE users ADD COLUMN withdrawalPhone varchar(50) DEFAULT NULL AFTER phone"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column withdrawalPhone to users:", e.message); }
    try { connection.query("ALTER TABLE users ADD COLUMN rib varchar(255) DEFAULT NULL AFTER withdrawalPhone"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column rib to users:", e.message); }
    try { connection.query("ALTER TABLE users ADD COLUMN idCardFront text DEFAULT NULL AFTER rib"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column idCardFront to users:", e.message); }
    try { connection.query("ALTER TABLE users ADD COLUMN idCardBack text DEFAULT NULL AFTER idCardFront"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column idCardBack to users:", e.message); }
    try { connection.query("ALTER TABLE users ADD COLUMN guarantorName varchar(255) DEFAULT NULL AFTER idCardBack"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column guarantorName to users:", e.message); }
    try { connection.query("ALTER TABLE users ADD COLUMN guarantorPhone varchar(50) DEFAULT NULL AFTER guarantorName"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column guarantorPhone to users:", e.message); }
    try { connection.query("ALTER TABLE users ADD COLUMN guarantorCniUrl text DEFAULT NULL AFTER guarantorPhone"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column guarantorCniUrl to users:", e.message); }
    try { connection.query("ALTER TABLE users ADD COLUMN criminalRecordUrl text DEFAULT NULL AFTER guarantorCniUrl"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column criminalRecordUrl to users:", e.message); }
    try { connection.query("ALTER TABLE users ADD COLUMN verificationStatus varchar(50) DEFAULT 'unverified'"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column verificationStatus to users:", e.message); }
    try { connection.query("ALTER TABLE users ADD COLUMN totalWithdrawn double DEFAULT 0 AFTER earnings"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column totalWithdrawn to users:", e.message); }
    try { try { connection.query("ALTER TABLE users ADD COLUMN identityCardUrl LONGTEXT DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column identityCardUrl to users:", e.message); } } catch(e){}
    try { connection.query("ALTER TABLE users MODIFY COLUMN identityCardUrl LONGTEXT"); } catch(e){}
    try { try { connection.query("ALTER TABLE users ADD COLUMN identityCardBackUrl LONGTEXT DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column identityCardBackUrl to users:", e.message); } } catch(e){}
    try { connection.query("ALTER TABLE users MODIFY COLUMN identityCardBackUrl LONGTEXT"); } catch(e){}
    try { try { connection.query("ALTER TABLE users ADD COLUMN criminalRecordUrl LONGTEXT DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column criminalRecordUrl to users:", e.message); } } catch(e){}
    try { connection.query("ALTER TABLE users MODIFY COLUMN criminalRecordUrl LONGTEXT"); } catch(e){}
    try { try { connection.query("ALTER TABLE users ADD COLUMN guarantorCniUrl LONGTEXT DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column guarantorCniUrl to users:", e.message); } } catch(e){}
    try { connection.query("ALTER TABLE users MODIFY COLUMN guarantorCniUrl LONGTEXT"); } catch(e){}
    try { try { connection.query("ALTER TABLE users ADD COLUMN idCardFront LONGTEXT DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column idCardFront to users:", e.message); } } catch(e){}
    try { connection.query("ALTER TABLE users MODIFY COLUMN idCardFront LONGTEXT"); } catch(e){}
    try { try { connection.query("ALTER TABLE users ADD COLUMN idCardBack LONGTEXT DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column idCardBack to users:", e.message); } } catch(e){}
    try { connection.query("ALTER TABLE users MODIFY COLUMN idCardBack LONGTEXT"); } catch(e){}
    try { try { connection.query("ALTER TABLE users ADD COLUMN photoURL LONGTEXT DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column photoURL to users:", e.message); } } catch(e){}
    try { connection.query("ALTER TABLE users MODIFY COLUMN photoURL LONGTEXT"); } catch(e){}
    try { try { connection.query("ALTER TABLE users ADD COLUMN carteGriseUrl LONGTEXT DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column carteGriseUrl to users:", e.message); } } catch(e){}
    try { connection.query("ALTER TABLE users MODIFY COLUMN carteGriseUrl LONGTEXT"); } catch(e){}
    try { connection.query("ALTER TABLE users ADD COLUMN termsAcceptedAt datetime DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column termsAcceptedAt to users:", e.message); }
    try { connection.query("ALTER TABLE users ADD COLUMN driverType varchar(50) DEFAULT 'freelance'"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column driverType to users:", e.message); }
    try { connection.query("ALTER TABLE users ADD COLUMN resetCode varchar(255) DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column resetCode to users:", e.message); }
    try { connection.query("ALTER TABLE users ADD COLUMN resetExpires varchar(255) DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column resetExpires to users:", e.message); }
    
    // Ensure announcements table has all required columns
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
    
    // Update existing announcements table columns if they were created with old schema
    try { try { connection.query("ALTER TABLE announcements ADD COLUMN type varchar(50) DEFAULT 'info'"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column type to announcements:", e.message); } } catch(e){}
    try { try { connection.query("ALTER TABLE announcements ADD COLUMN targetRole varchar(50) DEFAULT 'all'"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column targetRole to announcements:", e.message); } } catch(e){}
    try { try { connection.query("ALTER TABLE announcements ADD COLUMN activeUntil datetime DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column activeUntil to announcements:", e.message); } } catch(e){}
    try { try { connection.query("ALTER TABLE announcements ADD COLUMN is_active tinyint(1) DEFAULT 1"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column is_active to announcements:", e.message); } } catch(e){}
    try { try { connection.query("ALTER TABLE announcements ADD COLUMN image_url LONGTEXT DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column image_url to announcements:", e.message); } } catch(e){}
    
    try { connection.query("ALTER TABLE withdrawals ADD COLUMN withdrawalInfo text DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column withdrawalInfo to withdrawals:", e.message); }
    try { connection.query("ALTER TABLE withdrawals ADD COLUMN reason text DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column reason to withdrawals:", e.message); }
    
    // Add missing columns to deliveries table
    try { try { connection.query("ALTER TABLE deliveries ADD COLUMN lastMessageAt datetime DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column lastMessageAt to deliveries:", e.message); } } catch(e){
      console.error("Failed to add lastMessageAt to deliveries:", e.message);
    }
    try { try { connection.query("ALTER TABLE deliveries ADD COLUMN cancelledBy varchar(255) DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column cancelledBy to deliveries:", e.message); } } catch(e){
      console.error("Failed to add cancelledBy to deliveries:", e.message);
    }
    try { try { connection.query("ALTER TABLE deliveries ADD COLUMN rejectedBy TEXT DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column rejectedBy to deliveries:", e.message); } } catch(e){
      console.error("Failed to add rejectedBy to deliveries:", e.message);
    }
    try { try { connection.query("ALTER TABLE deliveries ADD COLUMN rating double DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column rating to deliveries:", e.message); } } catch(e){}
    try { try { connection.query("ALTER TABLE deliveries ADD COLUMN feedback TEXT DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column feedback to deliveries:", e.message); } } catch(e){}
    try { try { connection.query("ALTER TABLE deliveries ADD COLUMN proofImage LONGTEXT DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column proofImage to deliveries:", e.message); } } catch(e){}
    
    // Create sectors table if it doesn't exist
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
    
    // Update existing sectors table
    try { try { connection.query("ALTER TABLE sectors ADD COLUMN isActive tinyint(1) DEFAULT 1"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column isActive to sectors:", e.message); } } catch(e){}
    try { try { connection.query("ALTER TABLE sectors ADD COLUMN is_active tinyint(1) DEFAULT 1"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column is_active to sectors:", e.message); } } catch(e){}
    try { try { connection.query("ALTER TABLE sectors ADD COLUMN image_url LONGTEXT DEFAULT NULL"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column image_url to sectors:", e.message); } } catch(e){}
    try { try { connection.query("ALTER TABLE sectors ADD COLUMN updatedAt datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"); } catch(e: any) { if(!e.message.includes('Duplicate column name')) console.error("Failed to add column updatedAt to sectors:", e.message); } } catch(e){}

    // Create bids table if it doesn't exist
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

    // Create tracking table if it doesn't exist
    connection.query(`
      CREATE TABLE IF NOT EXISTS tracking (
        id varchar(255) PRIMARY KEY,
        deliveryId varchar(255) NOT NULL,
        lat double NOT NULL,
        lng double NOT NULL,
        timestamp datetime DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Create notifications table if it doesn't exist
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

    // Create historique_gains table if it doesn't exist
    connection.query(`
      CREATE TABLE IF NOT EXISTS historique_gains (
        id varchar(255) PRIMARY KEY,
        driverId varchar(255) NOT NULL,
        type varchar(50) NOT NULL,
        amount double NOT NULL,
        createdAt datetime DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Create driver_mission_history table if it doesn't exist
    connection.query(`
      CREATE TABLE IF NOT EXISTS driver_mission_history (
        id varchar(255) PRIMARY KEY,
        driverId varchar(255) NOT NULL,
        deliveryId varchar(255) NOT NULL,
        action varchar(50) NOT NULL,
        createdAt datetime DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Create message table if it doesn't exist
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

    // Create promo tables if they don't exist
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
    
    console.log("MariaDB: Vérification/Ajout des colonnes de profil et système réussie.");
  } catch (err: any) {
    console.warn("Migration MariaDB (profil) ignorée ou échouée:", err.message);
  }

  return {
    engine: 'MariaDB',
    config: {
      host,
      database
    },
    prepare: (sql: string) => {
      // Ignore SQLite pragmas or translate them
      if (sql.trim().toUpperCase().startsWith('PRAGMA')) {
         const pragmaMatch = sql.trim().match(/PRAGMA table_info\((.*?)\)/i);
         if (pragmaMatch && pragmaMatch[1]) {
           const tableName = pragmaMatch[1];
           return {
             get: () => ({}),
             all: () => {
               try {
                 const cols = connection.query(`SHOW COLUMNS FROM ${tableName}`);
                 return cols.map((c: any) => ({ name: c.Field }));
               } catch (e) {
                 return [];
               }
             },
             run: () => ({ changes: 0 })
           };
         }
         return { get: () => ({}), all: () => ([]), run: () => ({ changes: 0 }) };
      }
      
      const execute = (args: any[]) => {
         let formattedSql = sql;
         // SQLite to MariaDB translations
         formattedSql = formattedSql.replace(/INSERT\s+OR\s+IGNORE\s+INTO/i, 'INSERT IGNORE INTO');
         formattedSql = formattedSql.replace(/INSERT\s+OR\s+REPLACE\s+INTO/i, 'REPLACE INTO');

         // better-sqlite3 boolean param logic
         const processedArgs = args.map(arg => typeof arg === 'boolean' ? (arg ? 1 : 0) : arg);
         
         if (processedArgs && processedArgs.length > 0) {
            formattedSql = mysql2.format(formattedSql, processedArgs);
         }
         try {
           const result = connection.query(formattedSql);
           return result;
         } catch(e: any) {
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
        get: (...args: any[]) => {
           const res = execute(args);
           if (Array.isArray(res) && res.length > 0) return res[0];
           return undefined;
        },
        all: (...args: any[]) => {
           const res = execute(args);
           if (Array.isArray(res)) return res;
           return [];
        },
        run: (...args: any[]) => {
           const res = execute(args);
           return {
             changes: res.affectedRows || 0,
             lastInsertRowid: res.insertId || 0
           };
        }
      }
    },
    exec: (sql: string) => {
       if (sql.trim().toUpperCase().startsWith('PRAGMA')) return;
       try {
         connection.query(sql);
       } catch (err: any) {
         console.warn("DB exec warning:", err.message);
       }
    },
    transaction: (cb: Function) => {
      return (...args: any[]) => {
        connection.query("START TRANSACTION");
        try {
          const res = cb(...args);
          connection.query("COMMIT");
          return res;
        } catch(e) {
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
