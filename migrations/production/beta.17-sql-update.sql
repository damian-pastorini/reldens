#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# Config:

INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'players/gameOver/TimeOut', '1', 'b');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/controls/tabTarget', '1', 'b');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/controls/disableContextMenu', '1', 'b');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/controls/primaryMove', '1', 'b');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/instructions/enabled', '1', 'b');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/instructions/responsiveX', '100', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/instructions/responsiveY', '100', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/instructions/x', '380', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/instructions/y', '940', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/players/showNames', '1', 'b');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/players/nameHeight', '15', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/players/nameFill', '#ffffff', 't');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/players/nameStroke', '#000000', 't');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/players/nameStrokeThickness', '4', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/players/nameShadowColor', 'rgba(0,0,0,0.7)', 't');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/players/nameFontFamily', 'Verdana, Geneva, sans-serif', 't');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/players/nameFontSize', '12', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/lifeBar/top', '10', 'i');
UPDATE `config` SET `value`='{"key":"default_hit","animationData":{"enabled":true,"type":"spritesheet","img":"default_hit","frameWidth":64,"frameHeight":64,"start":0,"end":3,"repeat":0,"depthByPlayer":"above"}}' WHERE `path`='skills/animations/default_hit';
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'actions/damage/enabled', '1', 'b');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'actions/damage/showAll', '0', 'b');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'actions/damage/font', 'Verdana, Geneva, sans-serif', 't');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'actions/damage/color', '#ff0000', 't');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'actions/damage/duration', '600', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'actions/damage/top', '50', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'actions/damage/fontSize', '14', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'actions/damage/stroke', '#000000', 't');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'actions/damage/strokeThickness', '4', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'actions/damage/shadowColor', 'rgba(0,0,0,0.7)', 't');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/lifeBar/fillStyle', '0xff0000', 't');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/lifeBar/lineStyle', '0xffffff', 't');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/lifeBar/showAllPlayers', '0', 'b');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/lifeBar/showEnemies', '1', 'b');
# Note: these will put the lifeBar fixed below the player data box in the top/left corner.
UPDATE `config` SET `value`= '5' WHERE `path` = 'ui/lifeBar/x';
UPDATE `config` SET `value`= '12' WHERE `path` = 'ui/lifeBar/y';
UPDATE `config` SET `value`= '1' WHERE `path` = 'ui/lifeBar/responsiveX';
UPDATE `config` SET `value`= '24' WHERE `path` = 'ui/lifeBar/responsiveY';

# Skills level up animations:

CREATE TABLE `skills_class_level_up_animations` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`class_path_id` INT(10) UNSIGNED NULL DEFAULT NULL,
	`level_id` INT(10) UNSIGNED NULL DEFAULT NULL,
	`animationData` TEXT NOT NULL COLLATE 'utf8_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `class_path_id_level_id` (`class_path_id`, `level_id`) USING BTREE,
	INDEX `FK_skills_class_level_up_skills_levels` (`level_id`) USING BTREE,
	CONSTRAINT `FK_skills_class_level_up_skills_class_path` FOREIGN KEY (`class_path_id`) REFERENCES `skills_class_path` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
	CONSTRAINT `FK_skills_class_level_up_skills_levels` FOREIGN KEY (`level_id`) REFERENCES `skills_levels` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

# Single level up for all classes and levels:

INSERT INTO `skills_class_level_up_animations` (`animationData`) VALUES ('{"enabled":true,"type":"spritesheet","img":"heal_cast","frameWidth":64,"frameHeight":70,"start":0,"end":3,"repeat":-1,"destroyTime":2000,"depthByPlayer":"above"}');

# Skills module update:

ALTER TABLE `skills_levels_set` ADD COLUMN `autoFillExperienceMultiplier` INT(1) UNSIGNED NULL DEFAULT NULL AFTER `autoFillRanges`;

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################

## -------------------------------------------------------------------------------------------------------------------

SET FOREIGN_KEY_CHECKS=0;

