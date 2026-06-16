# Sync Multi-Device via GitHub Gist — Design Spec

## Goal

Synchroniser les donnees localStorage de la PWA Pointeuse entre plusieurs appareils via un Gist GitHub prive. Single-user, last-write-wins, zero infrastructure.

## Architecture

```
[PWA localStorage] <-> [sync.js] <-> [GitHub Gist API]
                                          |
                                   [Gist prive: pointeuse-sync.json]
```

- `sync.js` : module de sync isole (~80 lignes), charge avant `app.js`
- Gist : un seul fichier `pointeuse-sync.json` dans un Gist prive
- Pas de dependance : fetch API native

## Format du Gist

```json
{
  "pointeuse:settings": { "value": "{...}", "ts": 1718550000000 },
  "pointeuse:week:2026-W25": { "value": "{...}", "ts": 1718549000000 }
}
```

Chaque cle a un `ts` (timestamp de derniere modification) pour le merge last-write-wins.

## Configuration stockee

Cle localStorage `pointeuse:sync` :
```json
{
  "token": "ghp_xxxx",
  "gistId": "abc123def456",
  "lastSync": 1718550000000
}
```

## Flux de sync

### Au chargement
1. Si token + gistId existent dans `pointeuse:sync` -> pull le Gist (`GET /gists/:id`)
2. Merge last-write-wins : pour chaque cle, garder celle avec le `ts` le plus recent (locale ou distante)
3. Mettre a jour localStorage avec les cles gagnantes
4. Re-render

### A chaque modification
1. Sauvegarder dans localStorage (comme aujourd'hui)
2. Push debounced vers le Gist (2s d'inactivite) via `PATCH /gists/:id`

### Premier sync
1. User entre son token dans les reglages
2. L'app cree un Gist prive via `POST /gists` avec description "pointeuse-sync"
3. Le Gist ID est sauve dans `pointeuse:sync`
4. Push initial de toutes les donnees locales

### Offline
- Le push echoue silencieusement
- Au prochain chargement avec reseau, le pull corrigera tout

## API GitHub utilisees

| Action | Methode | Endpoint | Auth |
|--------|---------|----------|------|
| Creer Gist | `POST` | `/gists` | `Authorization: Bearer <token>` |
| Lire Gist | `GET` | `/gists/:id` | `Authorization: Bearer <token>` |
| Mettre a jour Gist | `PATCH` | `/gists/:id` | `Authorization: Bearer <token>` |

Le token necessite uniquement le scope `gist`.

## Fichier sync.js — Interface publique

```js
// Appelees par app.js
syncPull()    // au chargement, avant render — retourne Promise<void>
syncPush()    // apres chaque save — debounced 2s, retourne void (fire-and-forget)
syncConnect(token)    // quand l'user entre son token — cree le Gist, retourne Promise<boolean>
syncDisconnect()      // supprime token/gistId de localStorage
syncStatus()          // retourne { connected: bool, lastSync: number|null }
```

## Modifications a l'existant

### index.html
- Ajouter `<script src="sync.js"></script>` avant `<script src="app.js">`

### sw.js
- Ajouter `./sync.js` aux ASSETS

### app.js
- Init : appeler `await syncPull()` avant le premier `render()`
- Apres chaque `saveWeek()` : appeler `syncPush()`
- Apres chaque `saveSettings()` : appeler `syncPush()`
- `importBackup` : appeler `syncPush()` apres restauration
- `clearWeek` : appeler `syncPush()` apres effacement
- `prefillHolidays` : appeler `syncPush()` apres ajout
- Panneau Reglages : ajouter section sync (voir UI ci-dessous)

### UI dans les reglages

**Si pas connecte :**
- Champ token (type=password) + bouton "Connecter"
- Hint : "Token GitHub avec scope gist uniquement"

**Si connecte :**
- Badge "Synchronise" + timestamp du dernier sync
- Bouton "Deconnecter"

## Gestion d'erreurs

| Erreur | Comportement |
|--------|-------------|
| Token invalide (401) | Toast "Token invalide", suppression du token |
| Gist supprime (404) | Recreer un nouveau Gist + push |
| Reseau down | Silencieux, localStorage continue |
| Rate limit (403) | Toast "Trop de requetes, reessai dans 1 min" |
