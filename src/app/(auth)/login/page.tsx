import { redirect } from "next/navigation";

/**
 * Main login entry: redirect to POS login (Caja).
 * Admin login is at /login/admin.
 */
export default function LoginPage() {
  redirect("/pos/login");
}
