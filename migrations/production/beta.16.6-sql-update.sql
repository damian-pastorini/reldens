#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# Config:

INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'players/animations/fallbackImage', 'player-base', 't');
UPDATE `config` SET `value`='' WHERE  `path`= 'ui/controls/defaultActionKey';

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

INSERT INTO `reldens`.`skills_levels` (`key`, `label`, `required_experience`, `level_set_id`) VALUES ('1', '1', '0', '2');
INSERT INTO `reldens`.`skills_levels` (`key`, `label`, `required_experience`, `level_set_id`) VALUES ('1', '1', '0', '3');
INSERT INTO `reldens`.`skills_levels` (`key`, `label`, `required_experience`, `level_set_id`) VALUES ('1', '1', '0', '4');

INSERT INTO `reldens`.`skills_levels` (`key`, `label`, `required_experience`, `level_set_id`) VALUES ('4', '4', '200', '2');
INSERT INTO `reldens`.`skills_levels` (`key`, `label`, `required_experience`, `level_set_id`) VALUES ('4', '4', '200', '3');
INSERT INTO `reldens`.`skills_levels` (`key`, `label`, `required_experience`, `level_set_id`) VALUES ('4', '4', '200', '4');

ALTER TABLE `skills_class_path_level_skills`
    CHANGE COLUMN `level_key` `level_id` INT(11) UNSIGNED NOT NULL AFTER `class_path_id`,
	DROP INDEX `level_key`,
	ADD INDEX `level_key` (`level_id`) USING BTREE;

DELETE FROM skills_class_path_level_skills;
DELETE FROM skills_class_path_level_labels;

ALTER TABLE `skills_class_path_level_skills`
    ADD CONSTRAINT `FK_skills_class_path_level_skills_skills_levels` FOREIGN KEY (`level_id`) REFERENCES `skills_levels` (`id`) ON UPDATE CASCADE;

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
