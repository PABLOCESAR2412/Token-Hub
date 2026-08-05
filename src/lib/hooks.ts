import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loadAdapter } from "../lib/storage-adapter";
import type { CreateTokenInput, UpdateTokenInput } from "../lib/types";
import * as fns from "../server/tokens";

const isDemo = process.env.APP_MODE === "demo";

export function useTokens() {
  return useQuery({
    queryKey: ["tokens"],
    queryFn: async () => {
      if (isDemo) {
        const adapter = await loadAdapter();
        return await adapter.getTokens();
      }
      return await fns.getTokens();
    },
  });
}

export function useToken(id: string | undefined) {
  return useQuery({
    queryKey: ["token", id],
    queryFn: async () => {
      if (!id) return null;
      if (isDemo) {
        const adapter = await loadAdapter();
        return await adapter.getToken(id);
      }
      return await fns.getToken({ data: id });
    },
    enabled: !!id,
  });
}

export function useAddToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTokenInput) => {
      if (isDemo) {
        const adapter = await loadAdapter();
        return await adapter.addToken(input);
      }
      return await fns.addToken({ data: input });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tokens"] }),
  });
}

export function useUpdateToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateTokenInput) => {
      if (isDemo) {
        const adapter = await loadAdapter();
        return await adapter.updateToken(input);
      }
      return await fns.updateToken({ data: input });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tokens"] }),
  });
}

export function useDeleteToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemo) {
        const adapter = await loadAdapter();
        return await adapter.deleteToken(id);
      }
      return await fns.deleteToken({ data: id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tokens"] }),
  });
}

export function useSnapshots(tokenId: string | undefined) {
  return useQuery({
    queryKey: ["snapshots", tokenId],
    queryFn: async () => {
      if (!tokenId) return [];
      if (isDemo) {
        const adapter = await loadAdapter();
        return await adapter.getSnapshots(tokenId);
      }
      return await fns.getSnapshots({ data: tokenId });
    },
    enabled: !!tokenId,
  });
}
