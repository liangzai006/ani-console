import createClient from "openapi-fetch";
import type { paths } from "./services-schema";
import { authMiddleware } from "./client";

export const SERVICES_API_BASE = "/api/v1/svc";
export const servicesApi = createClient<paths>({
  baseUrl: SERVICES_API_BASE,
  credentials: "include",
});

servicesApi.use(authMiddleware);
