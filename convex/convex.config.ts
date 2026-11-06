import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    ATH_SERVICE_SECRET: v.string(),
  },
});

export default app;
