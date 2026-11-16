/** Sign-in is on for the hosted beta; off for local self-hosting (matches the API's AUTH_MODE). */
export const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
