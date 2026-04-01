-- Add replyTo JSON field to Message for inline reply preview
ALTER TABLE `Message` ADD COLUMN `replyTo` JSON NULL;
