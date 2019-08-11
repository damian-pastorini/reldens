ALTER TABLE `scenes`
    ALTER `image` DROP DEFAULT;
ALTER TABLE `scenes`
    CHANGE COLUMN `image` `scene_key` VARCHAR(255) NOT NULL AFTER `scene_map`;