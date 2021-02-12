#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# Config:

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
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'actions/damage/font', 'Verdana, Geneva, sans-serif', 't');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'actions/damage/color', '#ff0000', 't');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'actions/damage/duration', '600', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'actions/damage/top', '50', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'actions/damage/fontSize', '14', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'actions/damage/stroke', '#000000', 't');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'actions/damage/strokeThickness', '4', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'actions/damage/shadowColor', 'rgba(0,0,0,0.7)', 't');

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

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
