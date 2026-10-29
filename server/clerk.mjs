// The Clerk session check: the browser's bearer must be a valid session token from Hoy's Clerk instance,
// issued to one of Hoy's own origins (authorizedParties). Company OS checks the same token again and maps
// it to a member; this check only keeps anonymous and forged traffic off the private network.
import { verifyToken } from '@clerk/backend';

/** @param {import('./config.mjs').ServerConfig} config */
export function clerkSessionVerifier(config) {
  const options = {
    secretKey: config.clerkSecretKey,
    // With the instance's PEM public key the check needs no network call; without it Clerk's JWKS is fetched and cached.
    jwtKey: config.clerkJwtKey,
    authorizedParties: config.authorizedParties.length ? config.authorizedParties : undefined,
  };
  return async (token) => {
    if (!token) throw new Error('no token');
    const claims = await verifyToken(token, options);
    if (!claims?.sub) throw new Error('token has no subject');
    // A pending session (e.g. a sign-up still finishing a required step) is not signed in yet.
    if (claims.sts === 'pending') throw new Error('session is pending');
    return { userId: claims.sub };
  };
}
