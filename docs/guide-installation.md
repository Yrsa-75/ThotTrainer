# Thot Trainer — Guide d'installation nouveau client

## Temps estimé : 15 minutes

---

## Étape 1 — Créer le projet Supabase (3 min)

1. Va sur https://supabase.com/dashboard
2. Clique **New Project**
3. Nom : `thot-trainer-[nom-client]`
4. Mot de passe DB : génère-en un et note-le
5. Région : **West EU (Paris)** de préférence
6. Attends que le projet soit prêt (~1 min)

## Étape 2 — Installer la base de données (2 min)

1. Va dans **SQL Editor**
2. Copie-colle le contenu ENTIER du fichier `install.sql`
3. Clique **Run**
4. Tu dois voir "Success" sans erreur

## Étape 3 — Créer le compte admin du client (2 min)

1. Va dans **Authentication → Users → Add User**
2. Saisis l'email et le mot de passe du client
3. Coche **Auto Confirm**
4. Clique **Create User**
5. **Copie l'UUID** du nouvel utilisateur (colonne `id`)
6. Va dans **SQL Editor** et exécute :

```sql
INSERT INTO profiles (id, email, full_name, role)
VALUES ('COLLE_UUID_ICI', 'email@client.com', 'Nom du Client', 'admin');
```

## Étape 4 — Récupérer les clés Supabase (1 min)

Va dans **Settings → API** et note :
- `Project URL` → c'est la variable `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → c'est `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` → c'est `SUPABASE_SERVICE_ROLE_KEY`

Va aussi dans **Authentication → URL Configuration** :
- Ajoute l'URL du client dans "Redirect URLs" :
  - `https://[domaine-client].vercel.app/auth/callback`
  - Si domaine custom : `https://trainer.client.com/auth/callback`

## Étape 5 — Créer le projet Vercel (5 min)

1. Va sur https://vercel.com → **Add New → Project**
2. Importe le repo : `Yrsa-75/ThotTrainer`
3. Donne un nom au projet (ex: `thot-trainer-client-x`)
4. Avant de déployer, ajoute les **Environment Variables** :

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role |

*Les clés API Anthropic et OpenAI ne sont PAS nécessaires ici — le client les configurera dans l'interface BYOK.*

5. Clique **Deploy**
6. Attends 1-2 minutes

## Étape 6 — Domaine custom (optionnel, 2 min)

1. Sur Vercel → **Settings → Domains**
2. Ajoute le domaine custom du client (ex: `trainer.client.com`)
3. Le client ajoute un CNAME chez son hébergeur DNS :
   - `trainer` → `cname.vercel-dns.com`

## Étape 7 — Donner les accès au client

Envoie au client :
- L'URL de la plateforme
- Son email + mot de passe admin
- Le lien pour créer sa clé Anthropic : https://console.anthropic.com/settings/keys
- Le lien pour créer sa clé OpenAI (voix) : https://platform.openai.com/api-keys

**Le client fait le reste tout seul :**
1. Il se connecte
2. Il va dans Administration → Clés API → colle ses clés
3. Il va dans Administration → Paramétrage → configure son contexte (ou utilise "Générer avec l'IA")
4. Il crée ses vendeurs dans Équipe
5. C'est opérationnel

---

## Checklist rapide

- [ ] Projet Supabase créé
- [ ] SQL `install.sql` exécuté sans erreur
- [ ] Compte admin créé + profil inséré
- [ ] Redirect URL ajoutée dans Supabase Auth
- [ ] Projet Vercel créé avec les 3 variables d'env
- [ ] Déploiement Vercel réussi
- [ ] Test connexion admin OK
- [ ] Domaine custom configuré (si applicable)
