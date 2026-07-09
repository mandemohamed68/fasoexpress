# Plan de Test UAT - FASO EXPRESS

Ce document détaille les scénarios de test pour valider le bon fonctionnement de l'application FASO EXPRESS du point de vue de chaque utilisateur.

---

## 👤 Rôle : CLIENT
*Objectif : Envoyer un colis en toute sécurité et suivre sa livraison.*

### 1. Inscription et Profil
- [ ] Créer un compte client avec email/mot de passe.
- [ ] Compléter son profil (nom, téléphone).

### 2. Création d'une Livraison
- [ ] Cliquer sur "Nouvelle Livraison".
- [ ] Saisir une adresse de départ et d'arrivée (utiliser la carte ou la recherche).
- [ ] Choisir le type de véhicule (Moto, Tricycle, Camionnette).
- [ ] Ajouter des détails sur le colis et le prix proposé.
- [ ] Valider la publication de la mission.

### 3. Gestion des Offres
- [ ] Recevoir une notification/voir l'apparition d'offres de livreurs.
- [ ] Consulter le profil du livreur (note, distance).
- [ ] **Accepter une offre** (Passage de la mission en statut "Accepté").

### 4. Suivi et Confirmation
- [ ] Suivre la position du livreur sur la carte en temps réel.
- [ ] Utiliser le chat interne pour communiquer avec le livreur.
- [ ] **Confirmer la réception** une fois le colis livré.
- [ ] Noter le livreur et laisser un avis.

---

## 🛵 Rôle : LIVREUR (Driver)
*Objectif : Trouver des missions, livrer efficacement et gérer ses revenus.*

### 1. Inscription et Validation
- [ ] Créer un compte livreur.
- [ ] Soumettre ses documents pour vérification (le compte doit rester en "Attente" jusqu'à validation admin).

### 2. Radar de Course (Missions Disponibles)
- [ ] Se mettre "En ligne" pour activer le radar.
- [ ] **Test de la nouvelle fonctionnalité :** Cliquer sur le badge "Radar de course" pour voir la liste des missions triées de la plus récente à la plus ancienne.
- [ ] Vérifier que les distances et les prix sont clairement affichés.
- [ ] Cliquer sur une mission dans la liste pour voir les détails sur la carte.

### 3. Workflow de Livraison
- [ ] Faire une offre sur une mission (Bid).
- [ ] Une fois accepté, naviguer vers le point de ramassage.
- [ ] Marquer le colis comme "Récupéré".
- [ ] Naviguer vers le point de livraison.
- [ ] Marquer comme "Livré" (avec prise de photo de preuve si nécessaire).

### 4. Portefeuille et Retraits
- [ ] Consulter son solde (vérifier que la commission est déduite).
- [ ] Effectuer une demande de retrait de fonds.

---

## 👑 Rôle : ADMINISTRATEUR
*Objectif : Superviser la plateforme et garantir la sécurité.*

### 1. Gestion des Utilisateurs
- [ ] Consulter la liste des nouveaux livreurs inscrits.
- [ ] Examiner les documents et **Valider un livreur** (Passer le statut à "Vérifié").
- [ ] Suspendre un compte en cas de non-respect des règles.

### 2. Supervision des Courses
- [ ] Voir toutes les missions en cours sur la carte globale.
- [ ] Intervenir en cas de litige via le dashboard.

### 3. Finances et Paramètres
- [ ] Ajuster le taux de commission de la plateforme.
- [ ] Consulter et **Approuver les demandes de retrait** des livreurs.

---

## 🛠 Tests Techniques et Transverses
- [ ] **Temps Réel :** Vérifier que les messages du chat arrivent instantanément.
- [ ] **Notifications :** Vérifier l'apparition des badges de notification.
- [ ] **Responsive :** Tester l'affichage sur mobile (vue livreur) et desktop (vue admin).
