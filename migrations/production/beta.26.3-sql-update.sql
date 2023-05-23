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

INSERT INTO `locale` VALUES (1, 'en_US', 'en', 'US');

# Features:
INSERT INTO `features` VALUES (NULL, 'snippets', 'Snippets', 1);

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
