import re

with open('backend/mariadb.ts', 'r') as f:
    content = f.read()

target1 = '''  let connection: any = null;
  let lastError: any = null;

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
  }'''

replacement1 = '''  let connection: any = null;
  
  const connect = () => {
    let lastError: any = null;
    let newConnection: any = null;
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
        newConnection = conn;
        
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

    if (!newConnection) {
      console.error("MariaDB: Toutes les tentatives de connexion ont échoué.");
      throw lastError || new Error("Impossible de se connecter à MariaDB avec les configurations de mot de passe fournies.");
    }
    connection = newConnection;
  };

  connect();'''

target2 = '''         try {
           const result = connection.query(formattedSql);
           return result;
         } catch(e: any) {
           console.error("MariaDB query error:", e.message, "\\nSQL:", formattedSql);
           throw e;
         }'''

replacement2 = '''         try {
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
         }'''

if target1 in content:
    content = content.replace(target1, replacement1)
    if target2 in content:
        content = content.replace(target2, replacement2)
        with open('backend/mariadb.ts', 'w') as f:
            f.write(content)
        print("SUCCESS")
    else:
        print("TARGET2 NOT FOUND")
else:
    print("TARGET1 NOT FOUND")
