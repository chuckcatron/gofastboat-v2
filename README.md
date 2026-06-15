# GoFastBoat.com

Rebuild of [gofastboat.com](https://gofastboat.com) — a Florida used go-fast / performance boat dealer.
Built with [Next.js](https://nextjs.org) (App Router) + [Convex](https://convex.dev) + [Clerk](https://clerk.com),
deployed to Vercel (web) and Convex (backend).

## Getting Started

Install dependencies and run the dev server alongside Convex:

```bash
npm install
npx convex dev      # in one terminal — starts the Convex dev deployment
npm run dev         # in another — Next.js dev server
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and fill in the values (see **Environment Variables** below).

## Environment Variables

### Vercel / Next.js (`.env.local` locally, Vercel project env in prod)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL (`*.convex.cloud`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |

### Convex (set with `npx convex env set`, **not** in Vercel)

| Variable | Purpose |
| --- | --- |
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk issuer domain — required by `convex/auth.config.ts` for JWT validation |
| `ADMIN_EMAILS` | Optional, comma-separated allowlist consumed by `convex/lib/auth.ts` `requireAdmin`. When unset, any authenticated Clerk identity is treated as admin. |

## Scripts

```bash
npm run dev            # Next.js dev server
npm run build          # production build
npm run type-check     # tsc --noEmit
npm run lint           # eslint
npm run test           # vitest (watch)
npm run test:coverage  # vitest single run + v8 coverage
```

## Deployment

### Backend (Convex)

The backend deploys separately from the web app:

```bash
npx convex deploy      # deploys functions + schema to the Convex prod deployment
```

After provisioning the prod deployment, set its env vars:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://witty-monarch-16.clerk.accounts.dev
npx convex env set ADMIN_EMAILS you@example.com   # optional
```

`convex/_generated/` is committed, so CI builds without running codegen. Regenerate and
commit it (`npx convex codegen`) after changing the schema or function signatures.

### Web (Vercel)

1. Import the GitHub repo (`chuckcatron/gofastboat-v2`) as a Vercel project.
2. Set the three Vercel env vars from the table above (point `NEXT_PUBLIC_CONVEX_URL` at the **prod** Convex deployment).
3. Push to a branch / open a PR → Vercel builds a **preview deployment** reachable over HTTPS on a `*.vercel.app` URL.
4. Merges to `master` deploy to production.

`next.config.ts` allows `*.convex.cloud` via `images.remotePatterns` so `next/image` can render
photos served from Convex storage.

> **Manual / owner steps** (not automated, done once): creating the Vercel project, provisioning the
> Convex prod deployment, entering env vars/secrets in both dashboards, and verifying the first
> `*.vercel.app` preview. DNS / custom-domain cutover is tracked separately (AB#1253).

## Tech Stack

- Next.js 16 (App Router, React 19)
- Convex (database, queries/mutations, file storage)
- Clerk (admin auth; `/admin` is protected via `proxy.ts`)
- Tailwind CSS v4
- Vitest + Testing Library
