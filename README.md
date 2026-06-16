# Pointeuse

Application web (PWA) de suivi des heures de travail. Objectif : 39h/semaine, ~7h48/jour.

## Fonctionnalites

- Saisie des heures d'arrivee et de depart
- Calcul automatique du depart prevu et du solde
- Statut par jour (travaille / conge / ferie)
- Historique par semaine et recap mensuel
- Export CSV et ICS (calendrier)
- Sauvegarde / restauration JSON
- Fonctionne hors-ligne (PWA)

## Utilisation

Aucune installation requise. Ouvrir `index.html` dans un navigateur ou deployer sur GitHub Pages.

Les donnees sont stockees dans le `localStorage` du navigateur.

## Stack

- HTML / CSS / JavaScript vanilla
- Service Worker pour le mode hors-ligne
- Fonts : Fraunces (serif) + Inter (UI)

## Licence

MIT
