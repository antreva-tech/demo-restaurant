-- AlterTable: Allow OrderItem.menuItemId to be NULL for custom/off-menu items added at POS.
ALTER TABLE "OrderItem" ALTER COLUMN "menuItemId" DROP NOT NULL;
