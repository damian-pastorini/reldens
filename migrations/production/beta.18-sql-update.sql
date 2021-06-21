#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# Config:

INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'players/animations/defaultFrames/left/start', 3, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'players/animations/defaultFrames/left/end', 5, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'players/animations/defaultFrames/right/start', 6, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'players/animations/defaultFrames/right/end', 8, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'players/animations/defaultFrames/up/start', 9, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'players/animations/defaultFrames/up/end', 11, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'players/animations/defaultFrames/down/start', 0, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'players/animations/defaultFrames/down/end', 2, 'i');

INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/enabled', 1, 'b');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/mapWidthDivisor', 1, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/mapHeightDivisor', 1, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/fixedWidth', 450, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/fixedHeight', 450, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/roundMap', 1, 'b');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/camX', 140, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/camY', 10, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/camBackgroundColor', 'rgba(0,0,0,0.6)', 't');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/camZoom', '0.35', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/roundMap', 1, 'b');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/addCircle', 1, 'b');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleX', 220, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleY', 88, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleRadio', 80.35, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleColor', 'rgb(0,0,0)', 't');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleAlpha', 1, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleStrokeLineWidth', 6, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleStrokeColor', 0, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleStrokeAlpha', '0.6', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleFillColor', 1, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleFillAlpha', 0, 'i');

INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/settings/enabled', 1, 'b');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/settings/responsiveX', '100', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/settings/responsiveY', '100', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/settings/x', '940', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/settings/y', '280', 'i');

INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/pointer/topOffSet', 16, 'i');


## -------------------------------------------------------------------------------------------------------------------

# Objects animations:

CREATE TABLE `objects_animations` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`object_id` INT(10) UNSIGNED NOT NULL,
	`animationKey` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`animationData` TEXT NOT NULL COLLATE 'utf8_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `object_id_animationKey` (`object_id`, `animationKey`) USING BTREE,
	INDEX `id` (`id`) USING BTREE,
	INDEX `object_id` (`object_id`) USING BTREE,
	CONSTRAINT `FK_objects_animations_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON UPDATE CASCADE ON DELETE NO ACTION
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

SET @object_id = (SELECT id FROM objects WHERE `layer_name` = 'respawn-area-monsters-lvl-1-2' AND object_class_key = 'enemy_1');

INSERT INTO `objects_animations` (`id`, `object_id`, `animationKey`, `animationData`) VALUES (NULL, @object_id, CONCAT('respawn-area-monsters-lvl-1-2_', @object_id, '_right'), '{"start":6,"end":8}');
INSERT INTO `objects_animations` (`id`, `object_id`, `animationKey`, `animationData`) VALUES (NULL, @object_id, CONCAT('respawn-area-monsters-lvl-1-2_', @object_id, '_down'), '{"start":0,"end":2}');
INSERT INTO `objects_animations` (`id`, `object_id`, `animationKey`, `animationData`) VALUES (NULL, @object_id, CONCAT('respawn-area-monsters-lvl-1-2_', @object_id, '_left'), '{"start":3,"end":5}');
INSERT INTO `objects_animations` (`id`, `object_id`, `animationKey`, `animationData`) VALUES (NULL, @object_id, CONCAT('respawn-area-monsters-lvl-1-2_', @object_id, '_up'), '{"start":9,"end":11}');

## -------------------------------------------------------------------------------------------------------------------

# Audio:

INSERT INTO `features` (`code`, `title`, `is_enabled`) VALUES ('audio', 'Audio', '1');

CREATE TABLE `audio_categories` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`category_key` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`category_label` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`enabled` INT(1) NOT NULL DEFAULT '0',
	`single_audio` INT(10) NOT NULL DEFAULT '0',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `category_key` (`category_key`) USING BTREE,
	UNIQUE INDEX `category_label` (`category_label`) USING BTREE
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

CREATE TABLE `audio` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`audio_key` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`files_name` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`config` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8_unicode_ci',
	`room_id` INT(10) UNSIGNED NULL DEFAULT NULL,
	`category_id` INT(10) UNSIGNED NULL DEFAULT NULL,
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `audio_key` (`audio_key`) USING BTREE,
	INDEX `FK_audio_rooms` (`room_id`) USING BTREE,
	INDEX `FK_audio_audio_categories` (`category_id`) USING BTREE,
	CONSTRAINT `FK_audio_audio_categories` FOREIGN KEY (`category_id`) REFERENCES `audio_categories` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT `FK_audio_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE SET NULL ON DELETE SET NULL
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

CREATE TABLE `audio_markers` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`audio_id` INT(10) UNSIGNED NOT NULL,
	`marker_key` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci',
	`start` INT(10) UNSIGNED NOT NULL,
	`duration` INT(10) UNSIGNED NOT NULL,
	`config` TEXT NULL DEFAULT NULL COLLATE 'utf8_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `audio_id` (`audio_id`) USING BTREE,
	CONSTRAINT `FK_audio_markers_audio` FOREIGN KEY (`audio_id`) REFERENCES `audio` (`id`) ON UPDATE CASCADE ON DELETE NO ACTION
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

CREATE TABLE `audio_player_config` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`player_id` INT(10) UNSIGNED NOT NULL,
	`category_id` INT(10) UNSIGNED NULL DEFAULT NULL,
	`enabled` INT(1) UNSIGNED NULL DEFAULT NULL,
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `player_id_category_id` (`player_id`, `category_id`) USING BTREE,
	INDEX `FK_audio_player_config_audio_categories` (`category_id`) USING BTREE,
	CONSTRAINT `FK_audio_player_config_audio_categories` FOREIGN KEY (`category_id`) REFERENCES `reldens`.`audio_categories` (`id`) ON UPDATE CASCADE ON DELETE NO ACTION,
	CONSTRAINT `FK_audio_player_config_players` FOREIGN KEY (`player_id`) REFERENCES `reldens`.`players` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB;

## -------------------------------------------------------------------------------------------------------------------
