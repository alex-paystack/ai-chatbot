import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("chat", "routes/chat.tsx"),
  route("api/chat", "routes/api.chat.ts"),
  route("api/feedback", "routes/api.feedback.ts"),
] satisfies RouteConfig;
