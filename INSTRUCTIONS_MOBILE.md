# Guide de Génération Mobile pour FASO EXPRESS (Android & iOS)

Ce projet est configuré avec **Capacitor** pour permettre la génération d'applications natives (Android APK et iOS).

## Pré-requis
1. **Node.js** installé.
2. **Android Studio** (pour Android).
3. **Xcode** (pour iOS) sur macOS.
4. **Capacitor CLI** (installé via `npm install`).

## Étapes de génération

### 1. Préparation du code web
Compilez le projet web :
```bash
npm run build
```

### 2. Synchronisation avec les projets natifs
```bash
npx cap sync
```

### 3. Ouverture dans les environnements natifs

#### Android :
```bash
npx cap open android
```

#### iOS :
```bash
npx cap open ios
```

### 4. Génération de l'application
- **Android** : Dans Android Studio, utilisez **Build > Build Bundle(s) / APK(s)**.
- **iOS** : Dans Xcode, configurez votre équipe de développement, puis utilisez **Product > Archive**.

## Notes importantes
- L'ID de l'application est `com.faso.express`.
- Assurez-vous d'avoir configuré les clés nécessaires dans `AndroidManifest.xml` (Android) et `Info.plist` (iOS).

## Résolution des Problèmes (Troubleshooting)

### iOS : Erreur "LOAD FAILED" au démarrage / connexion
Sur iOS, le système bloque par défaut toutes les requêtes HTTP non sécurisées (comme l'adresse IP de votre serveur Debian `http://167.172.39.172:1010/api`). Cela produit l'erreur **"LOAD FAILED"** sur fond rouge.

Pour résoudre ce problème :
1. Ouvrez le projet iOS dans Xcode :
   ```bash
   npx cap open ios
   ```
2. Dans le navigateur de projet à gauche, ouvrez le fichier `App/App/Info.plist` (ou faites un clic droit sur `App` -> **Show in Finder** -> modifiez `Info.plist`).
3. Ajoutez l'exception **App Transport Security (ATS)** pour autoriser les requêtes HTTP arbitraires :
   - **En mode texte (Source Code)** : Ajoutez ce bloc à l'intérieur de la balise principale `<dict>` :
     ```xml
     <key>NSAppTransportSecurity</key>
     <dict>
         <key>NSAllowsArbitraryLoads</key>
         <true/>
     </dict>
     ```
   - **En mode visuel dans Xcode** :
     - Ajoutez une nouvelle ligne avec la clé : `App Transport Security Settings` (type Dictionary).
     - Sous cette clé, ajoutez un élément : `Allow Arbitrary Loads` (type Boolean) et définissez sa valeur sur `YES`.
4. Recompilez et lancez l'application dans le simulateur ou sur votre appareil iOS.

