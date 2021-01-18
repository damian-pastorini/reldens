
# Config:
UPDATE `config` SET `path`='rooms/world/onlyWalkable' WHERE `path`='rooms/world/onlyWalkeable';
UPDATE `config` SET path = 'ui/playerBox/enabled' WHERE path = 'ui/playerName/enabled' LIMIT 1;
UPDATE `config` SET path = 'ui/playerBox/responsiveX' WHERE path = 'ui/playerName/responsiveX' LIMIT 1;
UPDATE `config` SET path = 'ui/playerBox/responsiveY' WHERE path = 'ui/playerName/responsiveY' LIMIT 1;
UPDATE `config` SET path = 'ui/playerBox/x' WHERE path = 'ui/playerName/x' LIMIT 1;
UPDATE `config` SET path = 'ui/playerBox/y' WHERE path = 'ui/playerName/y' LIMIT 1;
UPDATE `config` SET path = 'ui/lifeBar/enabled' WHERE path = 'ui/uiLifeBar/enabled';
UPDATE `config` SET path = 'ui/lifeBar/fixedPosition' WHERE path = 'ui/uiLifeBar/fixedPosition';
UPDATE `config` SET path = 'ui/lifeBar/height' WHERE path = 'ui/uiLifeBar/height';
UPDATE `config` SET path = 'ui/lifeBar/responsiveX' WHERE path = 'ui/uiLifeBar/responsiveX';
UPDATE `config` SET path = 'ui/lifeBar/responsiveY' WHERE path = 'ui/uiLifeBar/responsiveY';
UPDATE `config` SET path = 'ui/lifeBar/width' WHERE path = 'ui/uiLifeBar/width';
UPDATE `config` SET path = 'ui/lifeBar/x' WHERE path = 'ui/uiLifeBar/x';
UPDATE `config` SET path = 'ui/lifeBar/y' WHERE path = 'ui/uiLifeBar/y';
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/chat/defaultOpen', '1', 'b');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/chat/notificationBalloon', '1', 'b');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/chat/damageMessages', '1', 'b');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'players/actions/initialClassPathId', '1', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'enemies/initialStats/aim', '10', 'i');
UPDATE config SET `value`= 10 WHERE path LIKE '%enemies/initialStats%';
DELETE FROM config WHERE path LIKE '%players/initialStats/%';
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'actions/skills/affectedProperty', 'hp', 't');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/controls/opacityEffect', '1', 'b');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/skills/y', '390', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/skills/x', '230', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/skills/responsiveY', '100', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/skills/responsiveX', '0', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/skills/enabled', '1', 'b');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'skills/animations/default_atk', '{"key":"default_atk","animationData":{"enabled":true,"type":"spritesheet","img":"default_atk","frameWidth":64,"frameHeight":64,"start":0,"end":4,"repeat":0}}', 'j');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'skills/animations/default_bullet', '{"key":"default_bullet","animationData":{"enabled":true,"type":"spritesheet","img":"default_bullet","frameWidth":64,"frameHeight":64,"start":0,"end":2,"repeat":-1,"rate":1}}', 'j');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'skills/animations/default_cast', '{"key": "default_cast","animationData":{"enabled":false,"type":"spritesheet","img":"default_cast","frameWidth":64,"frameHeight":64,"start":0,"end":3,"repeat":0}}', 'j');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'skills/animations/default_death', '{"key":"default_death","animationData":{"enabled":true,"type":"spritesheet","img":"default_death","frameWidth":64,"frameHeight":64,"start":0,"end":1,"repeat":0,"rate":1}}', 'j');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'skills/animations/default_hit', '{"key":"default_hit","animationData":{"enabled":true,"type":"spritesheet","img":"default_hit","frameWidth":64,"frameHeight":64,"start":0,"end":3,"repeat":0}}', 'j');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/controls/defaultActionKey', 'attackShort', 't');