TRUNCATE `skills_class_path`;
TRUNCATE `skills_levels_set`;
TRUNCATE `skills_class_path_level_labels`;
TRUNCATE `skills_class_path_level_skills`;
TRUNCATE `skills_levels`;
TRUNCATE `skills_levels_modifiers`;

UPDATE `skills_owners_class_path` SET currentLevel = 1, currentExp = 0;

## -------------------------------------------------------------------------------------------------------------------

SET @attackShort = (SELECT id FROM skills_skill WHERE `key` = 'attackShort');
SET @attackBullet = (SELECT id FROM skills_skill WHERE `key` = 'attackBullet');
SET @fireball = (SELECT id FROM skills_skill WHERE `key` = 'fireball');
SET @heal = (SELECT id FROM skills_skill WHERE `key` = 'heal');

## -------------------------------------------------------------------------------------------------------------------

INSERT INTO `skills_levels_set` (`id`, `autoFillRanges`) VALUES (NULL, 1);
SET @levelSet = (SELECT id FROM skills_levels_set ORDER BY id DESC LIMIT 1);

INSERT INTO `skills_class_path` (`id`, `key`, `label`, `levels_set_id`) VALUES (NULL, 'journeyman', 'Journeyman', @levelSet);
SET @classPath = (SELECT id FROM skills_class_path ORDER BY id DESC LIMIT 1);

## -------------------------------------------------------------------------------------------------------------------

## Level 1 - to include the initial skills
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 1, '1', 0, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (NULL, @classPath, @currentLevel, @attackShort);

## -------------------------------------------------------------------------------------------------------------------

## Level 2 - to include the base modifiers
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 2, '2', 100, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'stats/hp', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'stats/mp', 1, '10', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'statsBase/def', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'statsBase/hp', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'statsBase/mp', 1, '10', NULL, NULL, NULL, NULL);
--

## -------------------------------------------------------------------------------------------------------------------

## Level 3 & 4 autogenerated

## -------------------------------------------------------------------------------------------------------------------

## Level 5 - new skill and label
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 5, '5', 338, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (NULL, @classPath, @currentLevel, @attackBullet);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'stats/atk', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'stats/def', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'stats/hp', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'stats/mp', 1, '20', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'statsBase/atk', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'statsBase/def', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'statsBase/hp', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'statsBase/mp', 1, '20', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_class_path_level_labels` (`id`, `class_path_id`, `level_id`, `label`) VALUES (NULL, @classPath, @currentLevel, 'Old Traveler');

## -------------------------------------------------------------------------------------------------------------------

## Level 10 - for autogenareted levels 6 to 9
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 10, '10', 2570, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (NULL, @classPath, @currentLevel, @fireball);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (NULL, @classPath, @currentLevel, @heal);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'stats/atk', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'stats/def', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'stats/hp', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'stats/mp', 1, '50', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'statsBase/atk', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'statsBase/def', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'statsBase/hp', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'statsBase/mp', 1, '50', NULL, NULL, NULL, NULL);
--

## -------------------------------------------------------------------------------------------------------------------
## -------------------------------------------------------------------------------------------------------------------

INSERT INTO `skills_levels_set` (`id`, `autoFillRanges`) VALUES (NULL, 1);
SET @levelSet = (SELECT id FROM skills_levels_set ORDER BY id DESC LIMIT 1);

INSERT INTO `skills_class_path` (`id`, `key`, `label`, `levels_set_id`) VALUES (NULL, 'sorcerer', 'Sorcerer', @levelSet);
SET @classPath = (SELECT id FROM skills_class_path ORDER BY id DESC LIMIT 1);

## -------------------------------------------------------------------------------------------------------------------

## Level 1 - to include the initial skills
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 1, '1', 0, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (NULL, @classPath, @currentLevel, @attackBullet);

## -------------------------------------------------------------------------------------------------------------------

## Level 2 - to include the base modifiers
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 2, '2', 100, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'stats/hp', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'stats/mp', 1, '10', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'statsBase/def', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'statsBase/hp', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'statsBase/mp', 1, '10', NULL, NULL, NULL, NULL);
--

## -------------------------------------------------------------------------------------------------------------------

## Level 3 & 4 autogenerated

## -------------------------------------------------------------------------------------------------------------------

## Level 5 - new skill and label
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 5, '5', 338, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (NULL, @classPath, @currentLevel, @fireball);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'stats/atk', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'stats/def', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'stats/hp', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'stats/mp', 1, '20', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'statsBase/atk', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'statsBase/def', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'statsBase/hp', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'statsBase/mp', 1, '20', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_class_path_level_labels` (`id`, `class_path_id`, `level_id`, `label`) VALUES (NULL, @classPath, @currentLevel, 'Fire Master');

