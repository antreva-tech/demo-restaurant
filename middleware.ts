import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Minimal middleware (no auth import) to stay under Vercel Edge 1 MB limit.
 * /admin and /pos protection is done in their layouts/pages via auth() (Node runtime).
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/pos/:path*"],
};
