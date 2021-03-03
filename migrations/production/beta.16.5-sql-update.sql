#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################
# Config:

UPDATE `config` SET `value`=0 WHERE `path`='ui/chat/defaultOpen';
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'players/animations/collideWorldBounds', '1', 'b');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'rooms/world/bulletsStopOnPlayer', '1', 'b');

# Path new room:
INSERT INTO `rooms` (`id`, `name`, `title`, `map_filename`, `scene_images`, `room_class_key`) VALUES (6, 'ReldensHouse_1b', 'House - 1 - Floor 2', 'reldens-house-1-2d-floor', 'reldens-house-1-2d-floor', NULL);
INSERT INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES (11, 2, 623, 6);
INSERT INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES (12, 2, 663, 6);
INSERT INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES (13, 6, 624, 2);
INSERT INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES (14, 6, 664, 2);
INSERT INTO `rooms_return_points` (`id`, `room_id`, `direction`, `x`, `y`, `is_default`, `to_room_id`) VALUES (9, 6, 'right', 820, 500, 0, 2);
INSERT INTO `rooms_return_points` (`id`, `room_id`, `direction`, `x`, `y`, `is_default`, `to_room_id`) VALUES (10, 6, 'right', 820, 500, 0, 2);
INSERT INTO `rooms_return_points` (`id`, `room_id`, `direction`, `x`, `y`, `is_default`, `to_room_id`) VALUES (11, 2, 'left', 720, 540, 0, 6);

# Rename field "to_room_id" to "from_room_id":
ALTER TABLE `rooms_return_points`
	DROP FOREIGN KEY `FK_scenes_return_points_rooms_2`;
ALTER TABLE `rooms_return_points`
	CHANGE COLUMN `to_room_id` `from_room_id` INT(11) UNSIGNED NULL DEFAULT NULL AFTER `is_default`,
	DROP INDEX `FK_scenes_return_points_rooms_2`,
	ADD INDEX `FK_scenes_return_points_rooms_2` (`from_room_id`) USING BTREE;
