import { hashRevealSecret, verifyRevealSecret } from "./reveal";
import { verifyTotp } from "./totp";

export const DEFAULT_PASSWORD = "admin123";

function getConvexUrl(): string {
  return (
    process.env.PROYECT_CONVEX_URL ||
    process.env.PROJECT_CONVEX_URL ||
    process.env.VITE_CONVEX_URL ||
    process.env.CONVEX_URL ||
    "http://127.0.0.1:3210"
  );
}

function isConvexMode(): boolean {
  return (
    process.env.APP_STORAGE === "convex" ||
    (!process.env.APP_STORAGE &&
      !!(
        process.env.PROYECT_CONVEX_URL ||
        process.env.PROJECT_CONVEX_URL ||
        process.env.CONVEX_URL ||
        process.env.VITE_CONVEX_URL
      ))
  );
}

async function getConvex() {
  const { ConvexHttpClient } = await import("convex/browser");
  const { api } = await import("../../convex/_generated/api");
  const url = getConvexUrl();
  return { client: new ConvexHttpClient(url), api };
}

let prismaClientInstance: any = null;
async function getPrisma() {
  if (!prismaClientInstance) {
    const { PrismaClient } = await import("@prisma/client");
    prismaClientInstance = new PrismaClient();
  }
  return prismaClientInstance;
}

/**
 * Seeds the AuthConfig row with the default password the first time.
 * The user is forced to change it before using the app (mustChangePassword=true).
 */
async function ensureAuthRow(): Promise<string> {
  const hash = await hashRevealSecret(DEFAULT_PASSWORD);

  if (isConvexMode()) {
    const { client, api } = await getConvex();
    const row = await client.mutation(api.auth.ensureAuthRow, { defaultHash: hash });
    return row.passwordHash;
  }

  const prisma = await getPrisma();
  let row = await prisma.authConfig.findUnique({ where: { id: "owner" } });

  if (!row) {
    row = await prisma.authConfig.create({
      data: { id: "owner", passwordHash: hash, mustChangePassword: true },
    });
  }

  // The migration inserts a placeholder hash; backfill it lazily on first use.
  if (row.passwordHash === "pending") {
    row = await prisma.authConfig.update({
      where: { id: "owner" },
      data: { passwordHash: hash, mustChangePassword: true },
    });
  }

  return row.passwordHash;
}

export async function getAuthState(): Promise<{ mustChangePassword: boolean }> {
  if (isConvexMode()) {
    const { client, api } = await getConvex();
    const row = await client.query(api.auth.getAuthConfig);
    if (!row) return { mustChangePassword: true };
    if (row.passwordHash === "pending") return { mustChangePassword: true };
    return { mustChangePassword: row.mustChangePassword };
  }

  const prisma = await getPrisma();
  const row = await prisma.authConfig.findUnique({ where: { id: "owner" } });
  if (!row) return { mustChangePassword: true };
  if (row.passwordHash === "pending") return { mustChangePassword: true };
  return { mustChangePassword: row.mustChangePassword };
}

export async function verifyOwnerPassword(password: string): Promise<boolean> {
  if (!password) return false;
  if (process.env.AUTH_PASSWORD && password === process.env.AUTH_PASSWORD) {
    return true;
  }
  const hash = await ensureAuthRow();
  return await verifyRevealSecret(password, hash);
}

export async function changeOwnerPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  if (!(await verifyOwnerPassword(currentPassword))) {
    return { ok: false, error: "// Contraseña actual incorrecta" };
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return { ok: false, error: "// La nueva contraseña debe tener al menos 8 caracteres" };
  }
  if (newPassword === currentPassword) {
    return { ok: false, error: "// Debe ser distinta a la actual" };
  }
  await setOwnerPassword(newPassword);
  return { ok: true };
}

export async function getTotpEnabled(): Promise<boolean> {
  if (isConvexMode()) {
    const { client, api } = await getConvex();
    const row = await client.query(api.auth.getAuthConfig);
    return !!row?.totpSecret;
  }

  const prisma = await getPrisma();
  const row = await prisma.authConfig.findUnique({ where: { id: "owner" } });
  return !!row?.totpSecret;
}

export async function verifyOwnerTotp(code: string): Promise<boolean> {
  if (isConvexMode()) {
    const { client, api } = await getConvex();
    const row = await client.query(api.auth.getAuthConfig);
    if (!row?.totpSecret) return false;
    return await verifyTotp(row.totpSecret, code);
  }

  const prisma = await getPrisma();
  const row = await prisma.authConfig.findUnique({ where: { id: "owner" } });
  if (!row?.totpSecret) return false;
  return await verifyTotp(row.totpSecret, code);
}

/** Sets a new owner password (used by both normal and recovery flows). */
export async function setOwnerPassword(newPassword: string): Promise<{ ok: boolean; error?: string }> {
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return { ok: false, error: "// La nueva contraseña debe tener al menos 8 caracteres" };
  }
  const passwordHash = await hashRevealSecret(newPassword);

  if (isConvexMode()) {
    const { client, api } = await getConvex();
    const current = await client.query(api.auth.getAuthConfig);
    await client.mutation(api.auth.setAuthConfig, {
      passwordHash,
      mustChangePassword: false,
      totpSecret: current?.totpSecret,
    });
    return { ok: true };
  }

  const prisma = await getPrisma();
  await prisma.authConfig.update({
    where: { id: "owner" },
    data: { passwordHash, mustChangePassword: false },
  });
  return { ok: true };
}