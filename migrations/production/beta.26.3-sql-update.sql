#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

SET @string_id = (SELECT `id` FROM `config_types` WHERE `label` = 'string');
SET @boolean_id = (SELECT `id` FROM `config_types` WHERE `label` = 'boolean');
SET @float_id = (SELECT `id` FROM `config_types` WHERE `label` = 'float');
SET @json_id = (SELECT `id` FROM `config_types` WHERE `label` = 'json');
SET @comma_separated_id = (SELECT `id` FROM `config_types` WHERE `label` = 'comma_separated');

# Snippets:
CREATE TABLE `locale` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`locale` VARCHAR(5) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`language_code` VARCHAR(2) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`country_code` VARCHAR(2) NULL DEFAULT NULL COLLATE 'utf8mb4_unicode_ci',
	`enabled` INT(10) UNSIGNED NOT NULL DEFAULT '1',
	PRIMARY KEY (`id`) USING BTREE
) COLLATE='utf8mb4_unicode_ci' ENGINE=InnoDB;

CREATE TABLE `snippets` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`locale_id` INT(10) UNSIGNED NOT NULL,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`value` TEXT NOT NULL COLLATE 'utf8mb4_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `locale_id` (`locale_id`) USING BTREE,
	CONSTRAINT `FK_snippets_locale` FOREIGN KEY (`locale_id`) REFERENCES `locale` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) COLLATE='utf8mb4_unicode_ci' ENGINE=InnoDB;

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
) COLLATE='utf8mb4_unicode_ci' ENGINE=InnoDB;

INSERT INTO `locale` VALUES (1, 'en_US', 'en', 'US');

# Features:
INSERT INTO `features` VALUES (NULL, 'snippets', 'Snippets', 1);

# Chat UI:
CREATE TABLE `chat_message_types` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`key` VARCHAR(50) NOT NULL COLLATE 'utf8_unicode_ci',
	`show_tab` INT(10) UNSIGNED NOT NULL DEFAULT '0',
	`show_in_general` INT(10) UNSIGNED NOT NULL DEFAULT '1',
	PRIMARY KEY (`id`) USING BTREE
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

INSERT INTO `chat_message_types` VALUES (1, 'message', 1, 1);
INSERT INTO `chat_message_types` VALUES (2, 'joined', 0, 1);
INSERT INTO `chat_message_types` VALUES (3, 'system', 0, 1);
INSERT INTO `chat_message_types` VALUES (4, 'private', 0, 1);
INSERT INTO `chat_message_types` VALUES (5, 'damage', 0, 1);
INSERT INTO `chat_message_types` VALUES (6, 'reward', 0, 1);
INSERT INTO `chat_message_types` VALUES (7, 'skill', 0, 1);
INSERT INTO `chat_message_types` VALUES (8, 'teams', 0, 1);
INSERT INTO `chat_message_types` VALUES (9, 'global', 0, 1);
INSERT INTO `chat_message_types` VALUES (10, 'error', 0, 1);

SET @message_id = (SELECT `id` FROM `chat_message_types` WHERE `label` = 'message');
SET @joined_id = (SELECT `id` FROM `chat_message_types` WHERE `label` = 'joined');
SET @system_id = (SELECT `id` FROM `chat_message_types` WHERE `label` = 'system');
SET @private_id = (SELECT `id` FROM `chat_message_types` WHERE `label` = 'private');
SET @damage_id = (SELECT `id` FROM `chat_message_types` WHERE `label` = 'damage');
SET @reward_id = (SELECT `id` FROM `chat_message_types` WHERE `label` = 'reward');
SET @skill_id = (SELECT `id` FROM `chat_message_types` WHERE `label` = 'skill');
SET @teams_id = (SELECT `id` FROM `chat_message_types` WHERE `label` = 'teams');
SET @global_id = (SELECT `id` FROM `chat_message_types` WHERE `label` = 'global');

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

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
