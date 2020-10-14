
# Fix config:

UPDATE `config` SET `path`='rooms/world/onlyWalkable' WHERE `path`='rooms/world/onlyWalkeable';

# Feature pack:

INSERT INTO `features` (`code`, `title`, `is_enabled`) VALUES ('actions', 'Actions', '1');

# Stats:
ALTER TABLE `players_stats` ADD COLUMN `aim` INT(10) UNSIGNED NOT NULL AFTER `dodge`;
UPDATE players_stats SET aim = 100;
INSERT INTO `reldens`.`config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'players/initialStats/aim', '100', 'i');

#######################################################################################################################
# Skills system:
#######################################################################################################################
-- --------------------------------------------------------
-- Host:                         localhost
-- Server version:               5.7.26 - MySQL Community Server (GPL)
-- Server OS:                    Win64
-- HeidiSQL Version:             11.0.0.5919
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;

-- Dumping structure for table reldens.skills_class_path
CREATE TABLE IF NOT EXISTS `skills_class_path` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `levels_set_id` int(11) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `levels_set_id` (`levels_set_id`),
  CONSTRAINT `FK_skills_class_path_skills_levels_set` FOREIGN KEY (`levels_set_id`) REFERENCES `skills_levels_set` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.skills_class_path: ~1 rows (approximately)
/*!40000 ALTER TABLE `skills_class_path` DISABLE KEYS */;
INSERT INTO `skills_class_path` (`id`, `key`, `label`, `levels_set_id`) VALUES
	(1, 'mage', 'Mage', 1);
/*!40000 ALTER TABLE `skills_class_path` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_class_path_level_labels
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

-- Dumping data for table reldens.skills_class_path_level_labels: ~2 rows (approximately)
/*!40000 ALTER TABLE `skills_class_path_level_labels` DISABLE KEYS */;
INSERT INTO `skills_class_path_level_labels` (`id`, `class_path_id`, `level_key`, `label`) VALUES
	(1, 1, 1, 'Apprentice'),
	(2, 1, 4, 'Mage');
/*!40000 ALTER TABLE `skills_class_path_level_labels` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_class_path_level_skills
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

-- Dumping data for table reldens.skills_class_path_level_skills: ~2 rows (approximately)
/*!40000 ALTER TABLE `skills_class_path_level_skills` DISABLE KEYS */;
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_key`, `skill_id`) VALUES
	(1, 1, 1, 1),
	(2, 1, 1, 2);
/*!40000 ALTER TABLE `skills_class_path_level_skills` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_groups
CREATE TABLE IF NOT EXISTS `skills_groups` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `sort` int(11) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.skills_groups: ~0 rows (approximately)
/*!40000 ALTER TABLE `skills_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `skills_groups` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_levels
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

-- Dumping data for table reldens.skills_levels: ~3 rows (approximately)
/*!40000 ALTER TABLE `skills_levels` DISABLE KEYS */;
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES
	(1, 1, '1', 0, 1),
	(2, 4, '4', 100, 1),
	(3, 2, '2', 50, 1);
