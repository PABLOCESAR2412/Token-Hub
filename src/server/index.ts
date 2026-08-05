import { createServerFn } from "@tanstack/start";
import { storage } from "../lib/storage-adapter";

// Server function that will only be executed on the server in production mode.
export const fetchTokens = createServerFn("GET", async () => {
  if (process.env.APP_STORAGE !== "supabase") {
    throw new Error("Server functions should only be called in supabase/production mode.");
  }
  
  // This calls the unified adapter interface, which will route to supabase.ts 
  // because APP_STORAGE is 'supabase' in this context.
  return await storage.getTokens();
});
