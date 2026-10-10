-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "occasions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Preenche as ocasiões dos produtos já cadastrados (a equipe pode ajustar no painel)
UPDATE "Product" p SET "occasions" = ARRAY['formatura']
  FROM "Category" c WHERE c.id = p."categoryId" AND c.slug = 'becas';
UPDATE "Product" SET "occasions" = ARRAY['gala','casamento','formatura']
  WHERE "name" ILIKE 'smoking%';
UPDATE "Product" SET "occasions" = ARRAY['casamento','padrinhos','social']
  WHERE COALESCE(cardinality("occasions"), 0) = 0 AND ("name" ILIKE '%areia%' OR "name" ILIKE '%bege%' OR "name" ILIKE '%kraft%' OR "name" ILIKE '%linho%' OR "name" ILIKE '%summer%' OR "name" ILIKE '%terracota%' OR "name" ILIKE '%céu%');
UPDATE "Product" SET "occasions" = ARRAY['social','formatura']
  WHERE COALESCE(cardinality("occasions"), 0) = 0 AND "name" ILIKE 'blazer%';
UPDATE "Product" p SET "occasions" = ARRAY['casamento','formatura','padrinhos','social']
  FROM "Category" c WHERE c.id = p."categoryId" AND c.slug = 'ternos' AND COALESCE(cardinality(p."occasions"), 0) = 0;
UPDATE "Product" p SET "occasions" = ARRAY['casamento','formatura','padrinhos','gala','social']
  FROM "Category" c WHERE c.id = p."categoryId" AND c.slug IN ('camisas','gravatas','acessorios') AND COALESCE(cardinality(p."occasions"), 0) = 0;
