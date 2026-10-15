import { NextResponse, type NextRequest } from "next/server";
import { getWorkById } from "@/lib/catalog";

/**
 * A Piece link for an id that is not a catalog work answers 404 before rendering starts. Inside the page,
 * notFound() can lose the race to the streamed shell on a slow container and go out with status 200.
 * Rewriting to a path no route matches serves the app's own 404 page with a 404 status, every time.
 */
export function proxy(request: NextRequest) {
  // Catalog ids are plain ASCII (w-0001), so the raw segment is compared as is; a malformed escape cannot throw.
  if (getWorkById(request.nextUrl.pathname.slice("/piece/".length))) return NextResponse.next();
  return NextResponse.rewrite(new URL("/_no-such-piece", request.url));
}

export const config = { matcher: "/piece/:id" };
