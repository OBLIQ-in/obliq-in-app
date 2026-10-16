import { Auth0Client } from "@auth0/nextjs-auth0/server";

let client: Auth0Client | undefined;

// Created on first use, because the SDK logs errors when its environment
// variables are missing. Only call this when isAuthEnabled() is true.
// It reads AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET
// and APP_BASE_URL.
export function getAuth0() {
  client ??= new Auth0Client();
  return client;
}
