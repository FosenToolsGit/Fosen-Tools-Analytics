import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname.startsWith("/login");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");

  // Public share-ruter — UniFi-skjermer og lignende kan ikke logge inn.
  // Token-basert tilgang (uuid i URL) er eneste gate.
  const isPublicShare =
    request.nextUrl.pathname.startsWith("/prisplakat/share/") ||
    request.nextUrl.pathname.startsWith("/skjerm/") ||
    request.nextUrl.pathname.startsWith("/jubileum-kamera");

  // Allow API routes through (they handle their own auth)
  if (isApiRoute) {
    return supabaseResponse;
  }

  // Allow public share-ruter (skjermavspillere)
  if (isPublicShare) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login
  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
