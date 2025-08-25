import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/login", "routes/login.tsx"),
  route("/register", "routes/register.tsx"),
  route("/pending-approval", "routes/pending-approval.tsx"),
  route("/unauthorized", "routes/unauthorized.tsx"),
  
  // BetterAuth API routes
  route("/api/auth/*", "routes/api/auth.$.ts"),
  
  // Webhook routes
  route("/api/webhooks", "routes/api/webhooks.ts"),
] satisfies RouteConfig;
