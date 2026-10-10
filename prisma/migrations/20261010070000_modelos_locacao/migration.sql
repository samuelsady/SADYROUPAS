-- Atualiza os modelos de mensagem de locação que ainda estão com o texto padrão antigo
-- (modelos editados pela loja não são alterados).
UPDATE "NotificationTemplate"
SET "name" = 'Locação confirmada',
    "body" = E'Olá, {nome}! Sua locação {numero} na Sady Roupas está confirmada. ✅\n\n📦 {entrega} em {retirada}\n🔁 Devolução: {devolucao}\n👔 Peças: {pecas}\n\nQualquer dúvida, é só responder esta mensagem.',
    "waParams" = ARRAY['nome', 'numero', 'retirada', 'devolucao']
WHERE "event" = 'RENTAL_CONFIRMED'
  AND "body" = 'Olá, {nome}! Sua locação na Sady Roupas está confirmada. Retirada: {data}.';

UPDATE "NotificationTemplate" SET "name" = 'Devolução atrasada' WHERE "event" = 'RETURN_OVERDUE' AND "name" = 'Devolução atrasada (V2)';
UPDATE "NotificationTemplate" SET "name" = 'Locação confirmada' WHERE "event" = 'RENTAL_CONFIRMED' AND "name" = 'Locação confirmada (V2)';
