const DEFAULT_AUTH_REDIRECT = "/dashboard";

export function getSafeInternalRedirect(
  candidate: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT,
) {
  if (!candidate?.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  try {
    const parsedUrl = new URL(candidate, "https://finync.local");

    if (parsedUrl.origin !== "https://finync.local") {
      return fallback;
    }

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return fallback;
  }
}
