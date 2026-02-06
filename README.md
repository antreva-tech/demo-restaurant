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
- **Payment integrations (admin Pagos e Integraciones):** `ENCRYPTION_KEY` — 64 hex chars (32 bytes). Used to encrypt integration secrets (CardNET/AZUL) in DB. Generate: `openssl rand -hex 32`. If set, seed creates a **Manual Terminal** integration so POS shows "Tarjeta (Terminal)" out of the box.

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
- `/admin/pagos` — Pagos e Integraciones (configure Card Link/QR, Terminal; allow Efectivo/Transferencia/Tarjeta)
- `/pos` — POS order builder (after PIN login; dynamic payment options: Efectivo, Transferencia, Tarjeta Link/QR, Tarjeta Terminal)

## Demo data

Seed creates **Restaurante Demo** with slug `demo`, location **Sucursal Principal** (`principal`), an **Online** system user for web orders, multiple menu items (placeholder images unless Blob configured), and sample PAID orders. Suited for quick-service and sit-down concepts.

- **Owner:** from `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` (defaults in `.env.example`).
- **Employee:** number `1001`, PIN `1234`.
- **Defaults:** tax 18%, POS inactivity 15 min. Orders get sequential `orderNumber` per restaurant (e.g. #1, #2).
- **Payment:** With `ENCRYPTION_KEY` set, seed creates one **Manual Terminal** integration (enabled). POS then shows "Tarjeta (Terminal)" for manual approval-code capture. Configure Card Link (CardNET/AZUL) in Admin → Pagos e Integraciones to enable "Tarjeta (Link/QR)".

## Payment integrations (card) setup

Configure how the POS collects card payments: **Terminal** (manual approval code) and/or **Link/QR** (hosted checkout). No card data (PAN/CVV) is ever stored; link payments use the provider’s page; terminal flow only stores approval code and optional last 4 digits.

### 1. Prerequisites

- Set **ENCRYPTION_KEY** in `.env.local` (64 hex chars). Generate: `openssl rand -hex 32`. Required to save integration secrets.
- Run migrate + seed so the payment tables and (optionally) the default Manual Terminal integration exist.

### 2. Admin → Pagos e Integraciones

- Go to **Admin** (owner/manager login) → **Pagos e Integraciones**.
- **Payment channel toggles** are in **Configuración**: enable/disable “Permitir Efectivo”, “Permitir Transferencia”, “Permitir Tarjeta”. These control which options appear in the POS.

### 3. Add or edit an integration

- Click **Agregar integración** (or **Editar** on a row).
- **Nombre** — Label (e.g. “Terminal manual”, “CardNET Link”).
- **Tipo** — **Terminal** (manual approval / physical device) or **Link/QR** (hosted checkout, QR or link in POS).
- **Proveedor** — **Manual**, **CardNET**, or **AZUL**.
- **Alcance** — **Global** (all locations) or **Ubicación específica** (pick one).
- **Activo** — Only active integrations are offered in the POS.

### 4. Manual Terminal (works out of the box)

- **Tipo:** Terminal · **Proveedor:** Manual.
- No API keys. Optional **Etiqueta** only.
- In POS, when the cashier chooses **Tarjeta (Terminal)**, the order is created and a form appears: **Monto a cobrar**, **Código de aprobación** (required), **Últimos 4 dígitos** (optional). They enter the code from their existing terminal and confirm. Order is marked PAID and appears in analytics as CARD.

### 5. Card Link / QR (CardNET or AZUL)

- **Tipo:** Link/QR · **Proveedor:** CardNET or AZUL.
- Configure: **Environment** (sandbox/production), **Merchant ID**, **API Key**, **Secret Key**, **Callback URL** and **Webhook secret** if the provider requires them. Secrets are stored encrypted; on edit they appear masked unless you use “Reemplazar secreto”.
- **Current status:** The CardNET and AZUL connectors are **scaffolds**. Without real API credentials and provider docs, **Tarjeta (Link/QR)** in POS will show “Integración configurada pero el conector del proveedor aún no está activo” and offer **Registrar pago manualmente (Tarjeta)** to complete the order via the Manual Terminal flow (same order, approval code).
- When the provider APIs are implemented: POS will create a payment link, show a QR and “Copiar enlace”, and **Revisar pago** will poll or you can rely on webhooks to mark the order PAID.

### 6. Webhooks (for Link providers)

- If the provider sends payment events, use:  
  `POST https://your-domain.com/api/webhooks/cardnet` or `/api/webhooks/azul`.  
- Configure this URL and the webhook secret in the provider’s dashboard and in the integration (Webhook secret). The route verifies the payload and, on success, marks the Payment and Order as PAID. If the adapter does not implement webhooks yet, the route returns 501.

### 7. What appears in POS

- **Efectivo** — If “Permitir Efectivo” is on.
- **Transferencia** — If “Permitir Transferencia” is on; optional reference, then confirm.
- **Tarjeta (Link/QR)** — If at least one **active** Link/QR integration exists for that location (or global).
- **Tarjeta (Terminal)** — If at least one **active** Terminal integration exists (e.g. Manual or future CardNET/AZUL terminal).

Integrations can be **global** or **per location**; location-specific overrides global when both apply.
