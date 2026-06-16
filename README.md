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
- Fonctionne hors-ligne (PWA installable)

## Stack technique

| Categorie | Outils |
|-----------|--------|
| Markup | HTML5 |
| Style | CSS3 (custom properties, grid, flexbox) |
| Logique | JavaScript vanilla (ES2020+) |
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

Ouvrir `index.html` dans un navigateur ou deployer sur un serveur statique.

## Architecture

```
pointeuse/
├── index.html          # Shell HTML
├── style.css           # Styles + accessibilite
├── app.js              # Logique applicative
├── sync.js             # Sync multi-appareils (GitHub Gist)
├── sw.js               # Service Worker
├── manifest.json       # Manifeste PWA
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    ├── icon-maskable-512.png
    └── apple-touch-icon.png
```

---

Construit par **[Josue Rocha](https://josuerocha.dev)** · [LinkedIn](https://www.linkedin.com/in/josu%C3%A9-rocha/) · [GitHub](https://github.com/josuerochadev)
