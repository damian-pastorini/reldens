#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# Config Types:
CREATE TABLE `config_types` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`label` VARCHAR(50) NOT NULL DEFAULT '0' COLLATE 'utf8_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

INSERT INTO `config_types` VALUES (1, 'string');
INSERT INTO `config_types` VALUES (2, 'float');
INSERT INTO `config_types` VALUES (3, 'boolean');
INSERT INTO `config_types` VALUES (4, 'json');
INSERT INTO `config_types` VALUES (5, 'comma_separated');

UPDATE `config` SET `type` = 't' WHERE `path` = 'actions/pvp/timerType';

SET @string_id = (SELECT `id` FROM `config_types` WHERE `label` = 'string');
SET @boolean_id = (SELECT `id` FROM `config_types` WHERE `label` = 'boolean');
SET @float_id = (SELECT `id` FROM `config_types` WHERE `label` = 'float');
SET @json_id = (SELECT `id` FROM `config_types` WHERE `label` = 'json');
SET @comma_separated_id = (SELECT `id` FROM `config_types` WHERE `label` = 'comma_separated');

UPDATE `config` SET `type` = @string_id WHERE `type` = 't';
UPDATE `config` SET `type` = @boolean_id WHERE `type` = 'b';
UPDATE `config` SET `type` = @float_id WHERE `type` = 'i';
UPDATE `config` SET `type` = @json_id WHERE `type` = 'j';
UPDATE `config` SET `type` = @comma_separated_id WHERE `type` = 'c';

ALTER TABLE `config` CHANGE COLUMN `type` `type` INT UNSIGNED NOT NULL COLLATE 'utf8_unicode_ci' AFTER `value`;
ALTER TABLE `config` ADD CONSTRAINT `FK_config_config_types` FOREIGN KEY (`type`) REFERENCES `config_types` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE `config` ADD UNIQUE INDEX `scope_path` (`scope`, `path`);

