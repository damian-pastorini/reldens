#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

SET @global_id = (SELECT `id` FROM `chat_message_types` WHERE `key` = 'global');
UPDATE `chat` SET `message_type` = @global_id WHERE `message_type` = 'g';
UPDATE `chat` SET `message_type` = @global_id WHERE `message_type` = NULL;
UPDATE `chat` SET `message_type` = @global_id WHERE `message_type` IS NULL;

ALTER TABLE `chat` CHANGE COLUMN `message_type` `message_type` INT(10) UNSIGNED NULL AFTER `private_player_id`;
ALTER TABLE `chat` ADD CONSTRAINT `FK_chat_chat_message_types` FOREIGN KEY (`message_type`) REFERENCES `chat_message_types` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION;

# Items types:
CREATE TABLE `items_types` (
	`id` INT(10) NOT NULL AUTO_INCREMENT,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `key` (`key`) USING BTREE
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

INSERT INTO `items_types` VALUES(1, 'equipment');
INSERT INTO `items_types` VALUES(2, 'usable');
INSERT INTO `items_types` VALUES(3, 'single');
INSERT INTO `items_types` VALUES(4, 'single_equipment');
INSERT INTO `items_types` VALUES(5, 'single_usable');
INSERT INTO `items_types` VALUES(10, 'base');

UPDATE `items_item` SET `type` = 10 WHERE `type` = 0;

ALTER TABLE `items_item`
	ADD INDEX `type` (`type`),
	ADD CONSTRAINT `FK_items_item_items_types` FOREIGN KEY (`type`) REFERENCES `items_types` (`id`) ON UPDATE CASCADE ON DELETE NO ACTION;

# Items fix:
UPDATE `items_item`
    SET `customData` = '{"animationData":{"frameWidth":64,"frameHeight":64,"start":6,"end":11,"repeat":0,"hide":true,"usePlayerPosition":true,"closeInventoryOnUse":true,"followPlayer":true,"startsOnTarget":true},"removeAfterUse":true}'
    WHERE `key` = 'heal_potion_20';

UPDATE `items_item`
    SET `customData` = '{"animationData":{"frameWidth":64,"frameHeight":64,"start":6,"end":11,"repeat":0,"hide":true,"usePlayerPosition":true,"closeInventoryOnUse":true,"followPlayer":true,"startsOnTarget":true},"removeAfterUse":true}'
    WHERE `key` = 'magic_potion_20';

# Objects fix:
UPDATE `objects`
    SET `private_params`='{"runOnHit":true,"roomVisible":true,"yFix":6}',
        `client_params`='{"positionFix":{"y":-18},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000}'
    WHERE `object_class_key`='door_1' OR `object_class_key`='door_2';

ALTER TABLE `objects` ADD COLUMN `class_type` INT(10) UNSIGNED NULL DEFAULT NULL AFTER `tile_index`;

CREATE TABLE `objects_types` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `key` (`key`) USING BTREE
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

INSERT INTO `objects_types` VALUES (1, 'base');
INSERT INTO `objects_types` VALUES (2, 'animation');
INSERT INTO `objects_types` VALUES (3, 'npc');
INSERT INTO `objects_types` VALUES (4, 'enemy');
INSERT INTO `objects_types` VALUES (5, 'trader');
INSERT INTO `objects_types` VALUES (6, 'drop');
INSERT INTO `objects_types` VALUES (7, 'multiple');

ALTER TABLE `objects` ADD INDEX `class_type` (`class_type`);

ALTER TABLE `objects` ADD CONSTRAINT `FK_objects_objects_types` FOREIGN KEY (`class_type`) REFERENCES `objects_types` (`id`) ON UPDATE CASCADE ON DELETE NO ACTION;

UPDATE `objects` SET `class_type`=2 WHERE `object_class_key` = 'door_1' AND `client_key`='door_house_1';
UPDATE `objects` SET `class_type`=2 WHERE `object_class_key` = 'door_2' AND `client_key`='door_house_2';
UPDATE `objects` SET `class_type`=3 WHERE `object_class_key` = 'npc_1' AND `client_key`='people_town_1';
UPDATE `objects` SET `class_type`=7, `private_params` = '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true}' WHERE `object_class_key` = 'enemy_1' AND `client_key`='enemy_forest_1';
UPDATE `objects` SET `class_type`=7, `private_params` = '{"shouldRespawn":true,"childObjectType":4}' WHERE `object_class_key` = 'enemy_2' AND `client_key`='enemy_forest_2';
UPDATE `objects` SET `class_type`=3 WHERE `object_class_key` = 'npc_2' AND `client_key`='healer_1';
UPDATE `objects` SET `class_type`=5 WHERE `object_class_key` = 'npc_3' AND `client_key`='merchant_1';
UPDATE `objects` SET `class_type`=3 WHERE `object_class_key` = 'npc_4' AND `client_key`='weapons_master_1';
UPDATE `objects` SET `class_type`=3 WHERE `object_class_key` = 'npc_5' AND `client_key`='quest_npc_1';

# Ads:
CREATE TABLE `ads_providers` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`enabled` INT(10) UNSIGNED NOT NULL DEFAULT '1',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `key` (`key`) USING BTREE
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB AUTO_INCREMENT=1;

CREATE TABLE `ads_types` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `key` (`key`) USING BTREE
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

CREATE TABLE `ads` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`provider_id` INT(10) UNSIGNED NOT NULL,
	`type_id` INT(10) UNSIGNED NOT NULL,
	`width` INT(10) UNSIGNED NULL DEFAULT NULL,
	`height` INT(10) UNSIGNED NULL DEFAULT NULL,
	`position` VARCHAR(50) NULL DEFAULT NULL COLLATE 'utf8_unicode_ci',
	`top` INT(10) UNSIGNED NULL DEFAULT NULL,
	`bottom` INT(10) UNSIGNED NULL DEFAULT NULL,
	`left` INT(10) UNSIGNED NULL DEFAULT NULL,
	`right` INT(10) UNSIGNED NULL DEFAULT NULL,
	`replay` INT(10) UNSIGNED NULL DEFAULT NULL,
	`enabled` INT(10) UNSIGNED NOT NULL DEFAULT '0',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `key` (`key`) USING BTREE,
	INDEX `provider_id` (`provider_id`) USING BTREE,
	INDEX `type_id` (`type_id`) USING BTREE,
	CONSTRAINT `FK_ads_ads_providers` FOREIGN KEY (`provider_id`) REFERENCES `ads_providers` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
	CONSTRAINT `FK_ads_ads_types` FOREIGN KEY (`type_id`) REFERENCES `ads_types` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB AUTO_INCREMENT=1;

CREATE TABLE `ads_event_video` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`ads_id` INT(10) UNSIGNED NOT NULL,
	`event_key` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`event_data` TEXT NOT NULL COLLATE 'utf8_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `ads_id` (`ads_id`) USING BTREE,
	INDEX `ad_id` (`ads_id`) USING BTREE,
	INDEX `room_id` (`event_key`) USING BTREE,
	CONSTRAINT `FK_ads_scene_change_video_ads` FOREIGN KEY (`ads_id`) REFERENCES `ads` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

CREATE TABLE `ads_banner` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`ads_id` INT(10) UNSIGNED NOT NULL,
	`banner_data` TEXT NOT NULL COLLATE 'utf8_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `ads_id` (`ads_id`) USING BTREE,
	CONSTRAINT `FK_ads_banner_ads` FOREIGN KEY (`ads_id`) REFERENCES `ads` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

CREATE TABLE `ads_played` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`ads_id` INT(10) UNSIGNED NOT NULL,
	`player_id` INT(10) UNSIGNED NOT NULL,
	`started_at` DATETIME NOT NULL DEFAULT (now()),
	`ended_at` DATETIME NULL DEFAULT NULL,
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `ads_id` (`ads_id`) USING BTREE,
	INDEX `player_id` (`player_id`) USING BTREE,
	CONSTRAINT `FK_ads_played_ads` FOREIGN KEY (`ads_id`) REFERENCES `ads` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
	CONSTRAINT `FK_ads_played_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB AUTO_INCREMENT=1;

# Ads sample data:
INSERT INTO `ads_providers` (`key`) VALUES ('crazyGames');
INSERT INTO `ads_providers` (`key`) VALUES ('gameMonetize');

SET @crazyGames_id = (SELECT `id` FROM `ads_providers` WHERE `key` = 'crazyGames');
SET @gameMonetize_id = (SELECT `id` FROM `ads_providers` WHERE `key` = 'gameMonetize');

INSERT INTO `ads_types` (`id`, `key`) VALUES (NULL, 'banner');
INSERT INTO `ads_types` (`id`, `key`) VALUES (NULL, 'eventVideo');

SET @adTypeBanner_id = (SELECT `id` FROM `ads_types` WHERE `key` = 'banner');
SET @adTypeEventVideo_id = (SELECT `id` FROM `ads_types` WHERE `key` = 'eventVideo');

INSERT INTO `ads` (`id`, `key`, `provider_id`, `type_id`, `width`, `height`, `position`, `top`, `bottom`, `left`, `right`, `replay`, `enabled`) VALUES (1, 'fullTimeBanner', @crazyGames_id, @adTypeBanner_id, 320, 50, NULL, NULL, 0, NULL, 80, NULL, 0);
INSERT INTO `ads` (`id`, `key`, `provider_id`, `type_id`, `width`, `height`, `position`, `top`, `bottom`, `left`, `right`, `replay`, `enabled`) VALUES (2, 'ui-banner', @crazyGames_id, @adTypeBanner_id, 320, 50, NULL, NULL, 80, NULL, 80, NULL, 1);
INSERT INTO `ads` (`id`, `key`, `provider_id`, `type_id`, `width`, `height`, `position`, `top`, `bottom`, `left`, `right`, `replay`, `enabled`) VALUES (3, 'crazy-games-sample-video', @crazyGames_id, @adTypeEventVideo_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1);
INSERT INTO `ads` (`id`, `key`, `provider_id`, `type_id`, `width`, `height`, `position`, `top`, `bottom`, `left`, `right`, `replay`, `enabled`) VALUES (4, 'game-monetize-sample-video', @gameMonetize_id, @adTypeEventVideo_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 0);

INSERT INTO `ads_banner` (`id`, `ads_id`, `banner_data`) VALUES (NULL, 1, '{"fullTime": true}');
INSERT INTO `ads_banner` (`id`, `ads_id`, `banner_data`) VALUES (NULL, 2, '{"uiReferenceIds":["box-open-clan","equipment-open","inventory-open","player-stats-open"]}');
INSERT INTO `ads_event_video` (`id`, `ads_id`, `event_key`, `event_data`) VALUES (NULL, 3, 'reldens.activatedRoom_ReldensTown', '{"rewardItemKey":"coins","rewardItemQty":1}');
INSERT INTO `ads_event_video` (`id`, `ads_id`, `event_key`, `event_data`) VALUES (NULL, 4, 'reldens.activatedRoom_ReldensForest', '{"rewardItemKey":"coins","rewardItemQty":1}');

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
