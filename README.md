<div align="center">

# Pointeuse

**Application web (PWA) de suivi des heures de travail — objectif 39h/semaine.**

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=flat&logo=pwa&logoColor=white)

[Demo](https://josuerochadev.github.io/pointeuse) · [Portfolio](https://josuerocha.dev) · [Signaler un bug](https://github.com/josuerochadev/pointeuse/issues)

</div>

---

## A propos

Pointeuse est une application personnelle de suivi du temps de travail. Elle calcule automatiquement l'heure de depart prevue, le solde journalier et le solde cumule sur l'ensemble des semaines enregistrees.

L'application fonctionne entierement dans le navigateur, sans serveur ni base de donnees. Les donnees sont stockees dans le `localStorage` et persistent entre les sessions. Le mode hors-ligne est assure par un Service Worker.

La synchronisation entre appareils se fait via un Gist GitHub prive : il suffit d'un Personal Access Token (scope `gist`) pour synchroniser automatiquement ses donnees entre telephone et PC.

## Fonctionnalites

- Saisie des heures d'arrivee et de depart par jour
- Calcul automatique du depart prevu et du solde (avance / retard)
- Statut par jour : travaille, conge, ferie, maladie
- Chargement automatique des jours feries francais
- Avertissement pour les jours non clotures
- Historique par semaine et recapitulatif mensuel
- Export CSV et ICS (calendrier)
- Sauvegarde / restauration JSON
- Synchronisation multi-appareils via GitHub Gist
- Chargement des jours feries pour l'annee en cours et l'annee suivante
- Theme clair / sombre automatique (suit le systeme)
- Notification de mise a jour (bandeau "Recharger")
- Fonctionne hors-ligne avec page de repli (PWA installable)

## Stack technique

| Categorie | Outils |
|-----------|--------|
| Markup | HTML5 |
| Style | CSS3 (custom properties, grid, flexbox, prefers-color-scheme) |
| Logique | JavaScript vanilla (ES modules, ES2020+, event delegation) |
| Fonts | Fraunces (serif) + Inter (UI) via Google Fonts |
| Sync | GitHub Gist API (fetch natif, zero dependance) |
| Offline | Service Worker (network-first HTML/CSS/JS, cache-first assets) |
| Hebergement | GitHub Pages |

## Demarrer

### Prerequis

Un navigateur web moderne (Chrome, Firefox, Safari, Edge).

### Installation

```bash
git clone https://github.com/josuerochadev/pointeuse.git
cd pointeuse
```

Servir avec un serveur statique local (requis pour les ES modules) :

```bash
npx serve .
# ou
python3 -m http.server
```

## Architecture

```
pointeuse/
├── index.html          # Shell HTML
├── style.css           # Styles + accessibilite
├── compute.js          # Fonctions pures (temps, calculs, validation)
├── sync.js             # Sync multi-appareils (GitHub Gist)
├── app.js              # State, rendu, evenements (module principal)
├── sw.js               # Service Worker (network-first + fallback offline)
├── offline.html        # Page de repli hors-ligne
├── tests.html          # Tests unitaires (navigateur)
├── test-runner.js      # Tests unitaires (Node, CI)
├── manifest.json       # Manifeste PWA
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    ├── icon-maskable-512.png
    └── apple-touch-icon.png
```

## Securite

- Echappement HTML (`esc()`) sur toutes les valeurs utilisateur injectees dans le DOM
- Event delegation (pas de handlers inline) — compatible CSP strict
- Validation stricte de la structure des fichiers de sauvegarde importes
- Token GitHub stocke localement (jamais transmis a un tiers)

## Tests

Ouvrir `tests.html` dans le navigateur ou executer via Node :

```bash
node test-runner.js
```

74 tests couvrent : conversions horaires, formatage, calcul des soldes, jours feries, validation des sauvegardes, cas limites.

La CI GitHub Actions lance automatiquement les tests sur chaque push et pull request.

---

Construit par **[Josue Rocha](https://josuerocha.dev)** · [LinkedIn](https://www.linkedin.com/in/josu%C3%A9-rocha/) · [GitHub](https://github.com/josuerochadev)
