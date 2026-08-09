import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loadAdapter } from "../lib/storage-adapter";
import type { RevealResult, TotpSetupResult } from "./storage-adapter";
import type {
  CreateTokenInput,
  Token,
  TokenWithUsage,
  UpdateTokenInput,
  UsageSnapshot,
} from "../lib/types";

const isDemo = process.env.APP_MODE === "demo";

async function getServerFns() {
  return await import("../server/tokens");
}

export function useTokens() {
  return useQuery({
    queryKey: ["tokens"],
    queryFn: async (): Promise<Token[]> => {
      if (isDemo) {
        const adapter = await loadAdapter();
        return await adapter.getTokens();
      }
      const fns = await getServerFns();
      return (await fns.getTokens()) as Token[];
    },
  });
}

export function useToken(id: string | undefined) {
  return useQuery({
    queryKey: ["token", id],
    queryFn: async (): Promise<TokenWithUsage | null> => {
      if (!id) return null;
      if (isDemo) {
        const adapter = await loadAdapter();
        return await adapter.getToken(id);
      }
      const fns = await getServerFns();
      return (await fns.getToken({ data: id })) as TokenWithUsage | null;
    },
    enabled: !!id,
  });
}

export function useAddToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTokenInput): Promise<Token> => {
      if (isDemo) {
        const adapter = await loadAdapter();
        return await adapter.addToken(input);
      }
      const fns = await getServerFns();
      return (await fns.addToken({ data: input })) as Token;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tokens"] }),
  });
}

export function useUpdateToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateTokenInput): Promise<Token> => {
      if (isDemo) {
        const adapter = await loadAdapter();
        return await adapter.updateToken(input);
      }
      const fns = await getServerFns();
      return (await fns.updateToken({ data: input })) as Token;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["tokens"] });
      qc.invalidateQueries({ queryKey: ["token", vars.id] });
    },
  });
}

export function useDeleteToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (isDemo) {
        const adapter = await loadAdapter();
        return await adapter.deleteToken(id);
      }
      const fns = await getServerFns();
      return (await fns.deleteToken({ data: id })) as void;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tokens"] }),
  });
}

export function useSnapshots(tokenId: string | undefined) {
  return useQuery({
    queryKey: ["snapshots", tokenId],
    queryFn: async (): Promise<UsageSnapshot[]> => {
      if (!tokenId) return [];
      if (isDemo) {
        const adapter = await loadAdapter();
        return await adapter.getSnapshots(tokenId);
      }
      const fns = await getServerFns();
      return (await fns.getSnapshots({ data: tokenId })) as UsageSnapshot[];
    },
    enabled: !!tokenId,
  });
}

export function useRevealToken() {
  return useMutation({
    mutationFn: async (input: { tokenId: string; revealSecret: string; code?: string }): Promise<RevealResult> => {
      if (isDemo) {
        const adapter = await loadAdapter();
        return await adapter.revealToken(input.tokenId, input.revealSecret, input.code);
      }
      const fns = await getServerFns();
      return (await fns.revealToken({ data: input })) as RevealResult;
    },
  });
}

export function useSetupTotp() {
  return useMutation({
    mutationFn: async (tokenId: string): Promise<TotpSetupResult> => {
      if (isDemo) {
        const adapter = await loadAdapter();
        return await adapter.setupTotp(tokenId);
      }
      const fns = await getServerFns();
      return (await fns.setupTotp({ data: tokenId })) as TotpSetupResult;
    },
  });
}

export function useEnableTotp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { tokenId: string; secret: string; code: string }): Promise<RevealResult> => {
      if (isDemo) {
        const adapter = await loadAdapter();
        return await adapter.enableTotp(input.tokenId, input.secret, input.code);
      }
      const fns = await getServerFns();
      return (await fns.enableTotp({ data: input })) as RevealResult;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["token", vars.tokenId] });
      qc.invalidateQueries({ queryKey: ["tokens"] });
    },
  });
}

export function useDisableTotp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tokenId: string): Promise<RevealResult> => {
      if (isDemo) {
        const adapter = await loadAdapter();
        return await adapter.disableTotp(tokenId);
      }
      const fns = await getServerFns();
      return (await fns.disableTotp({ data: tokenId })) as RevealResult;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["token", vars] });
      qc.invalidateQueries({ queryKey: ["tokens"] });
    },
  });
}

export function useAddSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { tokenId: string; tokensUsed: number; cost: number }): Promise<UsageSnapshot> => {
      if (isDemo) {
        const adapter = await loadAdapter();
        return await adapter.addSnapshot(input.tokenId, {
          tokensUsed: input.tokensUsed,
          cost: input.cost,
          model: null,
        });
      }
      const fns = await getServerFns();
      return (await fns.addSnapshot({ data: input })) as UsageSnapshot;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["token", vars.tokenId] });
      qc.invalidateQueries({ queryKey: ["tokens"] });
    },
  });
}
