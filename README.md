# OctoFarm-Kairo

> Fork of [OctoFarm](https://github.com/OctoFarm/OctoFarm) with an automated order scheduling and distribution module for FDM 3D printer farms. Full Russian interface.

<div align="center">
  <a href="https://github.com/CYANIDIUS/OctoFarm-Kairo">
    <img src="https://github.com/OctoFarm/OctoFarm/blob/master/server/assets/images/logo.png?raw=true" alt="Logo" width="400px">
  </a>

  <p align="center">
    OctoFarm-Kairo extends OctoFarm with an intelligent order scheduling system that optimally distributes print jobs across multiple FDM printers, minimizing production time and balancing equipment load.
  </p>
</div>

- [About OctoFarm-Kairo](#about-octofarm-kairo)
- [New Features](#new-features)
- [Printer Groups](#printer-groups)
- [Getting Started with Docker](#getting-started-with-docker)
- [Installation Development](#installation-development)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## About OctoFarm-Kairo

OctoFarm-Kairo is a fork of OctoFarm — a web-based management interface for 3D printer farms running OctoPrint. This fork adds an **automated order scheduling and distribution module** designed as part of a bachelor's thesis project:

**"Development of an automated load management system for a fleet of FDM 3D printers based on order distribution optimization"**

All original OctoFarm features are preserved. The entire interface is localized to Russian.

## New Features

### Order Management
- **Create orders** — upload 3MF/G-code files with parameters: name, comment, priority (1-5), file copies, parts per file, material, bounding box dimensions
- **Order lifecycle** — status tracking: `queued` → `calculated` → `scheduled` → `printing` → `done` / `canceled`
- **File management** — uploaded files stored in `server/uploads/orders/<orderId>/`
- **Smart field naming** — `fileCopies` (number of print runs) × `partsPerFile` (parts in one file) = `totalParts` (auto-calculated)

### Printer Groups
Printers are automatically grouped by configuration. A group shares the same G-code.

A group is defined by: **printer model + nozzle diameter + nozzle material + loaded filament type**

Example fleet of 6 printers forming 3 groups:

| Group | Printers | Nozzle | Filament | G-code |
|---|---|---|---|---|
| A | 3× Ender 3 V2 | 0.4mm Brass | PETG Black | 1 shared |
| B | 2× Anycubic Kobra S1 Combo | 0.4mm Brass | PLA White | 1 shared |
| C | 1× Anycubic Kobra S1 Combo | 0.2mm Stainless | ABS Black | 1 separate |

Extended printer model fields:
- `specifications.bedSize` — build volume (x, y, z in mm)
- `specifications.nozzleDiameter` — nozzle diameter (mm, default 0.4)
- `specifications.nozzleMaterial` — nozzle material (Brass, Stainless Steel, etc.)
- `specifications.supportedMaterials` — list of supported materials
- `specifications.printSpeed` — average print speed (mm/s)
- `loadedFilament.type` — currently loaded filament type (PLA, PETG, ABS, etc.)
- `loadedFilament.color` — filament color (Black, White, etc.)

### Scheduling Algorithm
Two optimization modes:
- **Minimize Time (Greedy)** — assigns batches to the group that finishes earliest, minimizing total makespan
- **Minimize Idle (Balanced)** — distributes batches proportionally across groups by capacity

The scheduler:
1. Groups compatible printers by configuration
2. Distributes batches across groups (each group acts as a pool of parallel printers)
3. Within a group, batches are split evenly across printers (parallel printing)
4. Estimates time using reference printer speed scaling: if a file was sliced for a 300mm/s printer, a 150mm/s printer gets 2× the time

### Human-in-the-Loop Workflow
1. Operator creates an order, selects reference printer (sliced for), compatible groups
2. System calculates optimal distribution (preview only)
3. Operator reviews the recommendation
4. Operator confirms assignment
5. Operator uploads G-code per printer group (one G-code per group, shared by all printers)
6. Operator confirms print start

### Russian Localization
Full Russian interface:
- All navigation, menus, and page titles
- Order management forms, modals, and tables
- Dashboard, printer management, file manager, filament, history, system settings
- Login, registration, and welcome pages
- Error messages and notifications

## Getting Started with Docker

### Prerequisites
- [Docker](https://www.docker.com/get-started) and Docker Compose
- An OctoPrint instance running on each printer

### Quick Start

```bash
git clone https://github.com/CYANIDIUS/OctoFarm-Kairo.git
cd OctoFarm-Kairo
git checkout feature/order-scheduler
docker compose build
docker compose up -d
```

OctoFarm-Kairo will be available at `http://localhost:4000`.

### Seed Test Printers

To create test printers for development (6 printers in 3 groups):

```bash
docker compose exec octofarm node server/scripts/seed-test-printers.js
```

### Docker Compose Configuration

The included `docker-compose.yml` provides:
- **octofarm** — Node.js 18 application server on port 4000
- **mongo** — MongoDB 6 database
- Persistent volumes for database, uploads, and logs

### Environment Variables
| Variable | Default | Description |
|---|---|---|
| `MONGO` | `mongodb://mongo:27017/octofarm` | MongoDB connection string |
| `OCTOFARM_PORT` | `4000` | Application port |

## Installation Development

### Requirements
- Git
- Node.js >= 14
- npm
- MongoDB

### Setup

1. Clone the repository
```bash
git clone https://github.com/CYANIDIUS/OctoFarm-Kairo.git
cd OctoFarm-Kairo
git checkout feature/order-scheduler
```

2. Install dependencies
```bash
npm install
npm run setup-dev
```

3. Create `.env` file in the root directory
```dotenv
NODE_ENV=development
MONGO=mongodb://127.0.0.1:27017/octofarm
OCTOFARM_PORT=4000
```

4. Build the client
```bash
npm run build-client
```

5. Start the server
```bash
npm run dev-server
```

## Architecture

### New Files

| File | Description |
|---|---|
| `server/models/Order.js` | Mongoose schema for print orders with group-based assignments |
| `server/services/scheduler.service.js` | Group-based scheduling algorithm (min_time / min_idle) |
| `server/services/printer-groups.service.js` | Printer grouping by configuration (model + nozzle + filament) |
| `server/routes/orders.routes.js` | REST API endpoints (11 routes) |
| `server/templates/orders.ejs` | Orders page UI template (Russian) |
| `client/entry/orders.runner.js` | Client-side entry point (webpack) |
| `client/js/pages/orders/orders.api.js` | Client API module |
| `client/js/pages/orders/orders.utils.js` | UI rendering utilities |
| `server/scripts/seed-test-printers.js` | Test data: 6 printers in 3 groups |

### Modified Files

| File | Change |
|---|---|
| `server/models/Printer.js` | Added `specifications` (nozzleMaterial), `loadedFilament` |
| `server/app-core.js` | Registered `/api/orders` route |
| `server/routes/index.js` | Added GET `/orders` page route |
| `server/templates/layout.ejs` | Added "Заказы" navigation link |
| `server/templates/**/*.ejs` | Full Russian localization (81 templates) |
| `client/**/*.js` | Russian localization of client-side strings (27 files) |
| `Dockerfile` | node:18-slim + webpack build stage |
| `docker-compose.yml` | OctoFarm + MongoDB 6 + volumes |

## API Reference

All endpoints require authentication (`ensureAuthenticated`).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/orders` | List all orders (optional `?status=` filter) |
| `GET` | `/api/orders/:id` | Get single order |
| `POST` | `/api/orders` | Create order (multipart form with file upload) |
| `PUT` | `/api/orders/:id` | Update order |
| `DELETE` | `/api/orders/:id` | Delete order |
| `POST` | `/api/orders/:id/calculate` | Calculate schedule (preview, no DB write) |
| `POST` | `/api/orders/:id/assign` | Confirm and save assignments |
| `POST` | `/api/orders/:id/confirm-print` | Confirm print start |
| `POST` | `/api/orders/:id/upload-gcode` | Upload G-code for group assignment |
| `GET` | `/api/orders/printers/list` | List printers with specifications |
| `GET` | `/api/orders/printers/groups` | List printer groups by configuration |

## License

This work [is licensed](https://github.com/OctoFarm/OctoFarm/blob/master/LICENSE.txt) under the [GNU Affero General Public License v3](https://www.gnu.org/licenses/agpl-3.0.html).

Based on [OctoFarm](https://github.com/OctoFarm/OctoFarm) by [NotExpectedYet](https://github.com/NotExpectedYet).

## Acknowledgements

- [OctoFarm](https://github.com/OctoFarm/OctoFarm) — the original project this fork is based on
- [Gina Häußge](https://octoprint.org/) — creator of OctoPrint
- [OctoFarm Patreons](https://www.patreon.com/NotExpectedYet) — supporters of the original project
