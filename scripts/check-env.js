/**
 * Validates that required env vars are set. Run with: npm run env:check
 * (uses dotenv -e .env.local so vars are loaded before this runs)
 */
const required = ["DATABASE_URL", "DIRECT_URL", "NEXTAUTH_URL"];
const hasAuthSecret =
  process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
const missing = required.filter((k) => !process.env[k]?.trim());
if (!hasAuthSecret) missing.push("NEXTAUTH_SECRET or AUTH_SECRET");
if (missing.length) {
  console.error("Missing in .env.local:", missing.join(", "));
  console.error("Copy .env.example to .env.local and set these (see README).");
  process.exit(1);
}
console.log("Env OK — required vars set in .env.local");
