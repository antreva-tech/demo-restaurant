# Demo Restaurant

Multi-tenant web app for **fast food and full-service restaurants**: public menu, online ordering, admin CMS, employee POS (PIN + inactivity logout), sales analytics.  
Stack: Next.js (App Router), TypeScript, Tailwind, Neon Postgres, Prisma. Locale: es-DO, currency DOP.

## Tech stack

- **Next.js** 16 (App Router), **React** 19, **TypeScript** 5
- **Tailwind CSS** 3, **Prisma** 6, **Neon** Postgres
- **NextAuth** 5 (beta), **Recharts**, **SWR**, **Zod**, **React Hook Form**
- Optional: **Resend** (order email), **Twilio** (WhatsApp order alerts), **Vercel Blob** (menu images)

## Env vars

Copy `.env.example` to `.env.local` and set values. Then run `npm run env:check` to verify.

- **Required:** `DATABASE_URL`, `DIRECT_URL` (Neon), `NEXTAUTH_SECRET` or `AUTH_SECRET`, `NEXTAUTH_URL`
- **Optional (seed):** `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`
- **Site content (name, tagline, menu path, logo, images, copyright):** edit `src/config/site.json` — not env.
- **Optional (contact):** `NEXT_PUBLIC_WHATSAPP_NUMBER` — WhatsApp button on site (E.164, e.g. `18095551234`).
- **Optional (online order email):** `NOTIFICATION_EMAIL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — new online orders trigger email via Resend.
- **Optional (online order WhatsApp):** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `NOTIFICATION_WHATSAPP_TO` — order summary to restaurant.
- **Optional (menu images):** `BLOB_READ_WRITE_TOKEN` — Vercel Blob store for item images.

Generate a secret: `openssl rand -base64 32`

## Commands

```bash
npm install
cp .env.example .env.local   # then edit .env.local
npm run env:check            # ensure required vars are set
npm run db:deploy            # migrate + seed
npm run dev
npm run typecheck            # TypeScript check
npm run test
npm run build
```

## Routes

- `/` — Home (customer-facing, Spanish, mobile-first; links to menu and contact only; no login/POS)
- `/r/[restaurantSlug]/l/[locationSlug]` — Public menu (browse, add to cart, Spanish)
- `/r/[restaurantSlug]/l/[locationSlug]/checkout` — Checkout (name, phone, notes; creates OPEN order with per-restaurant order number; notifies business if email/WhatsApp configured)
- `/login` — Admin/owner login (direct URL; not linked from public site)
- `/pos/login` — POS login (direct URL; not linked from public site)
- `/admin` — Admin dashboard (after login)
- `/pos` — POS order builder (after PIN login)

## Demo data

Seed creates **Restaurante Demo** with slug `demo`, location **Sucursal Principal** (`principal`), an **Online** system user for web orders, multiple menu items (placeholder images unless Blob configured), and sample PAID orders. Suited for quick-service and sit-down concepts.

- **Owner:** from `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` (defaults in `.env.example`).
- **Employee:** number `1001`, PIN `1234`.
- **Defaults:** tax 18%, POS inactivity 15 min. Orders get sequential `orderNumber` per restaurant (e.g. #1, #2).
