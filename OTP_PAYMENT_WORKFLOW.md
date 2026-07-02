# MANUAL DE PRODUCTION & SÉCURITÉ : INTEGRATION SAPPAY OTP DIRECT
## PANCHO EXPRESS - PROTOCOLES D'INTÉGRATION ET WORKFLOWS PAR OPÉRATEUR

Ce document contient les spécifications techniques, les cinématiques utilisateur détaillées, et l'orchestration complète du système de paiement par autorisation OTP et USSD (via la passerelle SapPay) intégré au sein de l'architecture de production de **Pancho Express**.

---

## 📌 1. ARCHITECTURE TECHNIQUE ET FLUX SÉCURISÉ

Pour d'évidentes raisons de conformité et de sécurité, l'application utilise une architecture de **double isolation (Backend Proxy)**. Aucune clé secrète d'API (Client Secret, Password) n'est injectée dans le code client.

```
┌─────────────────┐           ┌──────────────────────┐           ┌─────────────────┐
│                 │           │                      │           │                 │
│    FRONTEND     │ ────────> │    BACKEND PROXY     │ ────────> │   API SAPPAY    │
│  (Mobile/Web)   │ <──────── │ (votre-serveur-local)│ <──────── │ (PROD PROCESS) │
│                 │           │                      │           │                 │
└─────────────────┘           └──────────────────────┘           └─────────────────┘
```

### Paramètres de Connexion (Configurables Admin)
Les identifiants d'API de production sont récupérés à chaque transaction à partir des variables d'environnement (.env) ou surchargés dynamiquement via la table de configuration de l'**Espace Admin Pancho** :
*   `SAPPAY_CLIENT_ID`
*   `SAPPAY_CLIENT_SECRET`
*   `SAPPAY_USERNAME`
*   `SAPPAY_PASSWORD`
*   **Base API Publique :** `https://api.prod.sappay.net/api/public`
*   **Base API Checkout :** `https://api.prod.sappay.net/api/checkout`

---

## 🔑 2. LES IDENTIFIANTS DES OPÉRATEURS (PROCESSOR_ID)

Pour cibler l'opérateur correct au Burkina Faso, le système utilise les identifiants processeurs officiels suivants :

| Opérateur | ID de Processeur SapPay | Catégorie de Flux |
| :--- | :--- | :--- |
| **Orange Money** | `11688813752134336` | OTP Manuel (Génération USSD) |
| **Moov Money** | `11688813838374580` | OTP Automatique (SMS Push) |
| **Telecel Money** | `11744695746597207` | OTP Manuel (Génération USSD) |
| **Coris Money** | `11702302492453862` | OTP Automatique (SMS Push) |

---

## 🔄 3. CINÉMATIQUE COMPLÈTE OPÉRATEUR PAR OPÉRATEUR

### 🟠 CANAL 1 : ORANGE MONEY BURKINA FASO
> **Type de Flux :** OTP Manuel via pré-génération par le client.

1.  **Saisie Initialisation :**
    *   L'utilisateur choisit **Orange Money** dans l'application et entre son numéro de téléphone de format (ex: `76XXXXXX`).
    *   Le client valide, ce qui déclenche un appel vers `/api/payment/sappay/init` pour créer une facture simple et récupérer l'identifiant unique `invoice_id`.
2.  **Génération de l'OTP :**
    *   Le système de paiement direct Orange Money requiert que le client génère un code temporaire à 6 chiffres depuis son téléphone.
    *   Le client est invité à composer la syntaxe de paiement (ex : `*144*4*6*montant#`) pour obtenir son OTP à usage unique par écran système sécurisé.
    *   *Facilité Mobile :* Le bouton "Relancer la syntaxe" dans l'application Pancho permet de pré-composer et lancer directement l'appel USSD sur le composeur natif du smartphone.
3.  **Vérification & Validation :**
    *   Le client revient sur l'application Pancho Express et entre le code OTP obtenu à l'écran.
    *   L'application transmet ces données à la route backend `/api/payment/sappay/perform` avec le processeur `11688813752134336`.
    *   Si le statut retourné est `SUCCESS`, la commande passe en préparation immédiate.

---

### 🔵 CANAL 2 : MOOV MONEY BURKINA FASO
> **Type de Flux :** OTP Automatique initié par le serveur de l'opérateur.

1.  **Saisie Initialisation :**
    *   L'utilisateur sélectionne son mode de paiement **Moov Money** puis compose son numéro de téléphone (ex: `70XXXXXX`).
    *   Le client valide la transaction préliminaire.
2.  **Appel d'Émission OTP Automatique :**
    *   Le serveur de Pancho Express initialise d'abord la facture, puis exécute automatiquement en arrière-plan une requête vers l'endpoint `/api/payment/sappay/get-otp` avec l'identifiant processeur Moov `11688813838374580`.
    *   L'opérateur On-Net de Moov Money Burina Faso transmet un SMS direct sécurisé à l'utilisateur contenant son code OTP à 6 chiffres ainsi qu'un identifiant de transaction unique (`trans_id`).
