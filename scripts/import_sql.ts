import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import db from '../backend/db';

// Charge les variables d'environnement
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '.env') });

const SQL_FILE_NAME = 'fasoexpressbd.sql';
const sqlFilePath = path.join(process.cwd(), SQL_FILE_NAME);

async function runImport() {
  console.log("==========================================");
  console.log("  IMPORTATEUR DE BASE DE DONNÉES FASO EXPRESS");
  console.log("==========================================");

  // Détecter le moteur actif
  const useMariaDB = process.env.DB_HOST !== undefined;
  const dbEngine = useMariaDB ? 'MariaDB (Production / Distant)' : 'SQLite (Local)';
  console.log(`📡 Base de données active : \x1b[36m${dbEngine}\x1b[0m`);

  if (!fs.existsSync(sqlFilePath)) {
    console.log(`\n\x1b[33m⚠️ Fichier introuvable : "${SQL_FILE_NAME}" dans le dossier racine.\x1b[0m`);
    console.log("Veuillez téléverser votre fichier SQL :");
    console.log("1. Glissez-déposez le fichier 'fasoexpressbd.sql' dans l'explorateur de fichiers de l'éditeur de code.");
    console.log("2. Relancez ensuite cette commande pour injecter les données.");
    console.log("\n💡 Si votre fichier a un nom différent, renommez-le en 'fasoexpressbd.sql'.");
    process.exit(0);
  }

  console.log(`\n📂 Lecture du fichier SQL : ${SQL_FILE_NAME} (${(fs.statSync(sqlFilePath).size / 1024 / 1024).toFixed(2)} MB)...`);
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  // Découpage intelligent par requêtes SQL (en tenant compte des points-virgules)
  const statements: string[] = [];
  let currentStatement = '';
  let inString = false;
  let stringChar = '';

  const lines = sqlContent.split('\n');
  console.log(`⚡ Analyse de ${lines.length} lignes de code SQL...`);

  for (let line of lines) {
    // Retirer les commentaires SQL simples
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('--') || trimmedLine.startsWith('#') || (trimmedLine.startsWith('/*') && trimmedLine.endsWith('*/'))) {
      continue;
    }

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      // Gérer l'échappement des chaînes de caractères
      if ((char === "'" || char === '"') && (i === 0 || line[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      currentStatement += char;

      // Si on trouve un point-virgule en dehors d'une chaîne, on a une instruction complète
      if (char === ';' && !inString) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    currentStatement += '\n';
  }

  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  console.log(`📊 ${statements.length} requêtes SQL extraites.`);

  // Filtrer et nettoyer les requêtes pour SQLite si nécessaire
  const finalStatements: string[] = [];
  let insertCount = 0;
  let ddlCount = 0;

  for (let stmt of statements) {
    let cleaned = stmt.trim();
    if (!cleaned) continue;

    // Ignorer les commentaires multilignes ou directives MySQL
    if (cleaned.startsWith('/*') && cleaned.endsWith('*/;')) continue;
    if (cleaned.toUpperCase().startsWith('SET ')) continue;
    if (cleaned.toUpperCase().startsWith('LOCK TABLES')) continue;
    if (cleaned.toUpperCase().startsWith('UNLOCK TABLES')) continue;

    if (!useMariaDB) {
      // Nettoyages spécifiques SQLite :
      // 1. Remplacer les types incompatibles ou options MySQL
      if (cleaned.toUpperCase().startsWith('CREATE TABLE')) {
        // Enlever les options de table MySQL à la fin (ENGINE=InnoDB, AUTO_INCREMENT=X, DEFAULT CHARSET=utf8mb4, etc.)
        cleaned = cleaned.replace(/\)\s*ENGINE\s*=\s*\w+[^;]*/gi, ')');
        cleaned = cleaned.replace(/\)\s*DEFAULT\s*CHARSET\s*=\s*\w+[^;]*/gi, ')');
        cleaned = cleaned.replace(/\)\s*COLLATE\s*=\s*\w+[^;]*/gi, ')');
        cleaned = cleaned.replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT');
        cleaned = cleaned.replace(/datetime/gi, 'TEXT');
        cleaned = cleaned.replace(/double/gi, 'REAL');
        cleaned = cleaned.replace(/int\(\d+\)/gi, 'INTEGER');
        cleaned = cleaned.replace(/varchar\(\d+\)/gi, 'TEXT');
        cleaned = cleaned.replace(/longtext/gi, 'TEXT');
        cleaned = cleaned.replace(/text/gi, 'TEXT');
        // Ne pas exécuter les CREATE TABLE si SQLite a déjà les tables configurées par défaut pour éviter d'écraser des colonnes custom (comme proofImage)
        // On préfère ne faire que les INSERT/REPLACE de données, sauf si l'utilisateur veut tout réinitialiser.
        if (cleaned.toUpperCase().includes('CREATE TABLE')) {
          // On le garde au cas où mais on privilégie l'import des données
          ddlCount++;
        }
      }
    }

    if (cleaned.toUpperCase().startsWith('INSERT') || cleaned.toUpperCase().startsWith('REPLACE')) {
      insertCount++;
    } else {
      ddlCount++;
    }

    finalStatements.push(cleaned);
  }

  console.log(`📥 Préparation de l'importation :`);
  console.log(`   - Requêtes d'insertion (Données) : ${insertCount}`);
  console.log(`   - Requêtes de structure/autres : ${ddlCount}`);

  console.log(`\n🚦 Lancement de l'écriture en base...`);

  // Désactiver temporairement les contraintes d'intégrité pour éviter les blocages de clés étrangères lors d'imports désordonnés
  try {
    if (useMariaDB) {
      db.exec("SET FOREIGN_KEY_CHECKS = 0;");
    } else {
      db.exec("PRAGMA foreign_keys = OFF;");
    }
  } catch (e) {
    console.warn("⚠️ Impossible de désactiver temporairement les clés étrangères:", e.message);
  }

  let successCount = 0;
  let failCount = 0;
  const sampleErrors: string[] = [];

  // Exécuter les requêtes une par une pour un meilleur reporting d'erreurs
  for (let i = 0; i < finalStatements.length; i++) {
    const stmt = finalStatements[i];
    try {
      db.exec(stmt);
      successCount++;
    } catch (err: any) {
      failCount++;
      if (sampleErrors.length < 5) {
        sampleErrors.push(`Requête : "${stmt.slice(0, 100)}..." \nErreur : ${err.message}`);
      }
    }

    // Afficher l'avancement
    if ((i + 1) % 100 === 0 || i === finalStatements.length - 1) {
      process.stdout.write(`⏳ Avancement : ${i + 1}/${finalStatements.length} (${Math.round((i + 1) / finalStatements.length * 100)}%)\r`);
    }
  }

  // Réactiver les contraintes d'intégrité
  try {
    if (useMariaDB) {
      db.exec("SET FOREIGN_KEY_CHECKS = 1;");
    } else {
      db.exec("PRAGMA foreign_keys = ON;");
    }
  } catch (e) {}

  console.log(`\n\n✅ Importation terminée !`);
  console.log(`🎉 Requêtes exécutées avec succès : \x1b[32m${successCount}\x1b[0m`);
  if (failCount > 0) {
    console.log(`❌ Requêtes échouées : \x1b[31m${failCount}\x1b[0m (souvent dû à des tables ou index déjà existants, ce qui est normal)`);
    console.log(`\n🔍 Aperçu des premières erreurs rencontrées :`);
    sampleErrors.forEach((err, idx) => {
      console.log(`------------------------------------------`);
      console.log(`Erreur #${idx + 1} :\n${err}`);
    });
  }

  console.log("\n==========================================");
  console.log("⚙️  Pensez à redémarrer le serveur de développement");
  console.log("   pour voir les nouvelles données s'afficher !");
  console.log("==========================================");
  
  // Fermer la base proprement
  try {
    if (db.close) db.close();
  } catch {}
  process.exit(0);
}

runImport().catch(err => {
  console.error("❌ Erreur critique lors de l'importation :", err);
  process.exit(1);
});