## -------------------------------------------------------------------------------------------------------------------

## Level 10 - for autogenareted levels 6 to 9
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 10, '10', 2570, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (NULL, @classPath, @currentLevel, @heal);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'stats/atk', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'stats/def', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'stats/hp', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'stats/mp', 1, '50', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'statsBase/atk', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'statsBase/def', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'statsBase/hp', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'statsBase/mp', 1, '50', NULL, NULL, NULL, NULL);
--

## -------------------------------------------------------------------------------------------------------------------
## -------------------------------------------------------------------------------------------------------------------

INSERT INTO `skills_levels_set` (`id`, `autoFillRanges`) VALUES (NULL, 1);
SET @levelSet = (SELECT id FROM skills_levels_set ORDER BY id DESC LIMIT 1);

INSERT INTO `skills_class_path` (`id`, `key`, `label`, `levels_set_id`) VALUES (NULL, 'warlock', 'Warlock', @levelSet);
SET @classPath = (SELECT id FROM skills_class_path ORDER BY id DESC LIMIT 1);

## -------------------------------------------------------------------------------------------------------------------

## Level 1 - to include the initial skills
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 1, '1', 0, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (NULL, @classPath, @currentLevel, @attackBullet);

## -------------------------------------------------------------------------------------------------------------------

## Level 2 - to include the base modifiers
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 2, '2', 100, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'stats/hp', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'stats/mp', 1, '10', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'statsBase/def', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'statsBase/hp', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'statsBase/mp', 1, '10', NULL, NULL, NULL, NULL);
--

## -------------------------------------------------------------------------------------------------------------------

## Level 3 & 4 autogenerated

## -------------------------------------------------------------------------------------------------------------------

## Level 5 - new skill and label
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 5, '5', 338, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (NULL, @classPath, @currentLevel, @fireball);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'stats/atk', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'stats/def', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'stats/hp', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'stats/mp', 1, '20', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'statsBase/atk', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'statsBase/def', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'statsBase/hp', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'statsBase/mp', 1, '20', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_class_path_level_labels` (`id`, `class_path_id`, `level_id`, `label`) VALUES (NULL, @classPath, @currentLevel, 'Magus');

## -------------------------------------------------------------------------------------------------------------------

## Level 10 - for autogenareted levels 6 to 9
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 10, '10', 2570, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (NULL, @classPath, @currentLevel, @attackShort);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'stats/atk', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'stats/def', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'stats/hp', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'stats/mp', 1, '50', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'statsBase/atk', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'statsBase/def', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'statsBase/hp', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'statsBase/mp', 1, '50', NULL, NULL, NULL, NULL);
--

## -------------------------------------------------------------------------------------------------------------------
## -------------------------------------------------------------------------------------------------------------------

INSERT INTO `skills_levels_set` (`id`, `autoFillRanges`) VALUES (NULL, 1);
SET @levelSet = (SELECT id FROM skills_levels_set ORDER BY id DESC LIMIT 1);

INSERT INTO `skills_class_path` (`id`, `key`, `label`, `levels_set_id`) VALUES (NULL, 'swordsman', 'Swordsman', @levelSet);
SET @classPath = (SELECT id FROM skills_class_path ORDER BY id DESC LIMIT 1);

## -------------------------------------------------------------------------------------------------------------------

## Level 1 - to include the initial skills
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 1, '1', 0, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (NULL, @classPath, @currentLevel, @attackShort);

## -------------------------------------------------------------------------------------------------------------------

## Level 2 - to include the base modifiers
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 2, '2', 100, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'stats/hp', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'stats/mp', 1, '10', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'statsBase/def', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'statsBase/hp', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'statsBase/mp', 1, '10', NULL, NULL, NULL, NULL);
--

## -------------------------------------------------------------------------------------------------------------------

## Level 3 & 4 autogenerated

## -------------------------------------------------------------------------------------------------------------------

## Level 5 - new skill and label
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 5, '5', 338, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (NULL, @classPath, @currentLevel, @heal);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'stats/atk', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'stats/def', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'stats/hp', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'stats/mp', 1, '20', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'statsBase/atk', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'statsBase/def', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'statsBase/hp', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'statsBase/mp', 1, '20', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_class_path_level_labels` (`id`, `class_path_id`, `level_id`, `label`) VALUES (NULL, @classPath, @currentLevel, 'Blade Master');