# Config:
INSERT INTO `config` VALUES (NULL, 'client', 'general/gameEngine/updateGameSizeTimeOut', '500', @float_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ui/options/acceptOrDecline', '{"1":{"label":"Accept","value":1},"2":{"label":"Decline","value":2}}', @json_id);
INSERT INTO `config` VALUES (NULL, 'client', 'team/labels/requestFromTitle', 'Team request from:', @string_id);
INSERT INTO `config` VALUES (NULL, 'client', 'team/labels/leaderNameTitle', 'Team leader: %leaderName', @string_id);
INSERT INTO `config` VALUES (NULL, 'client', 'team/labels/propertyMaxValue', '/ %propertyMaxValue', @string_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ui/teams/enabled', '1', @boolean_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ui/teams/responsiveX', '100', @float_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ui/teams/responsiveY', '0', @float_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ui/teams/x', '430', @float_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ui/teams/y', '100', @float_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ui/teams/sharedProperties', '{"hp":{"path":"stats/hp","pathMax":"statsBase/hp","label":"HP"},"mp":{"path":"stats/mp","pathMax":"statsBase/mp","label":"MP"}}', @json_id);
INSERT INTO `config` VALUES (NULL, 'client', 'clan/general/openInvites', '0', @boolean_id);
INSERT INTO `config` VALUES (NULL, 'client', 'clan/labels/requestFromTitle', 'Clan request from:', @string_id);
INSERT INTO `config` VALUES (NULL, 'client', 'clan/labels/clanTitle', 'Clan: %clanName - Leader: %leaderName', @string_id);
INSERT INTO `config` VALUES (NULL, 'client', 'clan/labels/propertyMaxValue', '/ %propertyMaxValue', @string_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ui/clan/enabled', '1', @boolean_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ui/clan/responsiveX', '100', @float_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ui/clan/responsiveY', '0', @float_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ui/clan/x', '430', @float_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ui/clan/y', '100', @float_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ui/clan/sharedProperties', '{"hp":{"path":"stats/hp","pathMax":"statsBase/hp","label":"HP"},"mp":{"path":"stats/mp","pathMax":"statsBase/mp","label":"MP"}}', @json_id);
INSERT INTO `config` VALUES (NULL, 'client', 'ui/controls/allowPrimaryTouch', '1', @boolean_id);
INSERT INTO `config` VALUES (NULL, 'server', 'rewards/actions/interactionsDistance', '140', @float_id);
INSERT INTO `config` VALUES (NULL, 'server', 'rewards/actions/disappearTime', '1800000', @float_id);
INSERT INTO `config` VALUES (NULL, 'client', 'rewards/titles/rewardMessage', 'You obtained %dropQuantity %itemLabel', @string_id);
INSERT INTO `config` VALUES (NULL, 'client', 'login/termsAndConditions/link', 'Accept our Terms and Conditions (click here).', @string_id);
INSERT INTO `config` VALUES (NULL, 'client', 'login/termsAndConditions/heading', 'Terms and conditions', @string_id);
INSERT INTO `config` VALUES (NULL, 'client', 'login/termsAndConditions/body', 'This is our test terms and conditions content.', @string_id);
INSERT INTO `config` VALUES (NULL, 'client', 'login/termsAndConditions/checkboxLabel', 'Accept terms and conditions', @string_id);
UPDATE `config` SET `value` = 'Played time %playedTimeInHs hs' WHERE `path` = 'players/playedTime/label';

# Features:
INSERT INTO `features` VALUES (NULL, 'teams', 'Teams', 1);
INSERT INTO `features` VALUES (NULL, 'rewards', 'Rewards', 1);

# Clan and members:
CREATE TABLE `clan_levels` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`key` INT(10) UNSIGNED NOT NULL,
	`label` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`required_experience` BIGINT(20) UNSIGNED NULL DEFAULT NULL,
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `key` (`key`) USING BTREE
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB AUTO_INCREMENT=1;

INSERT INTO `clan_levels` VALUES (NULL, 1, '1', 0);

CREATE TABLE `clan` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`owner_id` INT(10) UNSIGNED NOT NULL,
	`name` VARCHAR(50) NOT NULL DEFAULT '' COLLATE 'utf8_unicode_ci',
	`points` INT(10) UNSIGNED NOT NULL DEFAULT '0',
	`level` INT(10) UNSIGNED NOT NULL,
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `owner_id` (`owner_id`) USING BTREE,
	UNIQUE INDEX `name` (`name`) USING BTREE,
	INDEX `FK_clan_clan_levels` (`level`) USING BTREE,
	CONSTRAINT `FK_clan_clan_levels` FOREIGN KEY (`level`) REFERENCES `clan_levels` (`key`) ON UPDATE NO ACTION ON DELETE NO ACTION,
	CONSTRAINT `FK_clan_players` FOREIGN KEY (`owner_id`) REFERENCES `players` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB AUTO_INCREMENT=1;

CREATE TABLE `clan_members` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`clan_id` INT(10) UNSIGNED NOT NULL,
	`player_id` INT(10) UNSIGNED NOT NULL,
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `clan_id_player_id` (`clan_id`, `player_id`) USING BTREE,
	UNIQUE INDEX `player_id` (`player_id`) USING BTREE,
	INDEX `FK__clan` (`clan_id`) USING BTREE,
	INDEX `FK__players` (`player_id`) USING BTREE,
	CONSTRAINT `FK_clan_members_clan` FOREIGN KEY (`clan_id`) REFERENCES `clan` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
	CONSTRAINT `FK_clan_members_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

CREATE TABLE `clan_levels_modifiers` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`level_id` INT(10) UNSIGNED NOT NULL,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`property_key` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`operation` INT(10) UNSIGNED NOT NULL,
	`value` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`minValue` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8_unicode_ci',
	`maxValue` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8_unicode_ci',
	`minProperty` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8_unicode_ci',
	`maxProperty` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `modifier_id` (`key`) USING BTREE,
	INDEX `level_key` (`level_id`) USING BTREE,
	INDEX `FK_clan_levels_modifiers_operation_types` (`operation`) USING BTREE,
	CONSTRAINT `FK_clan_levels_modifiers_operation_types` FOREIGN KEY (`operation`) REFERENCES `operation_types` (`key`) ON UPDATE NO ACTION ON DELETE NO ACTION,
	CONSTRAINT `FK_clan_levels_modifiers_clan_levels` FOREIGN KEY (`level_id`) REFERENCES `clan_levels` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB AUTO_INCREMENT=1;

# Inventory tables fix:
ALTER TABLE `items_inventory` DROP FOREIGN KEY `FK_items_inventory_items_item`;
ALTER TABLE `items_item` DROP FOREIGN KEY `FK_items_item_items_group`;
ALTER TABLE `items_item_modifiers` DROP FOREIGN KEY `FK_items_item_modifiers_items_item`;
ALTER TABLE `objects_items_inventory` DROP FOREIGN KEY  `objects_items_inventory_ibfk_1`;

ALTER TABLE `items_group`
    CHANGE COLUMN `id` `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT FIRST;
ALTER TABLE `items_inventory`
	CHANGE COLUMN `id` `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT FIRST,
	CHANGE COLUMN `owner_id` `owner_id` INT(10) UNSIGNED NOT NULL AFTER `id`,
	CHANGE COLUMN `item_id` `item_id` INT(10) UNSIGNED NOT NULL AFTER `owner_id`;
ALTER TABLE `items_item`
	CHANGE COLUMN `id` `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT FIRST,
	CHANGE COLUMN `group_id` `group_id` INT(10) UNSIGNED NULL DEFAULT NULL AFTER `type`;
ALTER TABLE `items_item_modifiers`
	CHANGE COLUMN `id` `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT FIRST,
	CHANGE COLUMN `item_id` `item_id` INT(10) UNSIGNED NOT NULL AFTER `id`;
ALTER TABLE `objects_items_inventory`
	CHANGE COLUMN `item_id` `item_id` INT(10) UNSIGNED NOT NULL AFTER `owner_id`;
ALTER TABLE `features`
	CHANGE COLUMN `is_enabled` `is_enabled` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0 AFTER `title`;

ALTER TABLE `items_inventory` ADD CONSTRAINT `FK_items_inventory_items_item` FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE `items_item` ADD CONSTRAINT `FK_items_item_items_group` FOREIGN KEY (`group_id`) REFERENCES `items_group` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE `items_item_modifiers` ADD CONSTRAINT `FK_items_item_modifiers_items_item` FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE `objects_items_inventory` ADD CONSTRAINT `FK_objects_items_inventory_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION;

# Rewards:
CREATE TABLE `rewards_modifiers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` int unsigned NOT NULL,
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `minValue` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `maxValue` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `minProperty` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `maxProperty` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `modifier_id` (`key`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `rewards` (
    `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `object_id` INT(10) UNSIGNED NOT NULL,
    `item_id` INT(10) UNSIGNED NULL DEFAULT NULL,
    `modifier_id` INT(10) UNSIGNED NULL DEFAULT NULL,
    `experience` INT(11) UNSIGNED NOT NULL DEFAULT 0,
    `drop_rate` INT(10) UNSIGNED NOT NULL,
    `drop_quantity` INT(10) UNSIGNED NOT NULL,
    `is_unique` TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
    `was_given` TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
    `has_drop_body` TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`) USING BTREE,
    INDEX `FK_rewards_items_item` (`item_id`) USING BTREE,
    INDEX `FK_rewards_objects` (`object_id`) USING BTREE,
    CONSTRAINT `FK_rewards_items_item` FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT `FK_rewards_rewards_modifiers` FOREIGN KEY (`modifier_id`) REFERENCES `rewards_modifiers` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT `FK_rewards_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

CREATE TABLE `objects_items_rewards_animations` (
    `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `reward_id` INT(10) UNSIGNED NOT NULL,
    `asset_type` varchar(255) NOT NULL,
    `asset_key` varchar(255) NOT NULL,
    `file` varchar(255) NOT NULL,
    `extra_params` TEXT NULL,
    PRIMARY KEY (`id`) USING BTREE,
    INDEX `FK_objects_items_rewards_animations_rewards` (`reward_id`) USING BTREE,
    CONSTRAINT `FK_objects_items_rewards_animations_rewards` FOREIGN KEY (`reward_id`) REFERENCES `rewards` (`id`) ON UPDATE CASCADE ON DELETE NO ACTION
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

INSERT INTO `rewards` VALUES
    (1, 7, 2, null, 10, 100, 1, 0, 0, 1),
    (2, 6, 2, null, 10, 100, 3, 0, 0, 1);

INSERT INTO `objects_items_rewards_animations` VALUES
    (1, 2, 'spritesheet', 'branch-sprite', 'branch-sprite', '{"start":0,"end":2,"repeat":-1,"frameWidth":32, "frameHeight":32,"depthByPlayer":"above"}'),
    (2, 1, 'spritesheet', 'branch-sprite', 'branch-sprite', '{"start":0,"end":2,"repeat":-1,"frameWidth":32, "frameHeight":32,"depthByPlayer":"above"}');

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
