import { createServerFn } from "@tanstack/react-start";
import { loadAdapter } from "../lib/storage-adapter";
import type { CreateTokenInput, UpdateTokenInput } from "../lib/types";

export const getTokens = createServerFn({ method: "GET" })
  .handler(async () => {
    const adapter = await loadAdapter();
    return await adapter.getTokens();
  });

export const getToken = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const adapter = await loadAdapter();
    return await adapter.getToken(data);
  });

export const addToken = createServerFn({ method: "POST" })
  .validator((input: CreateTokenInput) => input)
  .handler(async ({ data }) => {
    const adapter = await loadAdapter();
    return await adapter.addToken(data);
  });

export const updateToken = createServerFn({ method: "POST" })
  .validator((input: UpdateTokenInput) => input)
  .handler(async ({ data }) => {
    const adapter = await loadAdapter();
    return await adapter.updateToken(data);
  });

export const deleteToken = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const adapter = await loadAdapter();
    await adapter.deleteToken(data);
  });

export const getSnapshots = createServerFn({ method: "GET" })
  .validator((tokenId: string) => tokenId)
  .handler(async ({ data }) => {
    const adapter = await loadAdapter();
    return await adapter.getSnapshots(data);
  });
