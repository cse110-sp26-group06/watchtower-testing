# WatchTower

> A lightweight observability tool for developers. Catch errors, surface performance issues, and collect user feedback — without the noise.

## About

WatchTower is a small observability platform: developers add an injectable JavaScript SDK to their site, and WatchTower captures runtime errors, performance metrics, and user feedback, surfacing them through a centralized dashboard. Think Sentry or LogRocket, but small enough that one person can understand the whole thing end to end.

This is a class project for **CSE 110 (Software Engineering)** at UC San Diego, Spring 2026. 

## Status

🚧 **In active development.** WatchTower is currently in its first design and prototyping sprint. No production functionality is shipped yet.

## Project Structure

WatchTower has three deliverables:

- **SDK** (`/sdk`) — the injectable JavaScript library customers add to their websites.
- **Backend** (`/backend`) — Cloudflare Workers that ingest events from the SDK, store them, and serve them to the Dashboard.
- **Dashboard** (`/dashboard`) — the vanilla-JS web app where developers log in to see their data.

Plus shared concerns:

- **Documentation** (`/docs`) — design brief, project primer, ADRs, sprint overviews.
- **Spikes** (`/spikes`) — disposable prototypes for validating architecture. Not production code.

## Documentation

| Doc | Purpose |
|---|---|
| [Project Primer](docs/PROJECT-PRIMER.md) | Architecture, sub-teams, working agreements, glossary. **Read this first.** |
| [Design Brief](docs/ucd/DESIGN-BRIEF.md) | MVP, target users, scope. |
| [ADR Index](docs/adr/index.md) | All architectural decision records. |
| [Sprint Overviews](docs/sprints/) | Per-sprint goals and sub-team deliverables. |
| [Changelog](CHANGELOG.md) | Notable changes per version. |

For deeper docs, see the project [Wiki](#) *(link forthcoming)*.

## Team

WatchTower is built by Group 06 of CSE 110, Spring 2026.

| Sub-team | Members |
|---|---|
| Client SDK | Aidan, Maxime |
| Backend | Arpita, Kevin, Ethan |
| Dashboard | Stephanie, Dishita, Sean |
| Process / Docs | Zayn, Nicholas |

## License

This is a course project and is not currently licensed for external use.