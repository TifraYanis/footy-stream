# YanisStream

Application personnelle React/Vite pour consulter les matchs sportifs disponibles via l'API publique WatchFooty, lancer les embeds fournis, voir les scores, les statistiques, les tops et les news.

## Stack

- React, TypeScript, Vite
- React Router
- TanStack Query avec cache localStorage
- Lucide React
- Deploiement GitHub Pages via GitHub Actions

## API utilisee

- Documentation: https://watchfooty.st/en/docs
- Exemples: https://watchfooty.st/en/docs/examples
- Matchs: https://watchfooty.st/en/docs/api/matches
- Sports: https://watchfooty.st/en/docs/api/sports
- Details et stats: https://watchfooty.st/en/docs/api/match-details
- Stats avancees: https://watchfooty.st/en/docs/api/match-stats
- Posters: https://watchfooty.st/en/docs/api/posters
- Logos equipes: https://watchfooty.st/en/docs/api/team-logos

## Lancer en local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

Le build copie `dist/index.html` vers `dist/404.html` pour le fallback SPA sur GitHub Pages.

## Deploiement GitHub Pages

1. Creer un repository GitHub.
2. Pousser ce projet sur la branche `main`.
3. Dans GitHub, ouvrir `Settings > Pages`.
4. Selectionner `GitHub Actions` comme source.
5. Le workflow `.github/workflows/deploy.yml` build et publie `dist`.

Le workflow calcule automatiquement `VITE_BASE_PATH` selon le nom du repository, ce qui permet de deployer sur un projet GitHub Pages classique ou sur un repository `username.github.io`.