# Features:
INSERT INTO `features` (`code`, `title`, `is_enabled`) VALUES ('actions', 'Actions', '1');
INSERT INTO `features` (`id`, `code`, `title`, `is_enabled`) VALUES (NULL, 'users', 'Users', 1);

# Items:
UPDATE `items_item_modifiers` SET `maxProperty`='statsBase/hp' WHERE  `key`='heal_potion_20';
INSERT INTO `items_item` (`id`, `key`, `group_id`, `label`, `description`, `qty_limit`, `uses_limit`, `useTimeOut`, `execTimeOut`) VALUES (6, 'magic_potion_20', NULL, 'Magic Potion', 'A magic potion that will restore 20 MP.', 0, 1, NULL, NULL);
INSERT INTO `items_item_modifiers` (`id`, `item_id`, `key`, `property_key`, `operation`, `value`, `maxProperty`) VALUES (4, 6, 'magic_potion_20', 'stats/mp', 1, '20', 'statsBase/mp');

#######################################################################################################################
# Stats:

# RENAME TABLE `players_stats` TO `players_stats_back`;
DROP TABLE `players_stats`;

CREATE TABLE `stats` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`label` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`description` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`base_value` INT(10) UNSIGNED NOT NULL,
	`customData` TEXT NULL DEFAULT NULL COLLATE 'utf8_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `key` (`key`) USING BTREE
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB AUTO_INCREMENT=1;

