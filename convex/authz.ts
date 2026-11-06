import { env } from "./_generated/server";

export function requireServiceSecret(provided: string): void {
  const expected = (env as typeof env & { ATH_SERVICE_SECRET?: string }).ATH_SERVICE_SECRET;
  if (!expected || !provided || expected.length !== provided.length) {
    throw new Error("Unauthorized");
  }

  let difference = 0;
  for (let i = 0; i < expected.length; i++) {
    difference |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }

  if (difference !== 0) throw new Error("Unauthorized");
}
