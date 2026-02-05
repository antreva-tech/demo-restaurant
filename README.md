# Demo Restaurant

Multi-tenant web app for **fast food and full-service restaurants**: public menu, online ordering, admin CMS, employee POS (PIN + inactivity logout), sales analytics.  
Stack: Next.js (App Router), TypeScript, Tailwind, Neon Postgres, Prisma. Locale: es-DO, currency DOP.

## Env vars

Copy `.env.example` to `.env.local` and set values. Then run `npm run env:check` to verify.

- **Required:** `DATABASE_URL`, `DIRECT_URL` (Neon), `NEXTAUTH_SECRET` (or `AUTH_SECRET`), `NEXTAUTH_URL`
- **Optional (seed):** `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`
- **Site content (name, tagline, menu path, logo, images, copyright):** edit `src/config/site.json` — not env.
- **Optional (contact):** `NEXT_PUBLIC_WHATSAPP_NUMBER` for the WhatsApp button.
- **Optional (online order notifications):** `NOTIFICATION_EMAIL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — when set, new online orders trigger an email to the business via Resend.

Generate a secret: `openssl rand -base64 32`

## Commands

```bash
npm install
cp .env.example .env.local   # then edit .env.local
npm run env:check            # ensure required vars are set
npm run db:deploy            # migrate + seed
npm run dev
npm run test
npm run build
```

## Routes

- `/` — Home (customer-facing, Spanish, mobile-first; links to menu and contact only; no login/POS)
- `/r/[restaurantSlug]/l/[locationSlug]` — Public menu (browse, add to cart, Spanish)
- `/r/[restaurantSlug]/l/[locationSlug]/checkout` — Checkout (name, phone, notes; creates OPEN order and notifies business if configured)
- `/login` — Admin/owner login (direct URL; not linked from public site)
- `/pos/login` — POS login (direct URL; not linked from public site)
- `/admin` — Admin dashboard (after login)
- `/pos` — POS order builder (after PIN login)

**Demo data:** Seed creates "Restaurante Demo" with slug `demo`, location "Sucursal Principal" (`principal`), an "Online" system user for web orders, multiple menu items with placeholder images, and sample PAID orders. Suited for both quick-service and sit-down concepts. Owner from env; employee 1001 / PIN 1234. Defaults: tax 18%, POS inactivity 15 min.
