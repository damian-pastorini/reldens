ALTER TABLE `scenes`
    ALTER `scene_key` DROP DEFAULT;
ALTER TABLE `scenes`
    CHANGE COLUMN `scene_key` `image` VARCHAR(255) NOT NULL AFTER `scene_map`;