3.  **Confirmation de la Débit-Autorisation :**
    *   Le client saisit l'OTP reçu par SMS sur l'interface Pancho.
    *   *Cas de secours :* Si le `trans_id` n'est pas auto-transmis par le serveur de paiement, un champ spécifique permet au client d'entrer la référence de transaction SMS (ex: `OMROR...`).
    *   Le formulaire est validé via l'API `/api/payment/sappay/perform`.

---

### 🔴 CANAL 3 : TELECEL EASY / TELECEL MONEY
> **Type de Flux :** OTP Manuel via pré-génération USSD.

1.  **Saisie Initialisation :**
    *   Le client séléctionne **Telecel Money** et saisit son numéro de téléphone.
    *   Facture initialisée en base de données de l'API.
2.  **Génération de l'OTP :**
    *   Le client consulte ou génère son code d'autorisation temporaire de paiement Telecel.
3.  **Validation :**
    *   L'utilisateur soumet son code OTP sur l'interface sécurisée.
    *   L'application valide la transaction par l'API de paiement avec le processeur ID Telecel `11744695746597207`.

---

### 🔵 CANAL 4 : CORIS MONEY
> **Type de Flux :** OTP Automatique initié par le partenaire Coris.

1.  **Saisie Initialisation :**
    *   L'utilisateur choisit **Coris Money** et tape son numéro de compte/téléphone Coris.
2.  **Déclenchement OTP :**
    *   Le proxy web exécute immédiatement l'appel `/get-otp` avec le processeur Coris `11702302492453862`.
    *   Coris Bank génère et envoie instantanément un code d'autorisation direct à 5 chiffres sur le téléphone de l'utilisateur.
3.  **Saisie et Validation Finale :**
    *   L'utilisateur entre le code à 5 chiffres.
    *   L'application finalise avec la route de paiement `/api/payment/sappay/perform`.

---

## 💻 4. EXTRAITS DES CODE SÉCURISÉS EN PRODUCTION

### A. Initialisation Backend d'une Facture (`server.ts`)
```typescript
app.post("/api/payment/sappay/init", async (req, res) => {
  try {
    const { amount, note, email } = req.body;
    const token = await getSappayToken(); // Récupère le Bearer token d'authentification valide

    const invoiceResponse = await fetch(`${SAPPAY_BASE_PUBLIC}/invoice/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        type: "SIMPLE",
        customer: {
          email: email || "client@pancho.app",
          country: 1 // Burkina Faso
        },
        amount: amount.toString(),
        note: note || `Livraison PANCHO`
      }),
    });

    if (!invoiceResponse.ok) {
      throw new Error(`Erreur initialisation de facture. Statut: ${invoiceResponse.status}`);
    }

    const responseData = await invoiceResponse.json();
    const invoiceId = findInvoiceId(responseData);

    res.json({ 
      invoice_id: invoiceId, 
      access_token: token,
      status: responseData.status || "PENDING"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

### B. Validation d'un Paiement Backend (`server.ts`)
```typescript
app.post("/api/payment/sappay/perform", async (req, res) => {
  try {
    const { invoice_id, payment_processor_id, customer_msisdn, otp, trans_id, access_token } = req.body;
    
    const payload: any = {
      invoice_id,
      payment_processor_id,
      customer_msisdn: normalizePhoneNumber(customer_msisdn),
      otp: otp.toString()
    };

    if (trans_id) {
       payload.trans_id = trans_id;
    }

    const headers: any = { "Content-Type": "application/json" };
    if (access_token) {
      headers["Authorization"] = `Bearer ${access_token}`;
    }

    const response = await fetch(`${SAPPAY_BASE_CHECKOUT}/perform/`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🚨 5. GESTION DES CAS D'ÉCHEC SUR LE TERRAIN

1.  **Erreur Réseau (Statut 500 Partenaire) :**
    Si l'opérateur local ou SapPay renvoie un message HTML ou une erreur interne (500), le parser intelligent de Pancho Express l'intercepte dans `extractSpecificError()` afin d'afficher à l'écran un message explicite réconfortant indiquant que l'opérateur rencontre des lenteurs, au lieu d'une erreur brute de crash informatique.
2.  **Solde Insuffisant :**
    La transaction est immédiatement rejetée à l'étape finale `/perform`. L'utilisateur est notifié et peut ainsi retenter le paiement après rechargement ou opter pour le paiement cash à la livraison.
3.  **Échec de Déclenchement Automatique de l'OTP :**
    Pour Moov ou Coris, si l'envoi SMS échoue, l'utilisateur obtient l'invitation de refaire sa demande d'OTP ou de saisir l'identifiant de transaction SMS reçu si de multiples re-générations ont été tentées.
