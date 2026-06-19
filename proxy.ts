import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const thirtyDaysInSeconds = 30 * 24 * 60 * 60;

function getSessionCookieOptions(
  options: CookieOptions,
  rememberConnected: boolean,
) {
  const normalizedOptions = { ...options };

  delete normalizedOptions.maxAge;
  delete normalizedOptions.expires;

  if (options.maxAge === 0) {
    return { ...normalizedOptions, maxAge: 0 };
  }

  return rememberConnected
    ? { ...normalizedOptions, maxAge: thirtyDaysInSeconds }
    : normalizedOptions;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const rememberConnected =
    request.cookies.get("finync-remember")?.value === "true";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(
              name,
              value,
              getSessionCookieOptions(options, rememberConnected),
            );
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";

    const redirectResponse = NextResponse.redirect(loginUrl);

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/configuracoes/:path*"],
};