ALTER TABLE `rooms_return_points`
	ADD CONSTRAINT `FK_rooms_return_points_rooms` FOREIGN KEY (`from_room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE;
ALTER TABLE `rooms_return_points`
	DROP FOREIGN KEY `FK_scenes_return_points_rooms`;
ALTER TABLE `rooms_return_points`
	ADD CONSTRAINT `FK_scenes_return_points_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE `rooms_return_points`
	DROP FOREIGN KEY `FK_rooms_return_points_rooms`,
	DROP FOREIGN KEY `FK_scenes_return_points_rooms`;
ALTER TABLE `rooms_return_points`
	ADD CONSTRAINT `FK_rooms_return_points_rooms_from_room_id` FOREIGN KEY (`from_room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
	ADD CONSTRAINT `FK_rooms_return_points_rooms_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE ON DELETE NO ACTION;

# Return point update for new room:
UPDATE `rooms_return_points` SET `is_default`='0', `from_room_id`='4' WHERE  `id`=1 AND `room_id`=2;

# Atk and Def modifiers for level up:

INSERT INTO `skills_levels_modifiers` (`id`, `level_key`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, 1, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_key`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, 1, 'inc_def', 'statsBase/def', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_key`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, 4, 'inc_def', 'statsBase/def', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_key`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, 4, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_key`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, 2, 'inc_def', 'statsBase/def', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_key`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, 2, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_key`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, 5, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_key`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, 6, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL);
INSERT INTO `skills_levels_modifiers` (`id`, `level_key`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES (NULL, 7, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL);

# Config:

INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'players/animations/fallbackImage', 'player-base', 't');
UPDATE `config` SET `value`='' WHERE  `path`= 'ui/controls/defaultActionKey';
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'players/multiplePlayers/enabled', '1', 'b');

# Multiple players:

ALTER TABLE `players` ADD UNIQUE INDEX `name` (`name`);

# Update skills system:

ALTER TABLE `skills_class_path`ADD UNIQUE INDEX `key` (`key`);

UPDATE `skills_class_path` SET `key`='warlock', `label`='Warlock' WHERE  `id`=1;

INSERT INTO `skills_levels_set` (`autoFillRanges`) VALUES ('1');
INSERT INTO `skills_levels_set` (`autoFillRanges`) VALUES ('1');
INSERT INTO `skills_levels_set` (`autoFillRanges`) VALUES ('1');

INSERT INTO `skills_class_path` (`id`, `key`, `label`, `levels_set_id`) VALUES (2, 'sorcerer', 'Sorcerer', 2);
INSERT INTO `skills_class_path` (`id`, `key`, `label`, `levels_set_id`) VALUES (3, 'swordsman', 'Swordsman', 3);
INSERT INTO `skills_class_path` (`id`, `key`, `label`, `levels_set_id`) VALUES (4, 'warrior', 'Warrior', 4);

DELETE FROM `skills_class_path_level_labels` WHERE `id`=2;

INSERT INTO `skills_class_path_level_skills` (`class_path_id`, `level_key`, `skill_id`) VALUES ('2', '1', '2');
INSERT INTO `skills_class_path_level_skills` (`class_path_id`, `level_key`, `skill_id`) VALUES ('3', '1', '2');
INSERT INTO `skills_class_path_level_skills` (`class_path_id`, `level_key`, `skill_id`) VALUES ('4', '1', '2');
INSERT INTO `skills_class_path_level_skills` (`class_path_id`, `level_key`, `skill_id`) VALUES ('2', '4', '4');

ALTER TABLE `skills_levels` DROP INDEX `key`, ADD UNIQUE INDEX `key_level_set_id` (`key`, `level_set_id`);

INSERT INTO `skills_levels` (`key`, `label`, `required_experience`, `level_set_id`) VALUES ('1', '1', '0', '2');
INSERT INTO `skills_levels` (`key`, `label`, `required_experience`, `level_set_id`) VALUES ('1', '1', '0', '3');
INSERT INTO `skills_levels` (`key`, `label`, `required_experience`, `level_set_id`) VALUES ('1', '1', '0', '4');

INSERT INTO `skills_levels` (`key`, `label`, `required_experience`, `level_set_id`) VALUES ('4', '4', '200', '2');
INSERT INTO `skills_levels` (`key`, `label`, `required_experience`, `level_set_id`) VALUES ('4', '4', '200', '3');
INSERT INTO `skills_levels` (`key`, `label`, `required_experience`, `level_set_id`) VALUES ('4', '4', '200', '4');

ALTER TABLE `skills_class_path_level_skills`
    CHANGE COLUMN `level_key` `level_id` INT(11) UNSIGNED NOT NULL AFTER `class_path_id`,
	DROP INDEX `level_key`,
	ADD INDEX `level_key` (`level_id`) USING BTREE;

DELETE FROM skills_class_path_level_skills;
DELETE FROM skills_class_path_level_labels;

ALTER TABLE `skills_class_path_level_skills`
    ADD CONSTRAINT `FK_skills_class_path_level_skills_skills_levels_id` FOREIGN KEY (`level_id`) REFERENCES `skills_levels` (`id`) ON UPDATE CASCADE;

ALTER TABLE `skills_class_path_level_labels`
    CHANGE COLUMN `level_key` `level_id` INT(11) UNSIGNED NOT NULL AFTER `class_path_id`,
    DROP INDEX `class_path_id_level_key`,
    ADD UNIQUE INDEX `class_path_id_level_key` (`class_path_id`, `level_id`) USING BTREE,
    DROP INDEX `level_key`,
    ADD INDEX `level_key` (`level_id`) USING BTREE,
    DROP FOREIGN KEY `FK_skills_class_path_level_labels_skills_levels`;

ALTER TABLE `skills_class_path_level_labels`
	ADD CONSTRAINT `FK_skills_class_path_level_labels_skills_levels` FOREIGN KEY (`level_id`) REFERENCES `skills_levels` (`id`) ON UPDATE CASCADE;

INSERT INTO `skills_class_path_level_labels` (`id`, `class_path_id`, `level_id`, `label`) VALUES (4, 1, 1, 'Apprentice');
INSERT INTO `skills_class_path_level_labels` (`id`, `class_path_id`, `level_id`, `label`) VALUES (5, 1, 4, 'Warlock');

INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (9, 1, 1, 1);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (10, 1, 4, 3);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (11, 1, 7, 4);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (12, 2, 9, 1);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (13, 2, 12, 4);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (14, 3, 10, 2);
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES (15, 4, 11, 2);

DELETE FROM skills_levels_modifiers;

ALTER TABLE `skills_levels_modifiers` DROP FOREIGN KEY `FK__skills_levels`;

ALTER TABLE `skills_levels_modifiers`
	CHANGE COLUMN `level_key` `level_id` INT(11) UNSIGNED NOT NULL AFTER `id`,
	DROP INDEX `level_key`,
	ADD INDEX `level_key` (`level_id`) USING BTREE,
	ADD CONSTRAINT `FK_skills_levels_modifiers_skills_levels` FOREIGN KEY (`level_id`) REFERENCES `skills_levels` (`id`) ON UPDATE CASCADE;

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
