-- Add orderNumber: nullable first, backfill per restaurant, then set NOT NULL and add unique constraint.
ALTER TABLE "Order" ADD COLUMN "orderNumber" INTEGER;

-- Backfill with sequential numbers per restaurant (order by createdAt).
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "restaurantId" ORDER BY "createdAt") AS rn
  FROM "Order"
)
UPDATE "Order" o SET "orderNumber" = n.rn FROM numbered n WHERE o.id = n.id;

-- Ensure no nulls (for any edge case) then enforce NOT NULL.
UPDATE "Order" SET "orderNumber" = 0 WHERE "orderNumber" IS NULL;
ALTER TABLE "Order" ALTER COLUMN "orderNumber" SET NOT NULL;

-- Unique per restaurant.
CREATE UNIQUE INDEX "Order_restaurantId_orderNumber_key" ON "Order"("restaurantId", "orderNumber");
