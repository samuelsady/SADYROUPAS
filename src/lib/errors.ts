/** Erro de regra de negócio com status HTTP e mensagem segura para o usuário. */
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (what = "Registro") => new AppError(404, `${what} não encontrado.`, "NOT_FOUND");
export const forbidden = () => new AppError(403, "Sem permissão para esta ação.", "FORBIDDEN");
export const unauthorized = () => new AppError(401, "Não autenticado.", "UNAUTHORIZED");
export const conflict = (message: string) => new AppError(409, message, "CONFLICT");
export const badRequest = (message: string) => new AppError(400, message, "BAD_REQUEST");