CREATE TABLE `players_stats` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`player_id` INT(10) UNSIGNED NOT NULL,
	`stat_id` INT(10) UNSIGNED NOT NULL,
	`base_value` INT(10) UNSIGNED NOT NULL,
	`value` INT(10) UNSIGNED NOT NULL,
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `player_id_stat_id` (`player_id`, `stat_id`) USING BTREE,
	INDEX `stat_id` (`stat_id`) USING BTREE,
	INDEX `user_id` (`player_id`) USING BTREE,
	CONSTRAINT `FK_player_current_stats_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
	CONSTRAINT `FK_players_current_stats_players_stats` FOREIGN KEY (`stat_id`) REFERENCES `stats` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB AUTO_INCREMENT=1;

INSERT INTO `stats` (`id`, `key`, `label`, `description`, `base_value`) VALUES (1, 'hp', 'HP', 'Player life points', 100);
INSERT INTO `stats` (`id`, `key`, `label`, `description`, `base_value`) VALUES (2, 'mp', 'MP', 'Player magic points', 100);
INSERT INTO `stats` (`id`, `key`, `label`, `description`, `base_value`) VALUES (3, 'atk', 'Atk', 'Player attack points', 100);
INSERT INTO `stats` (`id`, `key`, `label`, `description`, `base_value`) VALUES (4, 'def', 'Def', 'Player defense points', 100);
INSERT INTO `stats` (`id`, `key`, `label`, `description`, `base_value`) VALUES (5, 'dodge', 'Dodge', 'Player dodge points', 100);
INSERT INTO `stats` (`id`, `key`, `label`, `description`, `base_value`) VALUES (6, 'speed', 'Speed', 'Player speed point', 100);
INSERT INTO `stats` (`id`, `key`, `label`, `description`, `base_value`) VALUES (7, 'aim', 'Aim', 'Player aim points', 100);
INSERT INTO `stats` (`id`, `key`, `label`, `description`, `base_value`) VALUES (8, 'stamina', 'Stamina', 'Player stamina points', 100);
INSERT INTO `stats` (`id`, `key`, `label`, `description`, `base_value`) VALUES (9, 'mgk-atk', 'Magic Atk', 'Player magic attack', 100);
INSERT INTO `stats` (`id`, `key`, `label`, `description`, `base_value`) VALUES (10, 'mgk-def', 'Magic Def', 'Player magic defense', 100);
UPDATE `stats` SET `customData`='{"showBase":true}' WHERE  `key`='hp';
UPDATE `stats` SET `customData`='{"showBase":true}' WHERE  `key`='mp';
UPDATE `stats` SET `customData`='{"showBase":true}' WHERE  `key`='stamina';

INSERT IGNORE INTO players_stats (id, player_id, stat_id, base_value, `value`)
SELECT NULL, p.id AS playerId, ps.id AS statId, ps.base_value AS statValue, ps.base_value AS currentValue
    FROM players AS p
    JOIN stats AS ps;

#######################################################################################################################
# Skills system:
#######################################################################################################################

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;

-- Dumping structure for table skills_class_path
CREATE TABLE IF NOT EXISTS `skills_class_path` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `levels_set_id` int(11) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `levels_set_id` (`levels_set_id`),
  CONSTRAINT `FK_skills_class_path_skills_levels_set` FOREIGN KEY (`levels_set_id`) REFERENCES `skills_levels_set` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping structure for table skills_class_path_level_labels
CREATE TABLE IF NOT EXISTS `skills_class_path_level_labels` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `class_path_id` int(11) unsigned NOT NULL,
  `level_key` int(11) unsigned NOT NULL,
  `label` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `class_path_id_level_key` (`class_path_id`,`level_key`),
  KEY `class_path_id` (`class_path_id`),
  KEY `level_key` (`level_key`),
  CONSTRAINT `FK__skills_class_path` FOREIGN KEY (`class_path_id`) REFERENCES `skills_class_path` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_skills_class_path_level_labels_skills_levels` FOREIGN KEY (`level_key`) REFERENCES `skills_levels` (`key`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping structure for table skills_class_path_level_skills
CREATE TABLE IF NOT EXISTS `skills_class_path_level_skills` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `class_path_id` int(11) unsigned NOT NULL,
  `level_key` int(11) unsigned NOT NULL,
  `skill_id` int(11) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `class_path_id` (`class_path_id`),
  KEY `level_key` (`level_key`),
  KEY `skill_id` (`skill_id`),
  CONSTRAINT `FK_skills_class_path_level_skills_skills_class_path` FOREIGN KEY (`class_path_id`) REFERENCES `skills_class_path` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_skills_class_path_level_skills_skills_levels` FOREIGN KEY (`level_key`) REFERENCES `skills_levels` (`key`) ON UPDATE CASCADE,
  CONSTRAINT `FK_skills_class_path_level_skills_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping structure for table skills_groups
CREATE TABLE IF NOT EXISTS `skills_groups` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `sort` int(11) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping structure for table skills_levels
CREATE TABLE IF NOT EXISTS `skills_levels` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `key` int(11) unsigned NOT NULL,
  `label` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `required_experience` bigint(20) unsigned DEFAULT NULL,
  `level_set_id` int(11) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`),
  KEY `level_set_id` (`level_set_id`),
  CONSTRAINT `FK_skills_levels_skills_levels_set` FOREIGN KEY (`level_set_id`) REFERENCES `skills_levels_set` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping structure for table skills_levels_modifiers
CREATE TABLE IF NOT EXISTS `skills_levels_modifiers` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `level_key` int(11) unsigned NOT NULL,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `operation` int(11) unsigned NOT NULL,
  `value` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `minValue` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `maxValue` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `minProperty` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `maxProperty` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `level_key` (`level_key`),
  KEY `modifier_id` (`key`) USING BTREE,
  CONSTRAINT `FK__skills_levels` FOREIGN KEY (`level_key`) REFERENCES `skills_levels` (`key`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Modifiers table.';

-- Dumping structure for table skills_levels_modifiers_conditions
CREATE TABLE IF NOT EXISTS `skills_levels_modifiers_conditions` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `levels_modifier_id` int(11) unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` varchar(50) COLLATE utf32_unicode_ci NOT NULL COMMENT 'eq,ne,lt,gt,le,ge',
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `levels_modifier_id` (`levels_modifier_id`) USING BTREE,
  CONSTRAINT `FK_skills_levels_modifiers_conditions_skills_levels_modifiers` FOREIGN KEY (`levels_modifier_id`) REFERENCES `skills_levels_modifiers` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf32 COLLATE=utf32_unicode_ci;

-- Dumping structure for table skills_levels_set
CREATE TABLE IF NOT EXISTS `skills_levels_set` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `autoFillRanges` int(1) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping structure for table skills_owners_class_path
CREATE TABLE IF NOT EXISTS `skills_owners_class_path` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `class_path_id` int(11) unsigned NOT NULL,
  `owner_id` int(11) unsigned NOT NULL,
  `currentLevel` bigint(20) unsigned NOT NULL DEFAULT '0',
  `currentExp` bigint(20) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `level_set_id` (`class_path_id`) USING BTREE,
  CONSTRAINT `FK_skills_owners_class_path_skills_class_path` FOREIGN KEY (`class_path_id`) REFERENCES `skills_class_path` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping structure for table skills_skill
CREATE TABLE `skills_skill` (
	`id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`type` VARCHAR(255) NOT NULL COMMENT 'B: 1, ATK: 2, EFCT: 3, PHYS-ATK: 4, PHYS-EFCT: 5' COLLATE 'utf8_unicode_ci',
	`autoValidation` INT(1) NOT NULL,
	`skillDelay` INT(11) NOT NULL,
	`castTime` INT(11) NOT NULL,
	`usesLimit` INT(11) NOT NULL DEFAULT '0',
	`range` INT(11) NOT NULL,
	`rangeAutomaticValidation` INT(1) NOT NULL,
	`rangePropertyX` VARCHAR(255) NOT NULL COMMENT 'Property path' COLLATE 'utf8_unicode_ci',
	`rangePropertyY` VARCHAR(255) NOT NULL COMMENT 'Property path' COLLATE 'utf8_unicode_ci',
	`rangeTargetPropertyX` VARCHAR(255) NULL DEFAULT NULL COMMENT 'Target property path' COLLATE 'utf8_unicode_ci',
	`rangeTargetPropertyY` VARCHAR(255) NULL DEFAULT NULL COMMENT 'Target property path' COLLATE 'utf8_unicode_ci',
	`allowSelfTarget` INT(1) NOT NULL,
	`criticalChance` INT(11) NULL DEFAULT NULL,
	`criticalMultiplier` INT(11) NULL DEFAULT NULL,
	`criticalFixedValue` INT(11) NULL DEFAULT NULL,
	`customData` TEXT NULL DEFAULT NULL COMMENT 'Any custom data, recommended JSON format.' COLLATE 'utf8_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `key` (`key`) USING BTREE
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;


-- Dumping structure for table skills_skill_attack
CREATE TABLE IF NOT EXISTS `skills_skill_attack` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int(11) unsigned NOT NULL,
  `affectedProperty` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `allowEffectBelowZero` int(1) unsigned NOT NULL DEFAULT '0',
  `hitDamage` int(11) unsigned NOT NULL,
  `applyDirectDamage` int(1) unsigned NOT NULL DEFAULT '0',
  `attackProperties` text COLLATE utf8_unicode_ci NOT NULL,
  `defenseProperties` text COLLATE utf8_unicode_ci NOT NULL,
  `aimProperties` text COLLATE utf8_unicode_ci NOT NULL,
  `dodgeProperties` text COLLATE utf8_unicode_ci NOT NULL,
  `dodgeFullEnabled` int(1) NOT NULL DEFAULT '1',
  `dodgeOverAimSuccess` int(11) NOT NULL DEFAULT '2',
  `damageAffected` int(1) NOT NULL DEFAULT '0',
  `criticalAffected` int(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `skill_id` (`skill_id`),
  CONSTRAINT `FK__skills_skill_attack` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping structure for table skills_skill_group_relation
CREATE TABLE IF NOT EXISTS `skills_skill_group_relation` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int(11) unsigned NOT NULL,
  `group_id` int(11) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `group_id` (`group_id`),
  KEY `skill_id` (`skill_id`),
  CONSTRAINT `FK__skills_groups` FOREIGN KEY (`group_id`) REFERENCES `skills_groups` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK__skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping structure for table skills_skill_owner_conditions
CREATE TABLE `skills_skill_owner_conditions` (
	`id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
	`skill_id` INT(11) UNSIGNED NOT NULL,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`property_key` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`conditional` VARCHAR(50) NOT NULL COMMENT 'eq,ne,lt,gt,le,ge' COLLATE 'utf32_unicode_ci',
	`value` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `skill_id` (`skill_id`) USING BTREE,
	CONSTRAINT `FK_skills_skill_owner_conditions_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) COLLATE='utf32_unicode_ci' ENGINE=InnoDB;

-- Dumping structure for table skills_skill_owner_effects
CREATE TABLE IF NOT EXISTS `skills_skill_owner_effects` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int(11) unsigned NOT NULL,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `operation` int(11) NOT NULL,
  `value` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `minValue` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `maxValue` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `minProperty` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `maxProperty` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `skill_id` (`skill_id`) USING BTREE,
  CONSTRAINT `FK_skills_skill_owner_effects_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Modifiers table.';

-- Dumping structure for table skills_skill_owner_effects_conditions
CREATE TABLE IF NOT EXISTS `skills_skill_owner_effects_conditions` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `skill_owner_effect_id` int(11) unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` varchar(50) COLLATE utf32_unicode_ci NOT NULL COMMENT 'eq,ne,lt,gt,le,ge',
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `skill_owner_effect_id` (`skill_owner_effect_id`) USING BTREE,
  CONSTRAINT `FK_skills_skill_owner_effects_conditions_skill_owner_effects` FOREIGN KEY (`skill_owner_effect_id`) REFERENCES `skills_skill_owner_effects` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf32 COLLATE=utf32_unicode_ci;

-- Dumping structure for table skills_skill_physical_data
CREATE TABLE IF NOT EXISTS `skills_skill_physical_data` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int(11) unsigned NOT NULL,
  `magnitude` int(11) unsigned NOT NULL,
  `objectWidth` int(11) unsigned NOT NULL,
  `objectHeight` int(11) unsigned NOT NULL,
  `validateTargetOnHit` int(1) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `attack_skill_id` (`skill_id`) USING BTREE,
  CONSTRAINT `FK_skills_skill_physical_data_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping structure for table skills_skill_target_effects
CREATE TABLE IF NOT EXISTS `skills_skill_target_effects` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int(11) unsigned NOT NULL,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `operation` int(11) unsigned NOT NULL,
  `value` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `minValue` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `maxValue` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `minProperty` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `maxProperty` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `skill_id` (`skill_id`) USING BTREE,
  CONSTRAINT `FK_skills_skill_effect_modifiers` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Modifiers table.';

-- Dumping structure for table skills_skill_target_effects_conditions
CREATE TABLE IF NOT EXISTS `skills_skill_target_effects_conditions` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `skill_target_effect_id` int(11) unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` varchar(50) COLLATE utf32_unicode_ci NOT NULL COMMENT 'eq,ne,lt,gt,le,ge',
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `skill_target_effect_id` (`skill_target_effect_id`) USING BTREE,
  CONSTRAINT `FK_skills_skill_target_effects_conditions_skill_target_effects` FOREIGN KEY (`skill_target_effect_id`) REFERENCES `skills_skill_target_effects` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf32 COLLATE=utf32_unicode_ci;

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;

#######################################################################################################################

-- Dumping data for table skills_class_path: ~1 rows (approximately)
/*!40000 ALTER TABLE `skills_class_path` DISABLE KEYS */;
INSERT INTO `skills_class_path` (`id`, `key`, `label`, `levels_set_id`) VALUES (1, 'mage', 'Mage', 1);
/*!40000 ALTER TABLE `skills_class_path` ENABLE KEYS */;

-- Dumping data for table skills_class_path_level_labels: ~2 rows (approximately)
/*!40000 ALTER TABLE `skills_class_path_level_labels` DISABLE KEYS */;
INSERT INTO `skills_class_path_level_labels` (`id`, `class_path_id`, `level_key`, `label`) VALUES
	(1, 1, 1, 'Apprentice'),
	(2, 1, 4, 'Mage');
INSERT INTO `skills_class_path_level_labels` (`id`, `class_path_id`, `level_key`, `label`) VALUES (3, 1, 8, 'Warlock');
/*!40000 ALTER TABLE `skills_class_path_level_labels` ENABLE KEYS */;

-- Dumping data for table skills_class_path_level_skills: ~2 rows (approximately)
/*!40000 ALTER TABLE `skills_class_path_level_skills` DISABLE KEYS */;
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_key`, `skill_id`) VALUES
	(1, 1, 1, 1),
	(2, 1, 1, 2);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_key`, `skill_id`) VALUES (4, 1, 8, 4);
/*!40000 ALTER TABLE `skills_class_path_level_skills` ENABLE KEYS */;
-- Dumping data for table skills_levels: ~3 rows (approximately)
/*!40000 ALTER TABLE `skills_levels` DISABLE KEYS */;
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES
	(1, 1, '1', 0, 1),
	(2, 4, '4', 100, 1),
	(3, 2, '2', 50, 1);
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (4, 5, '5', 200, 1);
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (5, 6, '6', 250, 1);
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (6, 7, '7', 300, 1);
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (7, 8, '8', 500, 1);

/*!40000 ALTER TABLE `skills_levels` ENABLE KEYS */;
-- Dumping data for table skills_levels_modifiers: ~6 rows (approximately)
/*!40000 ALTER TABLE `skills_levels_modifiers` DISABLE KEYS */;
INSERT INTO `skills_levels_modifiers` (`id`, `level_key`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES
	(1, 1, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL),
	(2, 1, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL),
	(3, 4, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL),
	(4, 4, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL),
	(5, 2, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL),
	(6, 2, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_key`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (7, 5, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_key`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (8, 6, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_key`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (9, 7, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_key`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (10, 5, 'inc_hp', 'statsBase/hp', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_key`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (11, 5, 'inc_mp', 'statsBase/mp', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_key`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (12, 8, 'inc_hp', 'statsBase/hp', 1, '40', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_key`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (13, 8, 'inc_mp', 'statsBase/mp', 1, '40', NULL, NULL, NULL, NULL);
/*!40000 ALTER TABLE `skills_levels_modifiers` ENABLE KEYS */;
-- Dumping data for table skills_levels_set: ~1 rows (approximately)
/*!40000 ALTER TABLE `skills_levels_set` DISABLE KEYS */;
INSERT INTO `skills_levels_set` (`id`, `autoFillRanges`) VALUES
	(1, 1);
/*!40000 ALTER TABLE `skills_levels_set` ENABLE KEYS */;
-- Dumping data for table skills_owners_class_path: ~4 rows (approximately)
/*!40000 ALTER TABLE `skills_owners_class_path` DISABLE KEYS */;
INSERT INTO `skills_owners_class_path` (`id`, `class_path_id`, `owner_id`, `currentLevel`, `currentExp`) VALUES
	(1, 1, 1, 1, 0),
	(2, 1, 2, 1, 0),
	(3, 1, 3, 1, 0),
	(4, 1, 17, 1, 0);
/*!40000 ALTER TABLE `skills_owners_class_path` ENABLE KEYS */;
-- Dumping data for table skills_skill: ~2 rows (approximately)
/*!40000 ALTER TABLE `skills_skill` DISABLE KEYS */;
INSERT INTO `skills_skill` (`id`, `key`, `type`, `autoValidation`, `skillDelay`, `castTime`, `usesLimit`, `range`, `rangeAutomaticValidation`, `rangePropertyX`, `rangePropertyY`, `rangeTargetPropertyX`, `rangeTargetPropertyY`, `allowSelfTarget`, `criticalChance`, `criticalMultiplier`, `criticalFixedValue`) VALUES
	(1, 'attackBullet', '4', 0, 1000, 0, 0, 250, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0),
	(2, 'attackShort', '2', 0, 600, 0, 0, 50, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0);
/*!40000 ALTER TABLE `skills_skill` ENABLE KEYS */;
-- Dumping data for table skills_skill_attack: ~2 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_attack` DISABLE KEYS */;
INSERT INTO `skills_skill_attack` (`id`, `skill_id`, `affectedProperty`, `allowEffectBelowZero`, `hitDamage`, `applyDirectDamage`, `attackProperties`, `defenseProperties`, `aimProperties`, `dodgeProperties`, `dodgeFullEnabled`, `dodgeOverAimSuccess`, `damageAffected`, `criticalAffected`) VALUES
	(1, 1, 'stats/hp', 0, 3, 0, 'stats/atk,stats/stamina,stats/speed', 'stats/def,stats/stamina,stats/speed', 'stats/aim', 'stats/dodge', 1, 2, 0, 0),
	(2, 2, 'stats/hp', 0, 5, 0, 'stats/atk,stats/stamina,stats/speed', 'stats/def,stats/stamina,stats/speed', 'stats/aim', 'stats/dodge', 1, 2, 0, 0);
/*!40000 ALTER TABLE `skills_skill_attack` ENABLE KEYS */;-- Dumping data for table skills_skill_physical_data: ~1 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_physical_data` DISABLE KEYS */;
INSERT INTO `skills_skill_physical_data` (`id`, `skill_id`, `magnitude`, `objectWidth`, `objectHeight`, `validateTargetOnHit`) VALUES
	(1, 1, 350, 5, 5, 0);
/*!40000 ALTER TABLE `skills_skill_physical_data` ENABLE KEYS */;

# New ClassPath:
INSERT INTO skills_owners_class_path (class_path_id, owner_id, currentLevel, currentExp)
    SELECT 1 AS class_path_id, id AS owner_id, 1 AS currentLevel, 0 AS currentExp
    FROM players;

# New Fireball:
INSERT INTO `skills_skill` (`id`, `key`, `type`, `autoValidation`, `skillDelay`, `castTime`, `usesLimit`, `range`, `rangeAutomaticValidation`, `rangePropertyX`, `rangePropertyY`, `rangeTargetPropertyX`, `rangeTargetPropertyY`, `allowSelfTarget`, `criticalChance`, `criticalMultiplier`, `criticalFixedValue`) VALUES (3, 'fireball', '4', 0, 1500, 2000, 0, 280, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0);
INSERT INTO `skills_skill_attack` (`id`, `skill_id`, `affectedProperty`, `allowEffectBelowZero`, `hitDamage`, `applyDirectDamage`, `attackProperties`, `defenseProperties`, `aimProperties`, `dodgeProperties`, `dodgeFullEnabled`, `dodgeOverAimSuccess`, `damageAffected`, `criticalAffected`) VALUES (3, 3, 'stats/hp', 0, 7, 0, 'stats/atk,stats/stamina,stats/speed', 'stats/def,stats/stamina,stats/speed', 'stats/aim', 'stats/dodge', 1, 2, 0, 0);
INSERT INTO `skills_skill_physical_data` (`skill_id`, `magnitude`, `objectWidth`, `objectHeight`) VALUES ('3', '550', '5', '5');
INSERT INTO `skills_class_path_level_skills` (`class_path_id`, `level_key`, `skill_id`) VALUES ('1', '5', '3');

# Bullet:
INSERT INTO `skills_skill_owner_conditions` (`id`, `skill_id`, `key`, `property_key`, `conditional`, `value`) VALUES (NULL, 3, 'available_mp', 'stats/mp', 'ge', '5');
INSERT INTO `skills_skill_owner_effects` (`id`, `skill_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, 3, 'dec_mp', 'stats/mp', 2, '5', '0', '', NULL, NULL);

# Heal:
INSERT INTO `skills_skill` (`id`, `key`, `type`, `autoValidation`, `skillDelay`, `castTime`, `usesLimit`, `range`, `rangeAutomaticValidation`, `rangePropertyX`, `rangePropertyY`, `rangeTargetPropertyX`, `rangeTargetPropertyY`, `allowSelfTarget`, `criticalChance`, `criticalMultiplier`, `criticalFixedValue`, `customData`) VALUES (4, 'heal', '3', 0, 1500, 2000, 0, 100, 1, 'state/x', 'state/y', NULL, NULL, 1, 0, 1, 0, NULL);
INSERT INTO `skills_skill_target_effects` (`id`, `skill_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (1, 4, 'heal', 'stats/hp', 1, '10', '0', '0', NULL, 'statsBase/hp');

# Skills animations:
CREATE TABLE `skills_skill_animations` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`skill_id` INT(10) UNSIGNED NOT NULL,
	`key` VARCHAR(255) NOT NULL COMMENT 'Name conventions [key] + _atk, _cast, _bullet, _hit or _death.' COLLATE 'utf8_unicode_ci',
	`classKey` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8_unicode_ci',
	`animationData` TEXT NOT NULL COLLATE 'utf8_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `skill_id_key` (`skill_id`, `key`) USING BTREE,
	INDEX `id` (`id`) USING BTREE,
	INDEX `key` (`key`) USING BTREE,
	INDEX `skill_id` (`skill_id`) USING BTREE,
	CONSTRAINT `FK_skills_skill_animations_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

# Skills Animations:
INSERT INTO `skills_skill_animations` (`id`, `skill_id`, `key`, `classKey`, `animationData`) VALUES (1, 3, 'bullet', NULL, '{"enabled":true,"type":"spritesheet","img":"fireball_bullet","frameWidth":64,"frameHeight":64,"start":0,"end":3,"repeat":-1,"rate":1,"dir":3}');
INSERT INTO `skills_skill_animations` (`id`, `skill_id`, `key`, `classKey`, `animationData`) VALUES (2, 3, 'cast', NULL, '{"enabled":true,"type":"spritesheet","img":"fireball_cast","frameWidth":64,"frameHeight":70,"start":0,"end":3,"repeat":-1,"destroyTime":2000,"depthByPlayer":"above"}');
INSERT INTO `skills_skill_animations` (`id`, `skill_id`, `key`, `classKey`, `animationData`) VALUES (3, 4, 'cast', NULL, '{"enabled":true,"type":"spritesheet","img":"heal_cast","frameWidth":64,"frameHeight":70,"start":0,"end":3,"repeat":-1,"destroyTime":2000}');
INSERT INTO `skills_skill_animations` (`id`, `skill_id`, `key`, `classKey`, `animationData`) VALUES (6, 4, 'hit', NULL, '{"enabled":true,"type":"spritesheet","img":"heal_hit","frameWidth":64,"frameHeight":70,"start":0,"end":4,"repeat":0,"depthByPlayer":"above"}');

#######################################################################################################################

# Players RESET!
UPDATE skills_owners_class_path SET currentLevel = 1, currentExp = 0;
UPDATE players_stats SET `value` = 100, base_value = 100;
UPDATE items_inventory SET is_active = 0 WHERE is_active = 1;

#######################################################################################################################
