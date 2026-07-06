-- Add nullable itemName
ALTER TABLE "PosOrderItem" ADD COLUMN "itemName" TEXT;

-- Backfill from MenuItem
UPDATE "PosOrderItem"
SET "itemName" = (
  SELECT "name" FROM "MenuItem" WHERE "MenuItem"."id" = "PosOrderItem"."menuItemId"
);

-- Verify no NULL values remain (this will fail the transaction if there are any)
DO $DO$
BEGIN
  IF EXISTS (SELECT 1 FROM "PosOrderItem" WHERE "itemName" IS NULL) THEN
    RAISE EXCEPTION 'Backfill failed: Some PosOrderItems still have NULL itemName';
  END IF;
END
$DO$;

-- Set NOT NULL
ALTER TABLE "PosOrderItem" ALTER COLUMN "itemName" SET NOT NULL;
