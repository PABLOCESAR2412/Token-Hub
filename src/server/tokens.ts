import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { loadAdapter } from "../lib/storage-adapter";
import { isAuthorized, unauthorized } from "../lib/auth";
import type { CreateTokenInput, UpdateTokenInput } from "../lib/types";

export const unauthorizedResponse = unauthorized;

export const getTokens = createServerFn({ method: "GET" })
  .handler(async () => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.getTokens();
  });

export const setTokenActive = createServerFn({ method: "POST" })
  .validator((input: { id: string; active: boolean }) => input)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.setTokenActive(data.id, data.active);
  });

export const getAuditLog = createServerFn({ method: "GET" })
  .validator((tokenId?: string) => tokenId)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.getAuditLog(data);
  });

export const getToken = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.getToken(data);
  });

export const addToken = createServerFn({ method: "POST" })
  .validator((input: CreateTokenInput) => input)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.addToken(data);
  });

export const updateToken = createServerFn({ method: "POST" })
  .validator((input: UpdateTokenInput & { code?: string }) => input)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.updateToken(data as UpdateTokenInput, data.code);
  });

export const deleteToken = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    await adapter.deleteToken(data);
  });

export const getSnapshots = createServerFn({ method: "GET" })
  .validator((tokenId: string) => tokenId)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.getSnapshots(data);
  });

export const revealToken = createServerFn({ method: "POST" })
  .validator(
    (input: { tokenId: string; revealSecret: string; code?: string }) => input
  )
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.revealToken(data.tokenId, data.revealSecret, data.code);
  });

export const getTotpStatus = createServerFn({ method: "GET" })
  .handler(async () => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.getTotpStatus();
  });

export const setupTotp = createServerFn({ method: "POST" })
  .handler(async () => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.setupTotp();
  });

export const enableTotp = createServerFn({ method: "POST" })
  .validator(
    (input: { secret: string; code: string }) => input
  )
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.enableTotp(data.secret, data.code);
  });

export const disableTotp = createServerFn({ method: "POST" })
  .handler(async () => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.disableTotp();
  });

export const verifyTotpCode = createServerFn({ method: "POST" })
  .validator((code: string) => code)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.verifyTotpCode(data);
  });

export const addSnapshot = createServerFn({ method: "POST" })
  .validator(
    (input: { tokenId: string; tokensUsed: number; cost: number; model?: string; inputTokens?: number; outputTokens?: number }) => input
  )
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.addSnapshot(data.tokenId, {
      tokensUsed: data.tokensUsed,
      cost: data.cost,
      model: data.model ?? null,
      inputTokens: data.inputTokens ?? 0,
      outputTokens: data.outputTokens ?? 0,
    });
  });