"use client";

import {
  createBrowserClient,
  parseCookieHeader,
  serializeCookieHeader,
  type CookieOptions,
} from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase public environment variables.");
}

const rememberCookieName = "finync-remember";
const thirtyDaysInSeconds = 30 * 24 * 60 * 60;

function isRememberConnectedEnabled() {
  if (typeof document === "undefined") return false;

  return parseCookieHeader(document.cookie).some(
    ({ name, value }) => name === rememberCookieName && value === "true",
  );
}

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

const browserCookieMethods = {
  getAll() {
    if (typeof document === "undefined") return [];

    return parseCookieHeader(document.cookie).map(({ name, value }) => ({
      name,
      value: value ?? "",
    }));
  },
  setAll(
    cookiesToSet: {
      name: string;
      value: string;
      options: CookieOptions;
    }[],
  ) {
    if (typeof document === "undefined") return;

    const rememberConnected = isRememberConnectedEnabled();

    cookiesToSet.forEach(({ name, value, options }) => {
      document.cookie = serializeCookieHeader(
        name,
        value,
        getSessionCookieOptions(options, rememberConnected),
      );
    });
  },
};

export function configureAuthPersistence(rememberConnected: boolean) {
  if (typeof document === "undefined") return;

  document.cookie = serializeCookieHeader(
    rememberCookieName,
    String(rememberConnected),
    rememberConnected
      ? {
          maxAge: thirtyDaysInSeconds,
          path: "/",
          sameSite: "lax",
          secure: window.location.protocol === "https:",
        }
      : {
          path: "/",
          sameSite: "lax",
          secure: window.location.protocol === "https:",
        },
  );
}

function createConfiguredBrowserClient(isSingleton: boolean) {
  return createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    cookies: browserCookieMethods,
    isSingleton,
  });
}

export const supabase = createConfiguredBrowserClient(true);

/* The signed-in user from the locally stored session, refreshed by the
   client when it expires. It avoids a round trip to the auth server on
   every read; row level security still checks the token on each query.
   Writes that need a freshly verified user call auth.getUser() instead. */
export async function getSessionUser() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) return null;

  return session.user;
}
