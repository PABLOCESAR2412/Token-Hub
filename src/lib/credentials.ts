import { PrismaClient } from "@prisma/client";
import { hashRevealSecret, verifyRevealSecret } from "./reveal";
import { verifyTotp } from "./totp";

export const DEFAULT_PASSWORD = "admin123";

const prisma = new PrismaClient();

/**
 * Seeds the AuthConfig row with the default password the first time.
 * The user is forced to change it before using the app (mustChangePassword=true).
 */
async function ensureAuthRow(): Promise<string> {
  let row = await prisma.authConfig.findUnique({ where: { id: "owner" } });

  const hash = await hashRevealSecret(DEFAULT_PASSWORD);

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

export async function changeOwnerPassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
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
  const row = await prisma.authConfig.findUnique({ where: { id: "owner" } });
  return !!row?.totpSecret;
}

export async function verifyOwnerTotp(code: string): Promise<boolean> {
  const row = await prisma.authConfig.findUnique({ where: { id: "owner" } });
  if (!row?.totpSecret) return false;
  return await verifyTotp(row.totpSecret, code);
}

/** Sets a new owner password (used by both normal and recovery flows). */
export async function setOwnerPassword(newPassword: string): Promise<{ ok: boolean; error?: string }> {
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return { ok: false, error: "// La nueva contraseña debe tener al menos 8 caracteres" };
  }
  await prisma.authConfig.update({
    where: { id: "owner" },
    data: { passwordHash: await hashRevealSecret(newPassword), mustChangePassword: false },
  });
  return { ok: true };
}