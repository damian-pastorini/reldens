#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

SET @string_id = (SELECT `id` FROM `config_types` WHERE `label` = 'string');
SET @boolean_id = (SELECT `id` FROM `config_types` WHERE `label` = 'boolean');
SET @float_id = (SELECT `id` FROM `config_types` WHERE `label` = 'float');
SET @json_id = (SELECT `id` FROM `config_types` WHERE `label` = 'json');
SET @comma_separated_id = (SELECT `id` FROM `config_types` WHERE `label` = 'comma_separated');

# Config:
INSERT INTO `config` VALUES (NULL, 'client', 'ui/chat/showTabs', '1', @boolean_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ads/general/providers/crazyGames/enabled', '1', @boolean_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ads/general/providers/crazyGames/sdkUrl', 'https://sdk.crazygames.com/crazygames-sdk-v2.js', @string_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ads/general/providers/crazyGames/videoMinimumDuration', '3000', @float_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ads/general/providers/gameMonetize/enabled', '1', @boolean_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ads/general/providers/gameMonetize/sdkUrl', 'https://api.gamemonetize.com/sdk.js', @string_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ads/general/providers/gameMonetize/gameId', 'your-game-id-should-be-here', @string_id);

# Snippets:
CREATE TABLE `locale` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`locale` VARCHAR(5) NOT NULL COLLATE 'utf8_unicode_ci',
	`language_code` VARCHAR(2) NOT NULL COLLATE 'utf8_unicode_ci',
	`country_code` VARCHAR(2) NULL DEFAULT NULL COLLATE 'utf8_unicode_ci',
	`enabled` INT(10) UNSIGNED NOT NULL DEFAULT '1',
	PRIMARY KEY (`id`) USING BTREE
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

CREATE TABLE `snippets` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`locale_id` INT(10) UNSIGNED NOT NULL,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`value` TEXT NOT NULL COLLATE 'utf8_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `locale_id` (`locale_id`) USING BTREE,
	CONSTRAINT `FK_snippets_locale` FOREIGN KEY (`locale_id`) REFERENCES `locale` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

CREATE TABLE `players_locale` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`locale_id` INT(10) UNSIGNED NULL DEFAULT NULL,
	`player_id` INT(10) UNSIGNED NULL DEFAULT NULL,
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `locale_id_player_id` (`locale_id`, `player_id`) USING BTREE,
	INDEX `locale_id` (`locale_id`) USING BTREE,
	INDEX `player_id` (`player_id`) USING BTREE,
	CONSTRAINT `FK_players_locale_locale` FOREIGN KEY (`locale_id`) REFERENCES `locale` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
	CONSTRAINT `FK_players_locale_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

INSERT INTO `locale` VALUES (NULL, 'en_US', 'en', 'US', true);

# Features:
ALTER TABLE `features` ADD UNIQUE INDEX `code` (`code`);

INSERT INTO `features` VALUES (NULL, 'snippets', 'Snippets', 1);
INSERT INTO `features` VALUES (NULL, 'ads', 'Ads', 1);

# Chat UI:
CREATE TABLE `chat_message_types` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`key` VARCHAR(50) NOT NULL COLLATE 'utf8mb3_unicode_ci',
	`show_tab` INT(10) UNSIGNED NOT NULL DEFAULT '0',
	`also_show_in_type` INT(10) UNSIGNED NULL DEFAULT NULL,
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `FK_chat_message_types_chat_message_types` (`also_show_in_type`) USING BTREE,
	CONSTRAINT `FK_chat_message_types_chat_message_types` FOREIGN KEY (`also_show_in_type`) REFERENCES `chat_message_types` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

INSERT INTO `chat_message_types` VALUES (1, 'message', 1, 0);
INSERT INTO `chat_message_types` VALUES (2, 'joined', 0, 1);
INSERT INTO `chat_message_types` VALUES (3, 'system', 0, 1);
INSERT INTO `chat_message_types` VALUES (4, 'private', 1, 1);
INSERT INTO `chat_message_types` VALUES (5, 'damage', 0, 1);
INSERT INTO `chat_message_types` VALUES (6, 'reward', 0, 1);
INSERT INTO `chat_message_types` VALUES (7, 'skill', 0, 1);
INSERT INTO `chat_message_types` VALUES (8, 'teams', 1, 1);
INSERT INTO `chat_message_types` VALUES (9, 'global', 1, 1);
INSERT INTO `chat_message_types` VALUES (10, 'error', 0, 1);

SET @message_id = (SELECT `id` FROM `chat_message_types` WHERE `key` = 'message');
SET @joined_id = (SELECT `id` FROM `chat_message_types` WHERE `key` = 'joined');
SET @system_id = (SELECT `id` FROM `chat_message_types` WHERE `key` = 'system');
SET @private_id = (SELECT `id` FROM `chat_message_types` WHERE `key` = 'private');
SET @damage_id = (SELECT `id` FROM `chat_message_types` WHERE `key` = 'damage');
SET @reward_id = (SELECT `id` FROM `chat_message_types` WHERE `key` = 'reward');
SET @skill_id = (SELECT `id` FROM `chat_message_types` WHERE `key` = 'skill');
SET @teams_id = (SELECT `id` FROM `chat_message_types` WHERE `key` = 'teams');
SET @global_id = (SELECT `id` FROM `chat_message_types` WHERE `key` = 'global');

UPDATE `chat` SET `message_type` = @message_id WHERE `message_type` = 'm';
UPDATE `chat` SET `message_type` = @joined_id WHERE `message_type` = 'j';
UPDATE `chat` SET `message_type` = @system_id WHERE `message_type` = 's';
UPDATE `chat` SET `message_type` = @private_id WHERE `message_type` = 'p';
UPDATE `chat` SET `message_type` = @damage_id WHERE `message_type` = 'd';
UPDATE `chat` SET `message_type` = @reward_id WHERE `message_type` = 'r';
UPDATE `chat` SET `message_type` = @skill_id WHERE `message_type` = 'ss';
UPDATE `chat` SET `message_type` = @teams_id WHERE `message_type` = 'ct';
UPDATE `chat` SET `message_type` = @global_id WHERE `message_type` = 'ct';

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
UPDATE `objects` SET `class_type`=7, `private_params` = '{"shouldRespawn":true,childObjectType":4,"isAggressive":true}' WHERE `object_class_key` = 'enemy_1' AND `client_key`='enemy_forest_1';
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
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB AUTO_INCREMENT=3;

INSERT INTO `ads_providers` (`key`) VALUES ('crazyGames');
INSERT INTO `ads_providers` (`key`) VALUES ('gameMonetize');

SET @crazyGames_id = (SELECT `id` FROM `ads_providers` WHERE `key` = 'crazyGames');
SET @gameMonetize_id = (SELECT `id` FROM `ads_providers` WHERE `key` = 'gameMonetize');

CREATE TABLE `ads_types` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `key` (`key`) USING BTREE
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

INSERT INTO `ads_types` (`id`, `key`) VALUES (NULL, 'banner');
INSERT INTO `ads_types` (`id`, `key`) VALUES (NULL, 'eventVideo');

SET @adTypeBanner_id = (SELECT `id` FROM `ads_providers` WHERE `key` = 'banner');
SET @adTypeEventVideo_id = (SELECT `id` FROM `ads_providers` WHERE `key` = 'eventVideo');

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
	`started_at` DATETIME NOT NULL DEFAULT '0',
	`ended_at` DATETIME NULL DEFAULT NULL,
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `ads_id` (`ads_id`) USING BTREE,
	INDEX `player_id` (`player_id`) USING BTREE,
	CONSTRAINT `FK_ads_played_ads` FOREIGN KEY (`ads_id`) REFERENCES `ads` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
	CONSTRAINT `FK_ads_played_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB AUTO_INCREMENT=1;

# Ads sample data:
INSERT INTO `ads` (`id`, `key`, `provider_id`, `type_id`, `width`, `height`, `position`, `top`, `bottom`, `left`, `right`, `replay`, `enabled`) VALUES (1, 'fullTimeBanner', 1, 1, 320, 50, NULL, NULL, 0, NULL, 80, NULL, 0);
INSERT INTO `ads` (`id`, `key`, `provider_id`, `type_id`, `width`, `height`, `position`, `top`, `bottom`, `left`, `right`, `replay`, `enabled`) VALUES (2, 'ui-banner', 1, 1, 320, 50, NULL, NULL, 80, NULL, 80, NULL, 0);
INSERT INTO `ads` (`id`, `key`, `provider_id`, `type_id`, `width`, `height`, `position`, `top`, `bottom`, `left`, `right`, `replay`, `enabled`) VALUES (3, 'crazy-games-sample-video', 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 0);
INSERT INTO `ads` (`id`, `key`, `provider_id`, `type_id`, `width`, `height`, `position`, `top`, `bottom`, `left`, `right`, `replay`, `enabled`) VALUES (4, 'game-monetize-sample-video', 2, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 0);

INSERT INTO `ads_banner` (`id`, `ads_id`, `banner_data`) VALUES (NULL, 1, '{"fullTime": true}');
INSERT INTO `ads_banner` (`id`, `ads_id`, `banner_data`) VALUES (NULL, 2, '{"uiReferenceIds":["box-open-clan","equipment-open","inventory-open","player-stats-open"]}');
INSERT INTO `ads_event_video` (`id`, `ads_id`, `event_key`, `event_data`) VALUES (NULL, 3, 'reldens.activatedRoom_ReldensTown', '{"rewardItemKey":"coins","rewardItemQty":1}');
INSERT INTO `ads_event_video` (`id`, `ads_id`, `event_key`, `event_data`) VALUES (NULL, 4, 'reldens.activatedRoom_ReldensForest', '{"rewardItemKey":"coins","rewardItemQty":1}');

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
