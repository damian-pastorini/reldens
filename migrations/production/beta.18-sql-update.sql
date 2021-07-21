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

CREATE TABLE IF NOT EXISTS `audio_categories` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `category_label` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `enabled` int NOT NULL DEFAULT '0',
  `single_audio` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_key` (`category_key`),
  UNIQUE KEY `category_label` (`category_label`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS `audio` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `audio_key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `files_name` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `config` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `room_id` int unsigned DEFAULT NULL,
  `category_id` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `audio_key` (`audio_key`),
  KEY `FK_audio_rooms` (`room_id`),
  KEY `FK_audio_audio_categories` (`category_id`),
  CONSTRAINT `FK_audio_audio_categories` FOREIGN KEY (`category_id`) REFERENCES `audio_categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_audio_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL ON UPDATE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS `audio_markers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `audio_id` int unsigned NOT NULL,
  `marker_key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `start` int unsigned NOT NULL,
  `duration` int unsigned NOT NULL,
  `config` text COLLATE utf8_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `audio_id_marker_key` (`audio_id`,`marker_key`),
  KEY `audio_id` (`audio_id`),
  CONSTRAINT `FK_audio_markers_audio` FOREIGN KEY (`audio_id`) REFERENCES `audio` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS `audio_player_config` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `player_id` int unsigned NOT NULL,
  `category_id` int unsigned DEFAULT NULL,
  `enabled` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id_category_id` (`player_id`,`category_id`),
  KEY `FK_audio_player_config_audio_categories` (`category_id`),
  CONSTRAINT `FK_audio_player_config_audio_categories` FOREIGN KEY (`category_id`) REFERENCES `audio_categories` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_audio_player_config_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

INSERT INTO `audio_categories` (`id`, `category_key`, `category_label`, `enabled`, `single_audio`) VALUES
	(NULL, 'music', 'Music', 1, 1),
	(NULL, 'sound', 'Sound', 1, 0);

SET @music_category = (SELECT id FROM audio_categories WHERE `category_key` = 'music');
SET @sound_category = (SELECT id FROM audio_categories WHERE `category_key` = 'sound');
SET @reldens_town_room_id = (SELECT id FROM rooms WHERE `name` = 'ReldensTown');

INSERT INTO `audio` (`id`, `audio_key`, `files_name`, `config`, `room_id`, `category_id`) VALUES
	(NULL, 'footstep', 'footstep.ogg,footstep.mp3', NULL, NULL, @sound_category),
	(NULL, 'ReldensTownAudio', 'reldens-town.ogg,reldens-town.mp3', NULL, @reldens_town_room_id, @music_category),
	(NULL, 'intro', 'intro.ogg,intro.mp3', NULL, NULL, @music_category);

SET @reldens_town_audio_id = (SELECT id FROM audio WHERE `audio_key` = 'footstep');
SET @footstep_audio_id = (SELECT id FROM audio WHERE `audio_key` = 'ReldensTownAudio');

INSERT INTO `audio_markers` (`id`, `audio_id`, `marker_key`, `start`, `duration`, `config`) VALUES
	(NULL, @reldens_town_audio_id, 'ReldensTown', 0, 41, NULL),
	(NULL, @footstep_audio_id,'journeyman_right', 0, 1, NULL),
	(NULL, @footstep_audio_id,'journeyman_left', 0, 1, NULL),
	(NULL, @footstep_audio_id,'journeyman_up', 0, 1, NULL),
	(NULL, @footstep_audio_id,'journeyman_down', 0, 1, NULL),
	(NULL, @footstep_audio_id,'r_journeyman_right', 0, 1, NULL),
	(NULL, @footstep_audio_id,'r_journeyman_left', 0, 1, NULL),
	(NULL, @footstep_audio_id,'r_journeyman_up', 0, 1, NULL),
	(NULL, @footstep_audio_id,'r_journeyman_down', 0, 1, NULL);

INSERT IGNORE INTO `audio_player_config` (`id`, `player_id`, `category_id`, `enabled`)
    SELECT NULL, p.id AS playerId, ac.id AS audioCategoryId, 1
        FROM players AS p
        JOIN audio_categories AS ac;

## -------------------------------------------------------------------------------------------------------------------
