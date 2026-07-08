# Vantage

A white-label sales performance reporting web app built with Next.js 16.
Replaces Power BI dashboards and spreadsheet workflows with a self-hosted,
fully brandable reporting system backed by Google Sheets.

## Quick Start

```bash
npm install
cp .env.example .env.local   # then fill in credentials (see docs/SETUP.md)
npm run dev
# → http://localhost:3000
```

See **docs/** for full documentation.

| Document | Contents |
|---|---|
| [docs/SETUP.md](docs/SETUP.md) | Step-by-step credentials & first-run guide |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the system fits together |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | For non-technical users |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel deploy + custom domain |

## Stack

Next.js 16 · TypeScript · Tailwind v4 · Auth.js v5 · Google Sheets API · Cloudinary · Recharts · react-to-print

## Roles

Admin → full access including settings and user management
DataEntry → can enter data and upload files, view dashboard
Viewer → read-only dashboard and reports
"# VantageCloudinary" 
