import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeInternalRedirect } from "@/lib/safeRedirect";
import type { Database } from "@/lib/database.types";

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

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeInternalRedirect(requestUrl.searchParams.get("next"));
  const rememberConnected =
    request.cookies.get("finync-remember")?.value === "true";
  let response = NextResponse.next({ request });

  if (!code) {
    return NextResponse.redirect(new URL("/recuperar-senha", request.url));
  }

  const supabase = createServerClient<Database>(
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/recuperar-senha", request.url));
  }

  const redirectResponse = NextResponse.redirect(new URL(next, request.url));

  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}
