-- AlterEnum
ALTER TYPE "NotificationEvent" ADD VALUE 'APPOINTMENT_CONFIRMED';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "eventDate" DATE,
ADD COLUMN     "eventRole" TEXT,
ADD COLUMN     "piecesNeeded" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- O agendamento pelo site vira pedido: a primeira mensagem passa a ser "recebemos seu pedido".
-- (Só altera se o texto ainda for o padrão; modelos editados pela loja ficam como estão.)
UPDATE "NotificationTemplate"
SET "name" = 'Pedido de agendamento recebido',
    "body" = E'Olá, {nome}! Recebemos seu pedido de atendimento na Sady Roupas.\n\n📅 Data desejada: {data}\n🕐 Horário: {horario}\n📌 Serviço: {servico}\n🔖 Código: {codigo}\n\nVamos confirmar a disponibilidade por aqui em instantes.'
WHERE "event" = 'APPOINTMENT_CREATED'
  AND "body" = E'Olá, {nome}! Seu atendimento na Sady Roupas foi confirmado.\n\n📅 Data: {data}\n🕐 Horário: {horario}\n📌 Serviço: {servico}\n🔖 Código: {codigo}\n\nPara ver, remarcar ou cancelar: {link}\n\nEsperamos você!';
