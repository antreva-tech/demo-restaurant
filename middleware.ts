import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  const isPos = pathname.startsWith("/pos");
  const isPosLogin = pathname === "/pos/login";
  const session = req.auth;

  if (isAdmin && !session?.user) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return Response.redirect(url);
  }

  if (isPos && !isPosLogin && !session?.user) {
    return Response.redirect(new URL("/pos/login", req.url));
  }

  return undefined;
});

export const config = {
  matcher: ["/admin/:path*", "/pos/:path*"],
};
