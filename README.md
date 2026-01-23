# GT eForms Feature Face Off

A bracket-style voting application for conference events. Attendees can vote on their favorite features, with voting tracked by source (booth visits, sessions, etc.).

## Features

- **Bracket Voting**: 8-team single-elimination bracket with daily rounds
- **Multiple Vote Sources**: Track votes from booth visits, sessions, and more
- **Demo & Production Modes**: Test with demo campaigns before going live
- **Mobile Friendly**: Fully responsive and WCAG 2.1 AA compliant
- **Audit Logging**: Track all admin actions for accountability

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (we recommend [Neon](https://neon.tech) for serverless)

### Environment Setup

Create a `.env` file with the following variables:

```bash
# Database (Neon PostgreSQL)
POSTGRES_PRISMA_URL=postgresql://user:password@host/database?sslmode=require
POSTGRES_URL_NON_POOLING=postgresql://user:password@host/database?sslmode=require

# Authentication Secret (generate with: node scripts/generate-auth-secret.js)
AUTH_SECRET=your-generated-secret-here
```

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Database Schema

The application uses the following data models:

### Core Models

| Model | Description |
|-------|-------------|
| **SiteConfig** | Global site settings (name, colors, copyright) |
| **Campaign** | A bracket competition (can be demo or live) |
| **Competitor** | Features/items being voted on |
| **Round** | A stage in the bracket (Quarterfinals, Semifinals, Finals) |
| **Matchup** | A head-to-head competition between two competitors |
| **Vote** | A user's vote for a competitor in a matchup |
| **VoteSource** | Defines valid vote sources (booth, sessions) |
| **AuditLog** | Tracks all admin actions |

## API Reference

All admin routes require the `Authorization` header with the `AUTH_SECRET`:

```bash
Authorization: Bearer YOUR_AUTH_SECRET
```

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | Get site configuration |
| GET | `/api/campaigns` | List active campaigns |
| GET | `/api/campaigns/[slug]` | Get campaign details with bracket |
| POST | `/api/vote` | Submit a vote |
| GET | `/api/vote?matchupId=&voterEmail=&source=` | Check if user has voted |
| GET | `/api/sources?active=true` | List vote sources |

### Admin Endpoints (Require Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns?details=true` | List all campaigns with full details |
| POST | `/api/campaigns` | Create a new campaign |
| PATCH | `/api/campaigns/[slug]` | Update a campaign |
| DELETE | `/api/campaigns/[slug]` | Delete a campaign |
| POST | `/api/campaigns/[slug]/rounds` | Initialize bracket rounds |
| POST | `/api/admin/complete-round` | Complete a round and advance winners |
| POST | `/api/admin/set-winner` | Manually set a matchup winner |
| PATCH | `/api/config` | Update site configuration |
| POST | `/api/sources` | Create a vote source |
| PATCH | `/api/sources` | Update a vote source |
| DELETE | `/api/sources?id=` | Delete a vote source |

## Campaign Management

### Creating a Campaign

```bash
curl -X POST http://localhost:3000/api/campaigns \
  -H "Authorization: Bearer YOUR_AUTH_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alliance 2026 Feature Vote",
    "slug": "alliance-2026",
    "description": "Vote for the next GT eForms feature!",
    "isDemo": false,
    "competitors": [
      {"name": "Feature A", "description": "Description of Feature A", "seed": 1},
      {"name": "Feature B", "description": "Description of Feature B", "seed": 2},
      {"name": "Feature C", "description": "Description of Feature C", "seed": 3},
      {"name": "Feature D", "description": "Description of Feature D", "seed": 4},
      {"name": "Feature E", "description": "Description of Feature E", "seed": 5},
      {"name": "Feature F", "description": "Description of Feature F", "seed": 6},
      {"name": "Feature G", "description": "Description of Feature G", "seed": 7},
      {"name": "Feature H", "description": "Description of Feature H", "seed": 8}
    ]
  }'
```

### Initializing Rounds

After creating a campaign with competitors, initialize the bracket:

```bash
curl -X POST http://localhost:3000/api/campaigns/alliance-2026/rounds \
  -H "Authorization: Bearer YOUR_AUTH_SECRET"
```

### Activating a Campaign

```bash
curl -X PATCH http://localhost:3000/api/campaigns/alliance-2026 \
  -H "Authorization: Bearer YOUR_AUTH_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}'
```

### Completing a Round

After voting is complete, advance to the next round:

```bash
curl -X POST http://localhost:3000/api/admin/complete-round \
  -H "Authorization: Bearer YOUR_AUTH_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"campaignSlug": "alliance-2026", "roundNumber": 1}'
```

## Vote Sources

Create sources for different voting opportunities:

```bash
# Booth Day 1
curl -X POST http://localhost:3000/api/sources \
  -H "Authorization: Bearer YOUR_AUTH_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"code": "booth-day1", "name": "Booth - Day 1"}'

# Session A
curl -X POST http://localhost:3000/api/sources \
  -H "Authorization: Bearer YOUR_AUTH_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"code": "session-a", "name": "GT eForms Deep Dive Session"}'
```

Users can then vote at `/vote?source=booth-day1` and `/vote?source=session-a`.

## Demo vs Production Mode

- **Demo Campaigns** (`isDemo: true`): For testing. Votes don't count toward real totals.
- **Production Campaigns** (`isDemo: false`): Real voting for the event.

Only one campaign can be active (`isActive: true`) at a time for production use.

## Security

- All admin endpoints require the `AUTH_SECRET` header
- Rate limiting should be added in production (use Vercel's Edge Config or similar)
- All admin actions are logged to the `AuditLog` table
- Votes are validated against active rounds and valid sources

## Deployment

Deploy to Vercel:

```bash
vercel deploy
```

Make sure to set all environment variables in your Vercel project settings.

## License

© 2026 Jay Jorgensen. All rights reserved.
