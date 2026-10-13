-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- Ponto aproximado (Av. Homero Castelo Branco, São Cristóvão, Teresina). Ajustável em Configurações.
UPDATE "StoreSettings" SET "latitude" = -5.0702, "longitude" = -42.7915 WHERE "latitude" IS NULL;