## -------------------------------------------------------------------------------------------------------------------

## Level 10 - for autogenareted levels 6 to 9
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 10, '10', 2570, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'stats/atk', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'stats/def', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'stats/hp', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'stats/mp', 1, '50', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'statsBase/atk', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'statsBase/def', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'statsBase/hp', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'statsBase/mp', 1, '50', NULL, NULL, NULL, NULL);
--

## -------------------------------------------------------------------------------------------------------------------
## -------------------------------------------------------------------------------------------------------------------

INSERT INTO `skills_levels_set` (`id`, `autoFillRanges`) VALUES (NULL, 1);
SET @levelSet = (SELECT id FROM skills_levels_set ORDER BY id DESC LIMIT 1);

INSERT INTO `skills_class_path` (`id`, `key`, `label`, `levels_set_id`) VALUES (NULL, 'warrior', 'Warrior', @levelSet);
SET @classPath = (SELECT id FROM skills_class_path ORDER BY id DESC LIMIT 1);

## -------------------------------------------------------------------------------------------------------------------

## Level 1 - to include the initial skills
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 1, '1', 0, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (NULL, @classPath, @currentLevel, @attackShort);

## -------------------------------------------------------------------------------------------------------------------

## Level 2 - to include the base modifiers
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 2, '2', 100, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'stats/hp', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'stats/mp', 1, '10', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'statsBase/def', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'statsBase/hp', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'statsBase/mp', 1, '10', NULL, NULL, NULL, NULL);
--

## -------------------------------------------------------------------------------------------------------------------

## Level 3 & 4 autogenerated

## -------------------------------------------------------------------------------------------------------------------

## Level 5 - new skill and label
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 5, '5', 338, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (NULL, @classPath, @currentLevel, @attackBullet);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'stats/atk', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'stats/def', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'stats/hp', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'stats/mp', 1, '20', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'statsBase/atk', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'statsBase/def', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'statsBase/hp', 1, '20', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'statsBase/mp', 1, '20', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_class_path_level_labels` (`id`, `class_path_id`, `level_id`, `label`) VALUES (NULL, @classPath, @currentLevel, 'Palading');

## -------------------------------------------------------------------------------------------------------------------

## Level 10 - for autogenareted levels 6 to 9
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES (NULL, 10, '10', 2570, @levelSet);
SET @currentLevel = (SELECT id FROM skills_levels ORDER BY id DESC LIMIT 1);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (NULL, @classPath, @currentLevel, @heal);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'stats/atk', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'stats/def', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'stats/hp', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'stats/mp', 1, '50', NULL, NULL, NULL, NULL);
--
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_atk', 'statsBase/atk', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_def', 'statsBase/def', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_hp', 'statsBase/hp', 1, '50', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, @currentLevel, 'inc_mp', 'statsBase/mp', 1, '50', NULL, NULL, NULL, NULL);
--

## -------------------------------------------------------------------------------------------------------------------
