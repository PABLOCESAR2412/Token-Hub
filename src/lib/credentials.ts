import { hashRevealSecret, verifyRevealSecret } from "./reveal";
import { verifyTotp } from "./totp";

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
  const serviceSecret = process.env.ATH_SERVICE_SECRET?.trim();
  if (!serviceSecret) {
    throw new Error("ATH_SERVICE_SECRET debe configurarse en el servidor de la aplicación.");
  }

  const rawClient = new ConvexHttpClient(url);
  const client = {
    query: (reference: any, args: any = {}) =>
      rawClient.query(reference, { ...args, serviceSecret }),
    mutation: (reference: any, args: any = {}) =>
      rawClient.mutation(reference, { ...args, serviceSecret }),
  };
  return { client, api };
}

let prismaClientInstance: any = null;
async function getPrisma() {
  if (!prismaClientInstance) {
    const { PrismaClient } = await import("@prisma/client");
    prismaClientInstance = new PrismaClient();
  }
  return prismaClientInstance;
}

function getBootstrapPassword(): string {
  const password = process.env.AUTH_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("AUTH_PASSWORD must be configured (at least 8 characters) before owner authentication can be initialized.");
  }
  return password;
}

/** Initializes or repairs an unclaimed owner password from server configuration. */
async function ensureAuthRow(): Promise<string> {
  if (isConvexMode()) {
    const { client, api } = await getConvex();
    const existing = await client.query(api.auth.getAuthConfig);
    if (existing && existing.passwordHash !== "pending" && !existing.mustChangePassword) {
      return existing.passwordHash;
    }

    const hash = await hashRevealSecret(getBootstrapPassword());
    const row = await client.mutation(api.auth.ensureAuthRow, { defaultHash: hash });
    return row.passwordHash;
  }

  const prisma = await getPrisma();
  let row = await prisma.authConfig.findUnique({ where: { id: "owner" } });

  if (!row) {
    const hash = await hashRevealSecret(getBootstrapPassword());
    row = await prisma.authConfig.create({
      data: { id: "owner", passwordHash: hash, mustChangePassword: true },
    });
  }

  // Bootstrap rows (including old placeholder rows) use server configuration,
  // so no password embedded in the source can remain active.
  if (row.passwordHash === "pending" || row.mustChangePassword) {
    const hash = await hashRevealSecret(getBootstrapPassword());
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
