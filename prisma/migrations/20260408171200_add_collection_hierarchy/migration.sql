-- Add parent collection support for hierarchy
ALTER TABLE "Collection" ADD COLUMN "parentCollectionId" String;
