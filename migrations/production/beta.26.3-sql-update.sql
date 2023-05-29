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

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
