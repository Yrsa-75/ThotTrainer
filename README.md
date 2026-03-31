# 🎯 Thot Trainer v2.0 — Chronos Emploi

Plateforme d'entraînement commercial IA pour les équipes de vente Chronos Emploi.

## Changements v2.0

- **Nouveau contexte** : prospects démarchés via setter (pas d'inscription volontaire)
- **Nouveaux personas** : 5 profils de demandeurs d'emploi / reconversion
- **Nouvelles formations** : Excel, Anglais, Web Marketing, IA
- **Parcours RDV en 8 phases** évalué dans l'analyse
- **Procédure CPF / France Identité** simulée en profondeur
- **Scoring enrichi** : bonus de structure RDV, guidance CPF, présentation Chronos

## Mise à jour depuis la v1

### Option A : Base de données existante (RECOMMANDÉ si tu as déjà des données)

1. Va dans Supabase → **SQL Editor**
2. Exécute ces commandes pour mettre à jour les données existantes :

```sql
-- Supprimer les anciennes formations et personas
DELETE FROM formations;
DELETE FROM personas;
DELETE FROM scoring_rules;

-- Puis exécute le contenu de supabase/migration-v2.sql
-- (seulement les INSERT, pas les CREATE TABLE)
```

3. Copie uniquement les blocs `INSERT INTO formations`, `INSERT INTO personas`, et `INSERT INTO scoring_rules` depuis `supabase/migration-v2.sql`

### Option B : Repartir de zéro

1. Supabase → **SQL Editor**
2. Exécute `supabase/migration-v2.sql` en entier
3. Crée ton compte admin (voir plus bas)

## Déploiement

### 1. Préparer le projet

```bash
# Décompresse l'archive
tar xzf thot-trainer-v2.tar.gz
cd thot-trainer

# Installe les dépendances
npm install

# Copie le fichier d'env
cp .env.local.example .env.local
```

### 2. Remplir .env.local

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

Trouve tes clés Supabase dans **Settings → API**.

### 3. Tester en local

```bash
npm run dev
# Ouvre http://localhost:3000
```

### 4. Déployer sur Vercel

```bash
# Initialise git
git init
git add .
git commit -m "Thot Trainer v2.0 - Chronos Emploi"

# Connecte à ton repo existant ou nouveau
git remote add origin https://github.com/TON_USER/thot-trainer.git
git push -u origin main --force
```

Sur Vercel, vérifie que les **Environment Variables** sont à jour :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`

Vercel redéploie automatiquement après le push.

### 5. Créer ton compte Manager (si base neuve)

```sql
-- Dans Supabase > Authentication > Users > Add User
-- Puis dans SQL Editor :
INSERT INTO profiles (id, email, full_name, role)
VALUES ('COLLE_LE_USER_ID', 'ton@email.com', 'Ton Nom', 'admin');
```

## Architecture

```
app/
├── page.tsx                → Login
├── forgot-password/        → Mot de passe oublié
├── reset-password/         → Réinitialisation
├── dashboard/page.tsx      → App principale (protégée)
├── api/
│   ├── chat/route.ts       → Proxy Anthropic (simulation)
│   ├── analyze/route.ts    → Proxy Anthropic (analyse)
│   └── vendors/route.ts    → Création vendeurs (admin)
├── auth/callback/          → Callback Supabase Auth
lib/
├── supabase-browser.ts     → Client Supabase (navigateur)
├── supabase-server.ts      → Client Supabase (serveur)
├── prompts.ts              → Prompts, personas, formations, scoring
middleware.ts               → Protection des routes
```

## Modifier les formations / personas / scoring

- **Via Supabase** : directement dans les tables `formations`, `personas`, `scoring_rules`
- **Les valeurs par défaut** sont dans `lib/prompts.ts` (utilisées si la DB est vide)

## Coûts

- **Supabase** : gratuit (plan Free)
- **Vercel** : gratuit (plan Hobby)
- **Anthropic** : ~0.05€ par session
