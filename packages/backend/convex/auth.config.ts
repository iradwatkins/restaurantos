/**
 * Convex Auth Configuration for RestaurantOS
 *
 * Accepts custom JWT tokens issued by the admin and portal Next.js apps.
 * Each app issues tokens signed with RS256 and serves its public key at /.well-known/jwks.json
 */

export default {
  providers: [
    // Production - Admin dashboard
    {
      type: "customJwt" as const,
      issuer: "https://admin.restaurantos.app",
      jwks: "https://admin.restaurantos.app/.well-known/jwks.json",
      algorithm: "RS256" as const,
      applicationID: "convex",
    },
    // Production - Portal (wildcard subdomains)
    {
      type: "customJwt" as const,
      issuer: "https://restaurantos.app",
      jwks: "https://restaurantos.app/.well-known/jwks.json",
      algorithm: "RS256" as const,
      applicationID: "convex",
    },
    // Development - Admin (port 3005)
    {
      type: "customJwt" as const,
      issuer: "http://localhost:3005",
      jwks: "http://localhost:3005/.well-known/jwks.json",
      algorithm: "RS256" as const,
      applicationID: "convex",
    },
    // Development - Portal (port 3006)
    {
      type: "customJwt" as const,
      issuer: "http://localhost:3006",
      jwks: "http://localhost:3006/.well-known/jwks.json",
      algorithm: "RS256" as const,
      applicationID: "convex",
    },
  ],
};
