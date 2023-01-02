#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

Config:
DELETE FROM `config` WHERE `scope` = 'server' AND `path`='enemies/defaultAttacks/attackBullet';
INSERT INTO `config` VALUES (NULL, 'server', 'enemies/default/skillKey', 'attackShort', 't');
INSERT INTO `config` VALUES (NULL, 'server', 'enemies/default/affectedProperty', 'stats/hp', 't');
INSERT INTO `config` VALUES (NULL, 'client', 'ui/chat/effectMessages', '1', 'b');
INSERT INTO `config` VALUES (NULL, 'client', 'ui/chat/dodgeMessages', '1', 'b');
INSERT INTO `config` VALUES (NULL, 'client', 'ui/chat/totalValidTypes', '2', 'i');
UPDATE `config` SET `value` = 50 WHERE `path` LIKE 'enemies/initialStats/%';

# Skills:
SET @heal_skill_id = (SELECT `id` FROM `skills_skill` WHERE `key` = 'heal');
INSERT INTO `skills_skill_owner_effects` VALUES (NULL, heal_skill_id, 'dec_mp', 'stats/mp', 2, '2', '0', '', NULL, NULL);

UPDATE `skills_skill_attack` SET `dodgeFullEnabled`=1;

# Room Gravity:
SET @top_down_room_id = (SELECT `id` FROM `rooms` WHERE `name` = 'TopDownRoom');
SET @house_2_room_id = (SELECT `id` FROM `rooms` WHERE `name` = 'ReldensHouse_2');
SET @town_room_id = (SELECT `id` FROM `rooms` WHERE `name` = 'ReldensTown');
UPDATE `rooms` SET `room_class_key`=NULL, `customData`='{"gravity":[0,625],"applyGravity":true,"allowPassWallsFromBelow":true,"timeStep":0.012,"type":"TOP_DOWN_WITH_GRAVITY","useFixedWorldStep":false,"maxSubSteps":5,"movementSpeed":200,"usePathFinder":false}' WHERE `id`= @top_down_room_id;
UPDATE `rooms_return_points` SET `from_room_id`=@top_down_room_id WHERE `room_id`=@town_room_id;
INSERT INTO `rooms_return_points` VALUES (@house_2_room_id, 'down', 660, 520, 0, @top_down_room_id);

# Features:
INSERT INTO `features` VALUES (11, 'prediction', 'Prediction', 0);

# Objects skills:
CREATE TABLE `objects_skills` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`object_id` INT(10) UNSIGNED NOT NULL,
	`skill_id` INT(10) UNSIGNED NOT NULL,
	`target` TINYINT(3) UNSIGNED NOT NULL DEFAULT '1', # '1' === ObjectsConst.DEFAULTS.TARGETS.PLAYER
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `FK_objects_skills_objects` (`object_id`) USING BTREE,
	INDEX `FK_objects_skills_skills_skill` (`skill_id`) USING BTREE,
	CONSTRAINT `FK_objects_skills_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON UPDATE CASCADE ON DELETE NO ACTION,
	CONSTRAINT `FK_objects_skills_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE ON DELETE NO ACTION
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

# Operation Types:
CREATE TABLE `operation_types` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`label` VARCHAR(50) NOT NULL COLLATE 'utf8_unicode_ci',
    `key` INT(10) UNSIGNED NOT NULL,
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `key` (`key`) USING BTREE
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB AUTO_INCREMENT=1;

INSERT INTO `operation_types` VALUES (NULL, 'Increment', 1);
INSERT INTO `operation_types` VALUES (NULL, 'Decrease', 2);
INSERT INTO `operation_types` VALUES (NULL, 'Divide', 3);
INSERT INTO `operation_types` VALUES (NULL, 'Multiply', 4);
INSERT INTO `operation_types` VALUES (NULL, 'Increment Percentage', 5);
INSERT INTO `operation_types` VALUES (NULL, 'Decrease Percentage', 6);
INSERT INTO `operation_types` VALUES (NULL, 'Set', 7);
INSERT INTO `operation_types` VALUES (NULL, 'Method', 8);
INSERT INTO `operation_types` VALUES (NULL, 'Set Number', 9);

ALTER TABLE `skills_skill_owner_effects`
	CHANGE COLUMN `operation` `operation` INT(10) UNSIGNED NOT NULL AFTER `property_key`;

ALTER TABLE `skills_skill_owner_effects`
	ADD CONSTRAINT `FK_skills_skill_owner_effects_operation_types` FOREIGN KEY (`operation`) REFERENCES `operation_types` (`key`) ON UPDATE CASCADE ON DELETE NO ACTION;

ALTER TABLE `skills_skill_target_effects`
	ADD CONSTRAINT `FK_skills_skill_target_effects_operation_types` FOREIGN KEY (`operation`) REFERENCES `operation_types` (`key`) ON UPDATE NO ACTION ON DELETE NO ACTION;

ALTER TABLE `skills_levels_modifiers`
	ADD CONSTRAINT `FK_skills_levels_modifiers_operation_types` FOREIGN KEY (`operation`) REFERENCES `operation_types` (`key`) ON UPDATE NO ACTION ON DELETE NO ACTION;

# Target Options:
CREATE TABLE `target_options` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`target_key` TINYINT(3) UNSIGNED NOT NULL,
	`target_label` VARCHAR(50) NOT NULL COLLATE 'utf8_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `target_key` (`target_key`) USING BTREE
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

INSERT INTO `target_options` VALUES (0, 'Object');
INSERT INTO `target_options` VALUES (1, 'Player');

ALTER TABLE `objects_skills`
	ADD CONSTRAINT `FK_objects_skills_target_options` FOREIGN KEY (`target`) REFERENCES `target_options` (`target_key`) ON UPDATE NO ACTION ON DELETE NO ACTION;

# Objects IDs:
SET @enemy_forest_1_id = (SELECT `id` FROM `objects` WHERE `client_key` = 'enemy_forest_1');
SET @enemy_forest_2_id = (SELECT `id` FROM `objects` WHERE `client_key` = 'enemy_forest_2');

# Append new objects skills:
SET @attack_bullet_skill_id = (SELECT `id` FROM `skills_skill` WHERE `key` = 'attackBullet');
INSERT INTO `objects_skills` VALUES (@enemy_forest_1_id, @attack_bullet_skill_id, 1);

# Objects stats:
CREATE TABLE `objects_stats` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`object_id` INT(10) UNSIGNED NOT NULL,
	`stat_id` INT(10) UNSIGNED NOT NULL,
	`base_value` INT(10) UNSIGNED NOT NULL,
	`value` INT(10) UNSIGNED NOT NULL,
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `object_id_stat_id` (`object_id`, `stat_id`) USING BTREE,
	INDEX `stat_id` (`stat_id`) USING BTREE,
	INDEX `user_id` (`object_id`) USING BTREE,
	CONSTRAINT `FK_objects_current_stats_objects_stats` FOREIGN KEY (`stat_id`) REFERENCES `stats` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
	CONSTRAINT `FK_object_current_stats_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB AUTO_INCREMENT=0;

INSERT INTO `objects_stats` SELECT NULL, @enemy_forest_1_id, `id`, 50, 50 FROM `stats`;
INSERT INTO `objects_stats` SELECT NULL, @enemy_forest_2_id, `id`, 50, 50 FROM `stats`;

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
