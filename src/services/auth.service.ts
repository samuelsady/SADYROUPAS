import "server-only";
import bcrypt from "bcryptjs";
import { db } from "@/database/client";
import { signSession } from "@/lib/auth/jwt";
import { AppError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/schemas";
import { AuditService } from "./audit.service";

export const BCRYPT_COST = 12;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
// Hash fixo para comparar mesmo quando o e-mail não existe (tempo de resposta constante)
const DUMMY_HASH = "$2b$12$/K8sVUPsHVRKOwDIiBO68.xGJWP8FB1WQ7/oW4j4FELbx66VOLrE.";

const INVALID = "E-mail ou senha incorretos.";

export const AuthService = {
  async login(raw: unknown, ip: string) {
    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) throw new AppError(400, INVALID);
    const { email, password } = parsed.data;

    await enforceRateLimit(`login:ip:${ip}`, 20, 15 * 60);
    await enforceRateLimit(`login:email:${email}`, 10, 15 * 60);

    const user = await db.user.findUnique({ where: { email } });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !user.active) throw new AppError(401, INVALID);
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(423, "Acesso temporariamente bloqueado por tentativas incorretas. Tente novamente em alguns minutos.");
    }
    if (!ok) {
      const failed = user.failedLogins + 1;
      await db.user.update({
        where: { id: user.id },
        data: { failedLogins: failed, lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null },
      });
      await AuditService.log({ userId: user.id, label: user.name, ip }, { action: "auth.login_failed", entity: "User", entityId: user.id, summary: "Senha incorreta" });
      throw new AppError(401, INVALID);
    }

    await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
    await AuditService.log({ userId: user.id, label: user.name, ip }, { action: "auth.login", entity: "User", entityId: user.id, summary: "Login no painel" });
    return signSession({ sub: user.id, name: user.name, role: user.role });
  },

  hashPassword(password: string) {
    return bcrypt.hash(password, BCRYPT_COST);
  },
};
