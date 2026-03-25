# OctoFarm-Kairo

> Fork of [OctoFarm](https://github.com/OctoFarm/OctoFarm) with an automated order scheduling and distribution module for FDM 3D printer farms.

<div align="center">
  <a href="https://github.com/CYANIDIUS/OctoFarm-Kairo">
    <img src="https://github.com/OctoFarm/OctoFarm/blob/master/server/assets/images/logo.png?raw=true" alt="Logo" width="400px">
  </a>

  <p align="center">
    OctoFarm-Kairo extends OctoFarm with an intelligent order scheduling system that optimally distributes print jobs across multiple FDM printers, minimizing production time and balancing equipment load.
  </p>
</div>

- [About OctoFarm-Kairo](#about-octofarm-kairo)
- [New Features: Order Scheduling Module](#new-features-order-scheduling-module)
- [Getting Started with Docker](#getting-started-with-docker)
- [Installation Development](#installation-development)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## About OctoFarm-Kairo

OctoFarm-Kairo is a fork of OctoFarm — a web-based management interface for 3D printer farms running OctoPrint. This fork adds an **automated order scheduling and distribution module** designed as part of a bachelor's thesis project:

**"Development of an automated load management system for a fleet of FDM 3D printers based on order distribution optimization"**

All original OctoFarm features are preserved:
- Manage your OctoPrint instances (updates, plugins, settings)
- Multiple farm views (panel, list, camera, combined)
- Customizable dashboard with real-time monitoring
- Filament management and tracking
- Print history and logs
- Wide OctoPrint plugin support

## New Features: Order Scheduling Module

### Order Management
- **Create orders** — upload 3MF/G-code files with parameters: name, comment, priority (1-5), total copies, parts per file, material, bounding box dimensions
- **Order lifecycle** — status tracking: `queued` → `calculated` → `scheduled` → `printing` → `done` / `canceled`
- **File management** — uploaded files stored in `server/uploads/orders/<orderId>/`

### Scheduling Algorithm
Two optimization modes:
- **Minimize Time (Greedy)** — assigns batches to the fastest available printer, minimizing total makespan
- **Minimize Idle (Balanced)** — distributes batches evenly across printers, minimizing load spread

The scheduler automatically:
1. Calculates total batches needed: `ceil(totalCopies / partsPerFile)`
2. Filters compatible printers by bed size, material support, and availability
3. Distributes batches according to the selected optimization mode
4. Estimates print time for each printer based on its speed characteristics

### Printer Specifications
Extended printer model with new fields (all optional, no breaking changes):
- `specifications.bedSize` — build volume (x, y, z in mm)
- `specifications.nozzleDiameter` — nozzle diameter (mm, default 0.4)
- `specifications.supportedMaterials` — list of supported materials (PLA, PETG, ABS, TPU, etc.)
- `specifications.printSpeed` — average print speed (mm/s)

### Human-in-the-Loop Workflow
The system follows a confirmation-based workflow:
1. Operator creates an order and uploads a 3MF file
2. System calculates optimal distribution (preview only, no DB changes)
3. Operator reviews the recommendation and manually adjusts if needed
4. Operator confirms assignment (writes to DB)
5. Operator uploads G-code for each assigned printer
6. Operator confirms print start

### UI
New "Orders" tab in the OctoFarm navigation with:
- Order table with status filters (All, Calculated, Scheduled, Printing, Done, Canceled)
- Create order modal with file upload
- Schedule calculation preview with per-printer breakdown
- G-code upload for individual assignments
- Order detail view

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
| `server/models/Order.js` | Mongoose schema for print orders |
| `server/services/scheduler.service.js` | Scheduling algorithm (min_time / min_idle modes) |
| `server/routes/orders.routes.js` | REST API endpoints (9 routes) |
| `server/templates/orders.ejs` | Orders page UI template |
| `client/entry/orders.runner.js` | Client-side entry point (webpack) |
| `client/js/pages/orders/orders.api.js` | Client API module |
| `client/js/pages/orders/orders.utils.js` | UI rendering utilities |

### Modified Files

| File | Change |
|---|---|
| `server/models/Printer.js` | Added optional `specifications` sub-document |
| `server/app-core.js` | Registered `/api/orders` route |
| `server/routes/index.js` | Added GET `/orders` page route |
| `server/templates/layout.ejs` | Added "Orders" navigation link |
| `Dockerfile` | Updated to node:18-slim with webpack build stage |
| `docker-compose.yml` | New: OctoFarm + MongoDB + volumes |

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
| `POST` | `/api/orders/:id/upload-gcode` | Upload G-code for assignment |

## License

This work [is licensed](https://github.com/OctoFarm/OctoFarm/blob/master/LICENSE.txt) under the [GNU Affero General Public License v3](https://www.gnu.org/licenses/agpl-3.0.html).

Based on [OctoFarm](https://github.com/OctoFarm/OctoFarm) by [NotExpectedYet](https://github.com/NotExpectedYet).

## Acknowledgements

- [OctoFarm](https://github.com/OctoFarm/OctoFarm) — the original project this fork is based on
- [Gina Häußge](https://octoprint.org/) — creator of OctoPrint
- [OctoFarm Patreons](https://www.patreon.com/NotExpectedYet) — supporters of the original project