/*!40000 ALTER TABLE `skills_levels` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_levels_modifiers
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

-- Dumping data for table reldens.skills_levels_modifiers: ~6 rows (approximately)
/*!40000 ALTER TABLE `skills_levels_modifiers` DISABLE KEYS */;
INSERT INTO `skills_levels_modifiers` (`id`, `level_key`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES
	(1, 1, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL),
	(2, 1, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL),
	(3, 4, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL),
	(4, 4, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL),
	(5, 2, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL),
	(6, 2, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL);
/*!40000 ALTER TABLE `skills_levels_modifiers` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_levels_modifiers_conditions
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

-- Dumping data for table reldens.skills_levels_modifiers_conditions: ~0 rows (approximately)
/*!40000 ALTER TABLE `skills_levels_modifiers_conditions` DISABLE KEYS */;
/*!40000 ALTER TABLE `skills_levels_modifiers_conditions` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_levels_set
CREATE TABLE IF NOT EXISTS `skills_levels_set` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `autoFillRanges` int(1) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.skills_levels_set: ~1 rows (approximately)
/*!40000 ALTER TABLE `skills_levels_set` DISABLE KEYS */;
INSERT INTO `skills_levels_set` (`id`, `autoFillRanges`) VALUES
	(1, 1);
/*!40000 ALTER TABLE `skills_levels_set` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_owners_class_path
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

-- Dumping data for table reldens.skills_owners_class_path: ~4 rows (approximately)
/*!40000 ALTER TABLE `skills_owners_class_path` DISABLE KEYS */;
INSERT INTO `skills_owners_class_path` (`id`, `class_path_id`, `owner_id`, `currentLevel`, `currentExp`) VALUES
	(1, 1, 1, 1, 0),
	(2, 1, 2, 1, 0),
	(3, 1, 3, 1, 0),
	(4, 1, 17, 1, 0);
/*!40000 ALTER TABLE `skills_owners_class_path` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill
CREATE TABLE IF NOT EXISTS `skills_skill` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `type` varchar(255) COLLATE utf8_unicode_ci NOT NULL COMMENT 'B: 1, ATK: 2, EFCT: 3, PHYS-ATK: 4, PHYS-EFCT: 5',
  `autoValidation` int(1) NOT NULL,
  `skillDelay` int(11) NOT NULL,
  `castTime` int(11) NOT NULL,
  `usesLimit` int(11) NOT NULL DEFAULT '0',
  `range` int(11) NOT NULL,
  `rangeAutomaticValidation` int(1) NOT NULL,
  `rangePropertyX` varchar(255) COLLATE utf8_unicode_ci NOT NULL COMMENT 'Property path',
  `rangePropertyY` varchar(255) COLLATE utf8_unicode_ci NOT NULL COMMENT 'Property path',
  `rangeTargetPropertyX` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT 'Target property path',
  `rangeTargetPropertyY` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT 'Target property path',
  `allowSelfTarget` int(1) NOT NULL,
  `criticalChance` int(11) DEFAULT NULL,
  `criticalMultiplier` int(11) DEFAULT NULL,
  `criticalFixedValue` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.skills_skill: ~2 rows (approximately)
/*!40000 ALTER TABLE `skills_skill` DISABLE KEYS */;
INSERT INTO `skills_skill` (`id`, `key`, `type`, `autoValidation`, `skillDelay`, `castTime`, `usesLimit`, `range`, `rangeAutomaticValidation`, `rangePropertyX`, `rangePropertyY`, `rangeTargetPropertyX`, `rangeTargetPropertyY`, `allowSelfTarget`, `criticalChance`, `criticalMultiplier`, `criticalFixedValue`) VALUES
	(1, 'attackBullet', '4', 0, 1000, 0, 0, 250, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0),
	(2, 'attackShort', '2', 0, 600, 0, 0, 50, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0);
/*!40000 ALTER TABLE `skills_skill` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_attack
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

-- Dumping data for table reldens.skills_skill_attack: ~2 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_attack` DISABLE KEYS */;
INSERT INTO `skills_skill_attack` (`id`, `skill_id`, `affectedProperty`, `allowEffectBelowZero`, `hitDamage`, `applyDirectDamage`, `attackProperties`, `defenseProperties`, `aimProperties`, `dodgeProperties`, `dodgeFullEnabled`, `dodgeOverAimSuccess`, `damageAffected`, `criticalAffected`) VALUES
	(1, 1, 'stats/hp', 0, 3, 0, 'stats/atk,stats/stamina,stats/speed', 'stats/def,stats/stamina,stats/speed', 'stats/aim', 'stats/dodge', 1, 2, 0, 0),
	(2, 2, 'stats/hp', 0, 5, 0, 'stats/atk,stats/stamina,stats/speed', 'stats/def,stats/stamina,stats/speed', 'stats/aim', 'stats/dodge', 1, 2, 0, 0);
/*!40000 ALTER TABLE `skills_skill_attack` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_group_relation
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

-- Dumping data for table reldens.skills_skill_group_relation: ~0 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_group_relation` DISABLE KEYS */;
/*!40000 ALTER TABLE `skills_skill_group_relation` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_owner_conditions
CREATE TABLE IF NOT EXISTS `skills_skill_owner_conditions` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int(11) unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` varchar(50) COLLATE utf32_unicode_ci NOT NULL COMMENT 'eq,ne,lt,gt,le,ge',
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `skill_id` (`skill_id`),
  CONSTRAINT `FK_skills_skill_owner_conditions_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf32 COLLATE=utf32_unicode_ci;

-- Dumping data for table reldens.skills_skill_owner_conditions: ~1 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_owner_conditions` DISABLE KEYS */;
INSERT INTO `skills_skill_owner_conditions` (`id`, `skill_id`, `key`, `property_key`, `operation`, `value`) VALUES
	(1, 1, 'available_mp', 'stats/mp', 'ge', '5');
/*!40000 ALTER TABLE `skills_skill_owner_conditions` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_owner_effects
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

-- Dumping data for table reldens.skills_skill_owner_effects: ~1 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_owner_effects` DISABLE KEYS */;
INSERT INTO `skills_skill_owner_effects` (`id`, `skill_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES
	(1, 1, 'dec_mp', 'stats/mp', 2, '5', '0', '', NULL, NULL);
/*!40000 ALTER TABLE `skills_skill_owner_effects` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_owner_effects_conditions
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

-- Dumping data for table reldens.skills_skill_owner_effects_conditions: ~0 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_owner_effects_conditions` DISABLE KEYS */;
/*!40000 ALTER TABLE `skills_skill_owner_effects_conditions` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_physical_data
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

-- Dumping data for table reldens.skills_skill_physical_data: ~1 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_physical_data` DISABLE KEYS */;
INSERT INTO `skills_skill_physical_data` (`id`, `skill_id`, `magnitude`, `objectWidth`, `objectHeight`, `validateTargetOnHit`) VALUES
	(1, 1, 350, 5, 5, 0);
/*!40000 ALTER TABLE `skills_skill_physical_data` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_target_effects
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

-- Dumping data for table reldens.skills_skill_target_effects: ~0 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_target_effects` DISABLE KEYS */;
/*!40000 ALTER TABLE `skills_skill_target_effects` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_target_effects_conditions
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

-- Dumping data for table reldens.skills_skill_target_effects_conditions: ~0 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_target_effects_conditions` DISABLE KEYS */;
/*!40000 ALTER TABLE `skills_skill_target_effects_conditions` ENABLE KEYS */;

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;

#######################################################################################################################

# Class path:
INSERT INTO skills_owners_class_path (class_path_id, owner_id, currentLevel, currentExp)
    SELECT 1 AS class_path_id, id AS owner_id, 1 AS currentLevel, 0 AS currentExp
    FROM players;
