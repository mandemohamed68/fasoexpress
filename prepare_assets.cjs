const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("\x1b[35m%s\x1b[0m", "==================================================");
console.log("\x1b[35m%s\x1b[0m", "   FASO EXPRESS - PRÉPARATION DES ACTIFS & APK   ");
console.log("\x1b[35m%s\x1b[0m", "==================================================");

// 1. S'assurer que le dossier 'assets' existe
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  console.log("Création du dossier 'assets'...");
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 2. Définir les sources et cibles
const publicDir = path.join(__dirname, 'public');
const sourceIcon = path.join(publicDir, 'logofaso.png');
const sourceSplash = path.join(publicDir, 'splash.png');

const targetIcon = path.join(assetsDir, 'icon.png');
const targetSplash = path.join(assetsDir, 'splash.png');

// 3. Copier les fichiers d'actifs
try {
  if (fs.existsSync(sourceIcon)) {
    fs.copyFileSync(sourceIcon, targetIcon);
    console.log("\x1b[32m✔\x1b[0m Icône copiée avec succès dans assets/icon.png");
  } else {
    console.log("\x1b[31m✘\x1b[0m Icône source introuvable à : " + sourceIcon);
  }

  if (fs.existsSync(sourceSplash)) {
    fs.copyFileSync(sourceSplash, targetSplash);
    console.log("\x1b[32m✔\x1b[0m Écran d'accueil (splash) copié avec succès dans assets/splash.png");
  } else {
    console.log("\x1b[31m✘\x1b[0m Image d'accueil source introuvable à : " + sourceSplash);
  }
} catch (err) {
  console.error("Erreur lors de la copie des fichiers :", err.message);
}

// 4. Générer les actifs natifs Android
console.log("\nGénération des actifs natifs pour Android...");
try {
  console.log("Exécution : npx @capacitor/assets generate --android");
  execSync('npx @capacitor/assets generate --android', { stdio: 'inherit' });
  console.log("\x1b[32m✔\x1b[0m Actifs Android générés avec succès !");
} catch (err) {
  console.log("\x1b[33m⚠ Attention :\x1b[0m Impossible de générer automatiquement les actifs via la CLI locale.");
  console.log("Assurez-vous d'avoir installé @capacitor/assets localement ou via : npm install @capacitor/assets --save-dev");
  console.log("Ensuite, vous pouvez exécuter : npx capacitor-assets generate --android");
}

console.log("\n\x1b[36m%s\x1b[0m", "Prochaines étapes pour construire l'APK :");
console.log("1. Compilez l'application web : npm run build:android");
console.log("2. Ouvrez le projet dans Android Studio : npx cap open android");
console.log("3. Dans Android Studio, allez à : Build > Build Bundle(s) / APK(s) > Build APK(s)");
console.log("==================================================\n");
