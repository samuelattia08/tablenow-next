# TABLE NOW — Next.js + Convex (nouveau socle)

Ceci est le début de la réécriture complète de TABLE NOW en Next.js
(App Router) + Convex (base de données temps réel) + Vercel (hébergement).

## Ce qui est fait

- Scaffold Next.js 16 (TypeScript, Tailwind v4, App Router)
- Identité de marque appliquée (fond `#08080b`, bleu `#3358ff`, rouge `#ff2140`,
  bouton dégradé signature)
- Schéma Convex : `clients`, `partners`, `reservations`, `tables`
- **7 langues** (FR/EN/ES/PT/HE/DE/RU), sélecteur visible sur chaque page,
  détection automatique de la langue du navigateur, hébreu en RTL
- Pages fonctionnelles, branchées en direct sur Convex :
  - `/` — page de choix (client / partenaire)
  - `/client/signup` — création de compte client
  - `/client/login` — connexion client
  - `/client/book` — plan de salle (50 tables, zones VIP/Standard),
    sélection et **paiement réel par carte ou Apple Pay (Stripe)**,
    réservation créée uniquement après vérification serveur du paiement
  - `/client/reservations` — liste des réservations du client connecté
  - `/partner/login` — connexion partenaire (avec comptes démo)
  - `/partner/dashboard` — base du tableau de bord (à enrichir ensuite)
- `convex/chat.ts` — relais sécurisé vers l'API Claude (corrige le chat IA
  cassé de l'ancienne version, qui appelait l'API directement depuis le
  navigateur sans clé et échouait à chaque fois)

## Ce qu'il reste à faire (prochaines étapes)

- Plan de salle (32 tables, zones VIP/DJ/WC) + sélection de table
- Split payment
- Calendrier de soirées (partenaire)
- Communauté (posts, likes, commentaires)
- i18n (7 langues)
- Chat IA avec l'hôte (API Claude)

## Comment lancer le projet en local

### 1. Installer les dépendances (déjà fait si tu as reçu `node_modules`, sinon) :
```bash
npm install
```

### 2. Connecter Convex (obligatoire, une seule fois)

```bash
npx convex dev
```

Ça va :
- ouvrir ton navigateur pour te connecter à Convex (GitHub ou email — gratuit)
- créer ton projet Convex
- générer automatiquement le dossier `convex/_generated/` (nécessaire pour
  que le code compile — il n'est pas inclus dans ce zip)
- remplir `NEXT_PUBLIC_CONVEX_URL` dans un fichier `.env.local`

Laisse cette commande tourner en arrière-plan (elle surveille les
changements dans `convex/`).

### 3. Créer les comptes partenaires de démo

Dans un **autre terminal** :
```bash
npx convex run partners:seedDemoPartners
```
Ça crée `club-lenocturne@tablenow.app` et `club-klub7@tablenow.app`
(mot de passe `demo1234`), comme dans l'ancienne version — et génère
automatiquement 50 tables (plan de salle 10x5) pour chacun.

### 3bis. Configurer la clé API Claude (pour le chat IA)

```bash
npx convex env set ANTHROPIC_API_KEY sk-ant-...
```
Ta clé reste côté serveur Convex, jamais visible dans le navigateur —
contrairement à l'ancien système qui appelait l'API directement depuis le
site et échouait toujours (d'où les réponses toujours identiques que tu
as remarquées).

### 3ter. Configurer Stripe (paiement carte + Apple Pay)

```bash
npx convex env set STRIPE_SECRET_KEY sk_test_...
```
Et dans `.env.local` (copié depuis `.env.local.example`) :
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

En mode test, utilise une carte de test Stripe pour payer sans vrai argent :
carte `4242 4242 4242 4242`, n'importe quelle date future, n'importe quel CVC.

**Pour qu'Apple Pay apparaisse réellement** (pas juste la carte) :
- Il faut être sur un vrai domaine HTTPS (donc une fois déployé sur Vercel —
  Apple Pay ne s'affiche pas sur localhost)
- Il faut vérifier ce domaine dans Stripe : Dashboard → Paramètres →
  Moyens de paiement → Apple Pay → "Ajouter un nouveau domaine", puis suivre
  les instructions (Stripe héberge le fichier de vérification automatiquement
  si le site est sur Vercel/Netlify)
- Il faut tester depuis Safari (iPhone/Mac) avec une carte déjà enregistrée
  dans Apple Wallet — Apple Pay ne s'affiche jamais sur Chrome/Firefox/Android,
  c'est une limite d'Apple, pas de notre code
- Sur les autres navigateurs/appareils, le formulaire de carte s'affiche
  normalement à la place — rien ne casse, Apple Pay est juste une option en
  plus quand disponible

### 4. Lancer le site

Dans un **autre terminal** :
```bash
npm run dev
```
Ouvre http://localhost:3000

## Déployer sur Vercel

1. Pousse ce dossier sur GitHub (nouveau repo, ou remplace l'ancien)
2. Sur vercel.com → "Add New Project" → importe le repo
3. Dans les variables d'environnement Vercel, ajoute `NEXT_PUBLIC_CONVEX_URL`
   (la même valeur que dans ton `.env.local`)
4. Pour la prod, lance aussi `npx convex deploy` (crée un déploiement Convex
   de production séparé du dev)

## Notes

- Les mots de passe sont hashés avec bcrypt côté Convex (jamais stockés en clair).
- Le stockage `localStorage` n'est utilisé ici que pour garder l'ID du client/
  partenaire connecté côté navigateur — toutes les vraies données (comptes,
  réservations) vivent dans Convex, plus de dépendance à un simple
  navigateur/appareil comme avant.
