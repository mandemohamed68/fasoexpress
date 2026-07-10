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
