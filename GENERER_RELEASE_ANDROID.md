# Guide de Génération de la Clé (Keystore) et du Bundle Release Android (.aab / .apk)

Ce guide explique étape par étape comment générer la clé de signature privée (Keystore) pour FASO EXPRESS, configurer la signature automatique et compiler le bundle de production pour le Google Play Store ou l'APK release.

---

## ÉTAPE 1 : Générer la clé de signature (Keystore)

Ouvrez un terminal sur votre machine locale (où Java/JDK est installé) et exécutez la commande suivante :

```bash
keytool -genkeypair -v -keystore release.keystore -alias faso_express_key -keyalg RSA -keysize 2048 -validity 10000
```

Vous devrez répondre à quelques questions (mot de passe, nom, organisation, ville, etc.) :
1. **Mot de passe du Keystore** : choisissez un mot de passe sécurisé (ex: `MonSuperMotDePasse123`).
2. **Questions d'identité** : remplissez votre nom ou entreprise.
3. **Mot de passe de la clé** : appuyez sur `Entrée` pour utiliser le même mot de passe ou saisissez-en un autre.

> ⚠️ **IMPORTANT** : Conservez précieusement le fichier `release.keystore` et ses mots de passe ! Vous en aurez besoin pour toutes les futures mises à jour sur le Play Store.

---

## ÉTAPE 2 : Placer le fichier Keystore et créer `key.properties`

1. Placez le fichier généré `release.keystore` à la racine de votre projet ou dans le dossier `android/`.
2. Créez un fichier nommé **`key.properties`** à l'intérieur du dossier `android/` (ou copiez `android/key.properties.example`) :

```properties
storePassword=MonSuperMotDePasse123
keyPassword=MonSuperMotDePasse123
keyAlias=faso_express_key
storeFile=../release.keystore
```

*(Si vous avez placé `release.keystore` directement dans `android/`, mettez `storeFile=release.keystore`)*

> 🔒 **Sécurité** : Le fichier `key.properties` et les fichiers `.keystore` / `.jks` sont automatiquement ignorés par Git via `.gitignore` pour ne jamais exposer vos clés secrètes.

---

## ÉTAPE 3 : Générer le Bundle Release (AAB / APK)

Une fois `key.properties` créé, vous pouvez générer vos livrables de production directement avec npm :

### Option A : Générer le Bundle Google Play (.aab) - Recommandé pour Play Store
```bash
npm run build:android:bundle
```
Le fichier **`.aab`** signé sera généré dans :
`android/app/build/outputs/bundle/release/app-release.aab`

### Option B : Générer l'APK Release (.apk) - Pour installation directe
```bash
npm run build:android:apk
```
L'**`.apk`** signé sera généré dans :
`android/app/build/outputs/apk/release/app-release.apk`

---

## ÉTAPE 4 : Génération via Android Studio (Alternative Graphique)

Si vous préférez utiliser l'interface graphique Android Studio :
1. Ouvrez Android Studio :
   ```bash
   npx cap open android
   ```
2. Allez dans le menu : **Build > Generate Signed Bundle / APK...**
3. Choisissez **Android App Bundle** ou **APK**.
4. Sélectionnez votre fichier `release.keystore`, saisissez l'alias (`faso_express_key`) et les mots de passe.
5. Sélectionnez le build variant **release** puis cliquez sur **Create**.

---

## 🛠️ DÉPANNAGE : Erreur "Could not read workspace metadata" ou Cache Gradle Corrompu

Si vous rencontrez l'erreur suivante lors de la compilation :
`Could not read workspace metadata from C:\Users\...\.gradle\caches\...\transforms\...\metadata.bin`

C'est une corruption du cache Gradle sous Windows due à un processus en arrière-plan (Gradle Daemon). Pour la résoudre immédiatement :

### Solution 1 : Exécuter le nettoyage Gradle
Dans votre terminal :
```bash
npm run clean:android
```
Puis relancez la compilation :
```bash
npm run build:android:bundle
```

### Solution 2 : Arrêter les processus Gradle et vider le cache corrompu (Windows PowerShell)
Si l'erreur persiste, exécutez ces commandes sous Windows (PowerShell) :
```powershell
# 1. Arrêter tous les processus Gradle
cd android
.\gradlew --stop

# 2. Supprimer le dossier du cache corrompu (Remplacez M.MANDE si votre nom d'utilisateur diffère)
Remove-Item -Recurse -Force "C:\Users\M.MANDE\.gradle\caches\8.14.3\transforms"

# 3. Relancer le build
cd ..
npm run build:android:bundle
```

### Solution 3 : Dans Android Studio
1. Cliquez sur **File > Invalidate Caches...**
2. Cochez **Clear file system cache and Local History**
3. Cliquez sur **Invalidate and Restart**
4. Puis **Build > Clean Project** suivi de **Build > Rebuild Project**.
