-- --------------------------------------------------------
-- Server version:               8.0.31 - MySQL Community Server - GPL
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Dumping structure for table ads
CREATE TABLE IF NOT EXISTS `ads` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `provider_id` int unsigned NOT NULL,
  `type_id` int unsigned NOT NULL,
  `width` int unsigned DEFAULT NULL,
  `height` int unsigned DEFAULT NULL,
  `position` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `top` int unsigned DEFAULT NULL,
  `bottom` int unsigned DEFAULT NULL,
  `left` int unsigned DEFAULT NULL,
  `right` int unsigned DEFAULT NULL,
  `replay` int unsigned DEFAULT NULL,
  `enabled` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`),
  KEY `provider_id` (`provider_id`),
  KEY `type_id` (`type_id`) USING BTREE,
  CONSTRAINT `FK_ads_ads_providers` FOREIGN KEY (`provider_id`) REFERENCES `ads_providers` (`id`),
  CONSTRAINT `FK_ads_ads_types` FOREIGN KEY (`type_id`) REFERENCES `ads_types` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table ads: ~4 rows (approximately)
INSERT INTO `ads` (`id`, `key`, `provider_id`, `type_id`, `width`, `height`, `position`, `top`, `bottom`, `left`, `right`, `replay`, `enabled`) VALUES
	(3, 'fullTimeBanner', 1, 1, 320, 50, NULL, NULL, 0, NULL, 80, NULL, 0),
	(4, 'ui-banner', 1, 1, 320, 50, NULL, NULL, 80, NULL, 80, NULL, 0),
	(5, 'crazy-games-sample-video', 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 0),
	(6, 'game-monetize-sample-video', 2, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 0);

-- Dumping structure for table ads_banner
CREATE TABLE IF NOT EXISTS `ads_banner` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `ads_id` int unsigned NOT NULL,
  `banner_data` text COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ads_id` (`ads_id`),
  CONSTRAINT `FK_ads_banner_ads` FOREIGN KEY (`ads_id`) REFERENCES `ads` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table ads_banner: ~2 rows (approximately)
INSERT INTO `ads_banner` (`id`, `ads_id`, `banner_data`) VALUES
	(1, 3, '{"fullTime": true}'),
	(2, 4, '{"uiReferenceIds":["box-open-clan","equipment-open","inventory-open","player-stats-open"]}');

-- Dumping structure for table ads_event_video
CREATE TABLE IF NOT EXISTS `ads_event_video` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `ads_id` int unsigned NOT NULL,
  `event_key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `event_data` text COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ads_id` (`ads_id`),
  KEY `ad_id` (`ads_id`) USING BTREE,
  KEY `room_id` (`event_key`) USING BTREE,
  CONSTRAINT `FK_ads_scene_change_video_ads` FOREIGN KEY (`ads_id`) REFERENCES `ads` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table ads_event_video: ~2 rows (approximately)
INSERT INTO `ads_event_video` (`id`, `ads_id`, `event_key`, `event_data`) VALUES
	(1, 5, 'activatedRoom_ReldensTown', '{"rewardItemKey":"coins","rewardItemQty":1}'),
	(2, 6, 'activatedRoom_ReldensForest', '{"rewardItemKey":"coins","rewardItemQty":1}');

-- Dumping structure for table ads_played
CREATE TABLE IF NOT EXISTS `ads_played` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `ads_id` int unsigned NOT NULL,
  `player_id` int unsigned NOT NULL,
  `started_at` datetime NOT NULL DEFAULT (now()),
  `ended_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ads_id` (`ads_id`),
  KEY `player_id` (`player_id`),
  CONSTRAINT `FK_ads_played_ads` FOREIGN KEY (`ads_id`) REFERENCES `ads` (`id`),
  CONSTRAINT `FK_ads_played_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table ads_played: ~2 rows (approximately)
INSERT INTO `ads_played` (`id`, `ads_id`, `player_id`, `started_at`, `ended_at`) VALUES
	(7, 5, 1, '2023-10-01 11:37:00', '2023-10-01 11:37:05'),
	(8, 6, 1, '2023-09-28 21:00:31', '2023-09-28 21:00:41');

-- Dumping structure for table ads_providers
CREATE TABLE IF NOT EXISTS `ads_providers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `enabled` int unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table ads_providers: ~2 rows (approximately)
INSERT INTO `ads_providers` (`id`, `key`, `enabled`) VALUES
	(1, 'crazyGames', 0),
	(2, 'gameMonetize', 0);

-- Dumping structure for table ads_types
CREATE TABLE IF NOT EXISTS `ads_types` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table ads_types: ~2 rows (approximately)
INSERT INTO `ads_types` (`id`, `key`) VALUES
	(1, 'banner'),
	(2, 'eventVideo');

-- Dumping structure for table audio
CREATE TABLE IF NOT EXISTS `audio` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `audio_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `files_name` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `config` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `room_id` int unsigned DEFAULT NULL,
  `category_id` int unsigned DEFAULT NULL,
  `enabled` int unsigned DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `audio_key` (`audio_key`),
  KEY `FK_audio_rooms` (`room_id`),
  KEY `FK_audio_audio_categories` (`category_id`),
  CONSTRAINT `FK_audio_audio_categories` FOREIGN KEY (`category_id`) REFERENCES `audio_categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_audio_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL ON UPDATE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table audio: ~2 rows (approximately)
INSERT INTO `audio` (`id`, `audio_key`, `files_name`, `config`, `room_id`, `category_id`, `enabled`) VALUES
	(3, 'footstep', 'footstep.mp3', NULL, NULL, 3, 1),
	(4, 'ReldensTownAudio', 'reldens-town.mp3', '', 4, 1, 1);

-- Dumping structure for table audio_categories
CREATE TABLE IF NOT EXISTS `audio_categories` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `category_label` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `enabled` int NOT NULL DEFAULT '0',
  `single_audio` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_key` (`category_key`),
  UNIQUE KEY `category_label` (`category_label`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table audio_categories: ~2 rows (approximately)
INSERT INTO `audio_categories` (`id`, `category_key`, `category_label`, `enabled`, `single_audio`) VALUES
	(1, 'music', 'Music', 1, 1),
	(3, 'sound', 'Sound', 1, 0);

-- Dumping structure for table audio_markers
CREATE TABLE IF NOT EXISTS `audio_markers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `audio_id` int unsigned NOT NULL,
  `marker_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `start` int unsigned NOT NULL,
  `duration` int unsigned NOT NULL,
  `config` text CHARACTER SET utf8 COLLATE utf8_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `audio_id_marker_key` (`audio_id`,`marker_key`),
  KEY `audio_id` (`audio_id`),
  CONSTRAINT `FK_audio_markers_audio` FOREIGN KEY (`audio_id`) REFERENCES `audio` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table audio_markers: ~41 rows (approximately)
INSERT INTO `audio_markers` (`id`, `audio_id`, `marker_key`, `start`, `duration`, `config`) VALUES
	(1, 4, 'ReldensTown', 0, 41, NULL),
	(2, 3, 'journeyman_right', 0, 1, NULL),
	(3, 3, 'journeyman_left', 0, 1, NULL),
	(4, 3, 'journeyman_up', 0, 1, NULL),
	(5, 3, 'journeyman_down', 0, 1, NULL),
	(6, 3, 'r_journeyman_right', 0, 1, NULL),
	(7, 3, 'r_journeyman_left', 0, 1, NULL),
	(8, 3, 'r_journeyman_up', 0, 1, NULL),
	(9, 3, 'r_journeyman_down', 0, 1, NULL),
	(10, 3, 'sorcerer_right', 0, 1, NULL),
	(11, 3, 'sorcerer_left', 0, 1, NULL),
	(12, 3, 'sorcerer_up', 0, 1, NULL),
	(13, 3, 'sorcerer_down', 0, 1, NULL),
	(14, 3, 'r_sorcerer_right', 0, 1, NULL),
	(15, 3, 'r_sorcerer_left', 0, 1, NULL),
	(16, 3, 'r_sorcerer_up', 0, 1, NULL),
	(17, 3, 'r_sorcerer_down', 0, 1, NULL),
	(18, 3, 'warlock_right', 0, 1, NULL),
	(19, 3, 'warlock_left', 0, 1, NULL),
	(20, 3, 'warlock_up', 0, 1, NULL),
	(21, 3, 'warlock_down', 0, 1, NULL),
	(22, 3, 'r_warlock_right', 0, 1, NULL),
	(23, 3, 'r_warlock_left', 0, 1, NULL),
	(24, 3, 'r_warlock_up', 0, 1, NULL),
	(25, 3, 'r_warlock_down', 0, 1, NULL),
	(26, 3, 'swordsman_right', 0, 1, NULL),
	(27, 3, 'swordsman_left', 0, 1, NULL),
	(28, 3, 'swordsman_up', 0, 1, NULL),
	(29, 3, 'swordsman_down', 0, 1, NULL),
	(30, 3, 'r_swordsman_right', 0, 1, NULL),
	(31, 3, 'r_swordsman_left', 0, 1, NULL),
	(32, 3, 'r_swordsman_up', 0, 1, NULL),
	(33, 3, 'r_swordsman_down', 0, 1, NULL),
	(34, 3, 'warrior_right', 0, 1, NULL),
	(35, 3, 'warrior_left', 0, 1, NULL),
	(36, 3, 'warrior_up', 0, 1, NULL),
	(37, 3, 'warrior_down', 0, 1, NULL),
	(38, 3, 'r_warrior_right', 0, 1, NULL),
	(39, 3, 'r_warrior_left', 0, 1, NULL),
	(40, 3, 'r_warrior_up', 0, 1, NULL),
	(41, 3, 'r_warrior_down', 0, 1, NULL);

-- Dumping structure for table audio_player_config
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping structure for table chat
CREATE TABLE IF NOT EXISTS `chat` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `player_id` int unsigned NOT NULL,
  `room_id` int unsigned DEFAULT NULL,
  `message` varchar(140) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `private_player_id` int unsigned DEFAULT NULL,
  `message_type` int unsigned DEFAULT NULL,
  `message_time` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`player_id`),
  KEY `scene_id` (`room_id`),
  KEY `private_user_id` (`private_player_id`),
  KEY `FK_chat_chat_message_types` (`message_type`),
  CONSTRAINT `FK__players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`),
  CONSTRAINT `FK__players_2` FOREIGN KEY (`private_player_id`) REFERENCES `players` (`id`),
  CONSTRAINT `FK__scenes` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  CONSTRAINT `FK_chat_chat_message_types` FOREIGN KEY (`message_type`) REFERENCES `chat_message_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping structure for table chat_message_types
CREATE TABLE IF NOT EXISTS `chat_message_types` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `show_tab` int unsigned NOT NULL DEFAULT (0),
  `also_show_in_type` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `FK_chat_message_types_chat_message_types` (`also_show_in_type`),
  CONSTRAINT `FK_chat_message_types_chat_message_types` FOREIGN KEY (`also_show_in_type`) REFERENCES `chat_message_types` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table chat_message_types: ~10 rows (approximately)
INSERT INTO `chat_message_types` (`id`, `key`, `show_tab`, `also_show_in_type`) VALUES
	(1, 'message', 1, NULL),
	(2, 'joined', 0, 1),
	(3, 'system', 0, 1),
	(4, 'private', 1, 1),
	(5, 'damage', 0, 1),
	(6, 'reward', 0, 1),
	(7, 'skill', 0, 1),
	(8, 'teams', 1, 1),
	(9, 'global', 1, 1),
	(10, 'error', 0, 1);

-- Dumping structure for table clan
CREATE TABLE IF NOT EXISTS `clan` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` int unsigned NOT NULL,
  `name` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `points` int unsigned NOT NULL DEFAULT '0',
  `level` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `owner_id` (`owner_id`),
  UNIQUE KEY `name` (`name`),
  KEY `FK_clan_clan_levels` (`level`),
  CONSTRAINT `FK_clan_clan_levels` FOREIGN KEY (`level`) REFERENCES `clan_levels` (`key`),
  CONSTRAINT `FK_clan_players` FOREIGN KEY (`owner_id`) REFERENCES `players` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping structure for table clan_levels
CREATE TABLE IF NOT EXISTS `clan_levels` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` int unsigned NOT NULL,
  `label` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `required_experience` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table clan_levels: ~1 rows (approximately)
INSERT INTO `clan_levels` (`id`, `key`, `label`, `required_experience`) VALUES
	(1, 1, '1', 0);

-- Dumping structure for table clan_levels_modifiers
CREATE TABLE IF NOT EXISTS `clan_levels_modifiers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `level_id` int unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` int unsigned NOT NULL,
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `minValue` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `maxValue` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `minProperty` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `maxProperty` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `modifier_id` (`key`) USING BTREE,
  KEY `level_key` (`level_id`) USING BTREE,
  KEY `FK_clan_levels_modifiers_operation_types` (`operation`) USING BTREE,
  CONSTRAINT `FK_clan_levels_modifiers_clan_levels` FOREIGN KEY (`level_id`) REFERENCES `clan_levels` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_clan_levels_modifiers_operation_types` FOREIGN KEY (`operation`) REFERENCES `operation_types` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping structure for table clan_members
CREATE TABLE IF NOT EXISTS `clan_members` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `clan_id` int unsigned NOT NULL,
  `player_id` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clan_id_player_id` (`clan_id`,`player_id`),
  UNIQUE KEY `player_id` (`player_id`),
  KEY `FK__clan` (`clan_id`),
  KEY `FK__players` (`player_id`),
  CONSTRAINT `FK_clan_members_clan` FOREIGN KEY (`clan_id`) REFERENCES `clan` (`id`),
  CONSTRAINT `FK_clan_members_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping structure for table config
CREATE TABLE IF NOT EXISTS `config` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `scope` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `path` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `value` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `type` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `scope_path` (`scope`,`path`),
  KEY `FK_config_config_types` (`type`),
  CONSTRAINT `FK_config_config_types` FOREIGN KEY (`type`) REFERENCES `config_types` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=326 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table config: ~291 rows (approximately)
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES
	(1, 'server', 'rooms/validation/valid', 'room_game,chat_global', 1),
	(2, 'server', 'players/initialState/room_id', '4', 2),
	(3, 'server', 'players/initialState/x', '400', 2),
	(4, 'server', 'players/initialState/y', '345', 2),
	(5, 'server', 'players/initialState/dir', 'down', 1),
	(13, 'server', 'rooms/validation/enabled', '1', 3),
	(18, 'client', 'general/controls/allowSimultaneousKeys', '1', 3),
	(19, 'server', 'rooms/world/timeStep', '0.04', 2),
	(20, 'server', 'chat/messages/broadcast_join', '1', 3),
	(21, 'server', 'chat/messages/broadcast_leave', '1', 3),
	(22, 'server', 'chat/messages/global_enabled', '1', 3),
	(23, 'server', 'chat/messages/global_allowed_roles', '1,9000', 1),
	(24, 'server', 'players/physicsBody/speed', '180', 2),
	(25, 'client', 'players/animations/fadeDuration', '1000', 2),
	(26, 'client', 'ui/playerBox/x', '50', 2),
	(27, 'client', 'ui/playerStats/enabled', '1', 3),
	(28, 'client', 'ui/controls/enabled', '1', 3),
	(29, 'client', 'map/tileData/width', '16', 2),
	(30, 'client', 'map/tileData/height', '16', 2),
	(31, 'client', 'map/tileData/margin', '1', 2),
	(32, 'client', 'map/tileData/spacing', '2', 2),
	(33, 'client', 'players/size/width', '52', 2),
	(34, 'client', 'players/size/height', '71', 2),
	(35, 'client', 'general/animations/frameRate', '10', 2),
	(36, 'client', 'map/layersDepth/belowPlayer', '0', 2),
	(37, 'client', 'map/layersDepth/changePoints', '0', 2),
	(38, 'client', 'ui/sceneLabel/enabled', '1', 3),
	(39, 'client', 'general/controls/action_button_hold', '0', 3),
	(40, 'client', 'ui/chat/x', '440', 2),
	(41, 'client', 'ui/chat/y', '940', 2),
	(42, 'server', 'players/actions/interactionDistance', '40', 2),
	(43, 'server', 'objects/actions/interactionsDistance', '140', 2),
	(44, 'client', 'ui/playerBox/enabled', '1', 3),
	(45, 'client', 'ui/playerBox/y', '30', 2),
	(46, 'client', 'ui/lifeBar/enabled', '1', 3),
	(47, 'client', 'ui/uiTarget/x', '10', 2),
	(48, 'client', 'ui/uiTarget/y', '85', 2),
	(49, 'client', 'ui/sceneLabel/x', '250', 2),
	(50, 'client', 'ui/sceneLabel/y', '20', 2),
	(51, 'client', 'ui/controls/x', '120', 2),
	(52, 'client', 'ui/controls/y', '390', 2),
	(53, 'client', 'ui/playerStats/x', '430', 2),
	(54, 'client', 'ui/playerStats/y', '20', 2),
	(55, 'client', 'ui/loading/font', 'Verdana, Geneva, sans-serif', 1),
	(56, 'client', 'ui/loading/fontSize', '20px', 1),
	(57, 'client', 'ui/loading/assetsSize', '18px', 1),
	(58, 'client', 'ui/loading/loadingColor', '#ffffff', 1),
	(59, 'client', 'ui/loading/percentColor', '#666666', 1),
	(60, 'client', 'ui/loading/assetsColor', '#ffffff', 1),
	(61, 'client', 'ui/loading/showAssets', '1', 3),
	(62, 'client', 'players/animations/basedOnPress', '1', 3),
	(63, 'client', 'players/animations/diagonalHorizontal', '1', 3),
	(64, 'client', 'ui/uiTarget/hideOnDialog', '0', 3),
	(65, 'client', 'ui/uiTarget/enabled', '1', 3),
	(66, 'client', 'ui/lifeBar/x', '5', 2),
	(67, 'client', 'ui/lifeBar/y', '12', 2),
	(68, 'client', 'ui/lifeBar/height', '5', 2),
	(69, 'client', 'ui/lifeBar/width', '50', 2),
	(70, 'client', 'ui/lifeBar/fixedPosition', '0', 3),
	(71, 'server', 'rooms/world/tryClosestPath', '1', 3),
	(72, 'server', 'actions/pvp/battleTimeOff', '20000', 2),
	(73, 'server', 'actions/pvp/timerType', 'bt', 1),
	(74, 'server', 'enemies/initialStats/atk', '50', 2),
	(75, 'server', 'enemies/initialStats/def', '50', 2),
	(76, 'server', 'enemies/initialStats/dodge', '50', 2),
	(77, 'server', 'enemies/initialStats/hp', '50', 2),
	(78, 'server', 'enemies/initialStats/mp', '50', 2),
	(79, 'server', 'enemies/initialStats/speed', '50', 2),
	(80, 'server', 'enemies/initialStats/stamina', '50', 2),
	(81, 'client', 'ui/pointer/show', '1', 3),
	(82, 'server', 'enemies/default/skillKey', 'attackShort', 1),
	(83, 'client', 'players/size/topOffset', '20', 2),
	(84, 'client', 'players/size/leftOffset', '0', 2),
	(85, 'server', 'rooms/world/onlyWalkable', '1', 3),
	(86, 'client', 'ui/screen/responsive', '1', 3),
	(87, 'client', 'ui/uiTarget/responsiveY', '0', 2),
	(88, 'client', 'ui/uiTarget/responsiveX', '0', 2),
	(89, 'client', 'ui/inventory/enabled', '1', 3),
	(90, 'client', 'ui/inventory/x', '380', 2),
	(91, 'client', 'ui/inventory/y', '450', 2),
	(92, 'client', 'ui/inventory/responsiveY', '0', 2),
	(93, 'client', 'ui/inventory/responsiveX', '100', 2),
	(94, 'client', 'ui/equipment/enabled', '1', 3),
	(95, 'client', 'ui/equipment/x', '430', 2),
	(96, 'client', 'ui/equipment/y', '90', 2),
	(97, 'client', 'ui/equipment/responsiveY', '0', 2),
	(98, 'client', 'ui/equipment/responsiveX', '100', 2),
	(99, 'client', 'ui/lifeBar/responsiveY', '24', 2),
	(100, 'client', 'ui/lifeBar/responsiveX', '1', 2),
	(101, 'client', 'ui/sceneLabel/responsiveY', '0', 2),
	(102, 'client', 'ui/sceneLabel/responsiveX', '50', 2),
	(103, 'client', 'ui/playerStats/responsiveY', '0', 2),
	(104, 'client', 'ui/playerStats/responsiveX', '100', 2),
	(105, 'client', 'ui/playerBox/responsiveY', '0', 2),
	(106, 'client', 'ui/playerBox/responsiveX', '0', 2),
	(107, 'client', 'ui/controls/responsiveY', '100', 2),
	(108, 'client', 'ui/controls/responsiveX', '0', 2),
	(109, 'client', 'ui/chat/responsiveY', '100', 2),
	(110, 'client', 'ui/chat/responsiveX', '100', 2),
	(111, 'client', 'ui/chat/enabled', '1', 3),
	(112, 'client', 'ui/npcDialog/x', '120', 2),
	(113, 'client', 'ui/npcDialog/y', '100', 2),
	(114, 'client', 'ui/npcDialog/responsiveX', '10', 2),
	(115, 'client', 'ui/npcDialog/responsiveY', '10', 2),
	(116, 'client', 'ui/maximum/x', '1280', 2),
	(117, 'client', 'ui/maximum/y', '720', 2),
	(118, 'client', 'ui/chat/defaultOpen', '0', 3),
	(119, 'client', 'ui/chat/notificationBalloon', '1', 3),
	(120, 'client', 'ui/chat/damageMessages', '1', 3),
	(121, 'server', 'players/actions/initialClassPathId', '1', 2),
	(122, 'server', 'enemies/initialStats/aim', '50', 2),
	(123, 'client', 'actions/skills/affectedProperty', 'hp', 1),
	(124, 'client', 'ui/controls/opacityEffect', '1', 3),
	(125, 'client', 'ui/skills/y', '390', 2),
	(126, 'client', 'ui/skills/x', '230', 2),
	(127, 'client', 'ui/skills/responsiveY', '100', 2),
	(128, 'client', 'ui/skills/responsiveX', '0', 2),
	(129, 'client', 'ui/skills/enabled', '1', 3),
	(130, 'client', 'skills/animations/default_atk', '{"key":"default_atk","animationData":{"enabled":true,"type":"spritesheet","img":"default_atk","frameWidth":64,"frameHeight":64,"start":0,"end":4,"repeat":0}}', 4),
	(131, 'client', 'skills/animations/default_bullet', '{"key":"default_bullet","animationData":{"enabled":true,"type":"spritesheet","img":"default_bullet","frameWidth":64,"frameHeight":64,"start":0,"end":2,"repeat":-1,"rate":1}}', 4),
	(132, 'client', 'skills/animations/default_cast', '{"key": "default_cast","animationData":{"enabled":false,"type":"spritesheet","img":"default_cast","frameWidth":64,"frameHeight":64,"start":0,"end":3,"repeat":0}}', 4),
	(133, 'client', 'skills/animations/default_death', '{"key":"default_death","animationData":{"enabled":true,"type":"spritesheet","img":"default_death","frameWidth":64,"frameHeight":64,"start":0,"end":1,"repeat":0,"rate":1}}', 4),
	(134, 'client', 'skills/animations/default_hit', '{"key":"default_hit","animationData":{"enabled":true,"type":"spritesheet","img":"default_hit","frameWidth":64,"frameHeight":64,"start":0,"end":3,"repeat":0,"depthByPlayer":"above"}}', 4),
	(135, 'client', 'ui/controls/defaultActionKey', '', 1),
	(136, 'client', 'players/animations/collideWorldBounds', '1', 3),
	(137, 'server', 'rooms/world/bulletsStopOnPlayer', '1', 3),
	(138, 'client', 'players/animations/fallbackImage', 'player-base', 1),
	(139, 'client', 'players/multiplePlayers/enabled', '1', 3),
	(140, 'server', 'players/gameOver/timeOut', '10000', 2),
	(141, 'client', 'ui/controls/tabTarget', '1', 3),
	(142, 'client', 'ui/controls/disableContextMenu', '1', 3),
	(143, 'client', 'ui/controls/primaryMove', '0', 3),
	(144, 'client', 'ui/instructions/enabled', '1', 3),
	(145, 'client', 'ui/instructions/responsiveX', '100', 2),
	(146, 'client', 'ui/instructions/responsiveY', '100', 2),
	(147, 'client', 'ui/instructions/x', '380', 2),
	(148, 'client', 'ui/instructions/y', '940', 2),
	(149, 'client', 'ui/players/showNames', '1', 3),
	(157, 'client', 'ui/lifeBar/top', '5', 2),
	(158, 'client', 'actions/damage/enabled', '1', 3),
	(159, 'client', 'actions/damage/showAll', '0', 3),
	(160, 'client', 'actions/damage/font', 'Verdana, Geneva, sans-serif', 1),
	(161, 'client', 'actions/damage/color', '#ff0000', 1),
	(162, 'client', 'actions/damage/duration', '600', 2),
	(163, 'client', 'actions/damage/top', '50', 2),
	(164, 'client', 'actions/damage/fontSize', '14', 2),
	(165, 'client', 'actions/damage/stroke', '#000000', 1),
	(166, 'client', 'actions/damage/strokeThickness', '4', 2),
	(167, 'client', 'actions/damage/shadowColor', 'rgba(0,0,0,0.7)', 1),
	(168, 'client', 'ui/lifeBar/fillStyle', '0xff0000', 1),
	(169, 'client', 'ui/lifeBar/lineStyle', '0xffffff', 1),
	(170, 'client', 'ui/lifeBar/showAllPlayers', '0', 3),
	(171, 'client', 'ui/lifeBar/showEnemies', '1', 3),
	(172, 'client', 'players/animations/defaultFrames/left/start', '3', 2),
	(173, 'client', 'players/animations/defaultFrames/left/end', '5', 2),
	(174, 'client', 'players/animations/defaultFrames/right/start', '6', 2),
	(175, 'client', 'players/animations/defaultFrames/right/end', '8', 2),
	(176, 'client', 'players/animations/defaultFrames/up/start', '9', 2),
	(177, 'client', 'players/animations/defaultFrames/up/end', '11', 2),
	(178, 'client', 'players/animations/defaultFrames/down/start', '0', 2),
	(179, 'client', 'players/animations/defaultFrames/down/end', '2', 2),
	(180, 'client', 'ui/minimap/enabled', '1', 3),
	(181, 'client', 'ui/minimap/mapWidthDivisor', '1', 2),
	(182, 'client', 'ui/minimap/mapHeightDivisor', '1', 2),
	(183, 'client', 'ui/minimap/fixedWidth', '450', 2),
	(184, 'client', 'ui/minimap/fixedHeight', '450', 2),
	(186, 'client', 'ui/minimap/camX', '140', 2),
	(187, 'client', 'ui/minimap/camY', '10', 2),
	(188, 'client', 'ui/minimap/camBackgroundColor', 'rgba(0,0,0,0.6)', 1),
	(189, 'client', 'ui/minimap/camZoom', '0.15', 2),
	(191, 'client', 'ui/minimap/addCircle', '1', 3),
	(192, 'client', 'ui/minimap/circleX', '220', 2),
	(193, 'client', 'ui/minimap/circleY', '88', 2),
	(194, 'client', 'ui/minimap/circleRadio', '80.35', 2),
	(195, 'client', 'ui/minimap/circleColor', 'rgb(0,0,0)', 1),
	(196, 'client', 'ui/minimap/circleAlpha', '1', 2),
	(197, 'client', 'ui/minimap/circleStrokeLineWidth', '6', 2),
	(198, 'client', 'ui/minimap/circleStrokeColor', '0', 2),
	(199, 'client', 'ui/minimap/circleStrokeAlpha', '0.6', 2),
	(200, 'client', 'ui/minimap/circleFillColor', '1', 2),
	(201, 'client', 'ui/minimap/circleFillAlpha', '0', 2),
	(202, 'client', 'ui/pointer/topOffSet', '16', 2),
	(203, 'client', 'ui/minimap/responsiveX', '34', 2),
	(204, 'client', 'ui/minimap/responsiveY', '2.4', 2),
	(205, 'client', 'ui/minimap/x', '180', 2),
	(206, 'client', 'ui/minimap/y', '10', 2),
	(207, 'client', 'ui/settings/responsiveX', '100', 2),
	(208, 'client', 'ui/settings/responsiveY', '100', 2),
	(209, 'client', 'ui/settings/x', '940', 2),
	(210, 'client', 'ui/settings/y', '280', 2),
	(211, 'client', 'ui/settings/enabled', '1', 3),
	(212, 'client', 'ui/lifeBar/showOnClick', '1', 3),
	(213, 'client', 'rooms/selection/allowOnRegistration', '1', 3),
	(214, 'client', 'rooms/selection/allowOnLogin', '1', 3),
	(215, 'client', 'rooms/selection/registrationAvailableRooms', '*', 1),
	(216, 'client', 'rooms/selection/loginLastLocation', '1', 3),
	(218, 'client', 'rooms/selection/loginAvailableRooms', '*', 1),
	(219, 'client', 'rooms/selection/loginLastLocationLabel', 'Last Location', 1),
	(220, 'client', 'players/tapMovement/enabled', '1', 3),
	(221, 'client', 'ui/chat/overheadChat/enabled', '1', 3),
	(222, 'client', 'chat/messages/characterLimit', '100', 2),
	(223, 'client', 'chat/messages/characterLimitOverhead', '50', 2),
	(224, 'client', 'ui/chat/overheadText/fontFamily', 'Verdana, Geneva, sans-serif', 1),
	(225, 'client', 'ui/chat/overheadText/fontSize', '12px', 1),
	(226, 'client', 'ui/chat/overheadText/fill', '#ffffff', 1),
	(227, 'client', 'ui/chat/overheadText/align', 'center', 1),
	(228, 'client', 'ui/chat/overheadText/stroke', 'rgba(0,0,0,0.7)', 1),
	(229, 'client', 'ui/chat/overheadText/strokeThickness', '20', 2),
	(230, 'client', 'ui/chat/overheadText/shadowX', '5', 2),
	(231, 'client', 'ui/chat/overheadText/shadowY', '5', 2),
	(232, 'client', 'ui/chat/overheadText/shadowColor', 'rgba(0,0,0,0.7)', 1),
	(233, 'client', 'ui/chat/overheadText/shadowBlur', '5', 2),
	(234, 'client', 'ui/chat/overheadText/depth', '200000', 2),
	(235, 'client', 'ui/chat/overheadText/height', '15', 2),
	(236, 'client', 'ui/chat/overheadText/textLength', '4', 2),
	(237, 'client', 'ui/players/nameText/fontFamily', 'Verdana, Geneva, sans-serif', 1),
	(238, 'client', 'ui/players/nameText/fontSize', '12px', 1),
	(239, 'client', 'ui/players/nameText/fill', '#ffffff', 1),
	(240, 'client', 'ui/players/nameText/align', 'center', 1),
	(241, 'client', 'ui/players/nameText/stroke', '#000000', 1),
	(242, 'client', 'ui/players/nameText/strokeThickness', '4', 2),
	(243, 'client', 'ui/players/nameText/shadowX', '5', 2),
	(244, 'client', 'ui/players/nameText/shadowY', '5', 2),
	(245, 'client', 'ui/players/nameText/shadowColor', 'rgba(0,0,0,0.7)', 1),
	(246, 'client', 'ui/players/nameText/shadowBlur', '5', 2),
	(247, 'client', 'ui/players/nameText/depth', '200000', 2),
	(248, 'client', 'ui/players/nameText/height', '-90', 2),
	(249, 'client', 'ui/players/nameText/textLength', '4', 2),
	(250, 'client', 'ui/chat/overheadChat/isTyping', '1', 3),
	(251, 'client', 'ui/chat/overheadText/timeOut', '5000', 2),
	(252, 'client', 'ui/chat/overheadChat/closeChatBoxAfterSend', '1', 3),
	(253, 'client', 'players/playedTime/show', '2', 2),
	(254, 'client', 'players/playedTime/label', 'Played time %playedTimeInHs hs', 1),
	(255, 'client', 'objects/npc/invalidOptionMessage', 'I do not understand.', 1),
	(256, 'client', 'ui/minimap/roundMap', '1', 3),
	(257, 'client', 'general/engine/clientInterpolation', '1', 3),
	(258, 'client', 'general/engine/interpolationSpeed', '0.4', 2),
	(259, 'client', 'general/engine/experimentalClientPrediction', '0', 3),
	(262, 'client', 'players/physicalBody/width', '25', 2),
	(263, 'client', 'players/physicalBody/height', '25', 2),
	(264, 'server', 'objects/actions/closeInteractionOnOutOfReach', '1', 3),
	(265, 'client', 'trade/players/awaitTimeOut', '1', 3),
	(266, 'client', 'trade/players/timeOut', '8000', 2),
	(267, 'client', 'ui/default/responsiveX', '10', 2),
	(268, 'client', 'ui/default/responsiveY', '10', 2),
	(269, 'client', 'ui/default/x', '120', 2),
	(270, 'client', 'ui/default/y', '100', 2),
	(275, 'client', 'ui/trade/responsiveX', '5', 2),
	(276, 'client', 'ui/trade/responsiveY', '5', 2),
	(277, 'client', 'ui/trade/x', '5', 2),
	(278, 'client', 'ui/trade/y', '5', 2),
	(279, 'server', 'enemies/default/affectedProperty', 'stats/hp', 1),
	(280, 'client', 'ui/chat/effectMessages', '1', 3),
	(281, 'client', 'ui/chat/dodgeMessages', '1', 3),
	(282, 'client', 'ui/chat/totalValidTypes', '2', 2),
	(283, 'client', 'ui/teams/enabled', '1', 3),
	(284, 'client', 'ui/teams/responsiveX', '100', 2),
	(285, 'client', 'ui/teams/responsiveY', '0', 2),
	(286, 'client', 'ui/teams/x', '430', 2),
	(287, 'client', 'ui/teams/y', '100', 2),
	(288, 'client', 'ui/teams/sharedProperties', '{"hp":{"path":"stats/hp","pathMax":"statsBase/hp","label":"HP"},"mp":{"path":"stats/mp","pathMax":"statsBase/mp","label":"MP"}}', 4),
	(289, 'client', 'ui/options/acceptOrDecline', '{"1":{"label":"Accept","value":1},"2":{"label":"Decline","value":2}}', 4),
	(290, 'client', 'team/labels/requestFromTitle', 'Team request from:', 1),
	(291, 'client', 'team/labels/leaderNameTitle', 'Team leader: %leaderName', 1),
	(293, 'client', 'ui/controls/allowPrimaryTouch', '1', 3),
	(294, 'client', 'ui/clan/enabled', '1', 3),
	(295, 'client', 'ui/clan/responsiveX', '100', 2),
	(296, 'client', 'ui/clan/responsiveY', '0', 2),
	(297, 'client', 'ui/clan/x', '430', 2),
	(298, 'client', 'ui/clan/y', '100', 2),
	(299, 'client', 'ui/clan/sharedProperties', '{"hp":{"path":"stats/hp","pathMax":"statsBase/hp","label":"HP"},"mp":{"path":"stats/mp","pathMax":"statsBase/mp","label":"MP"}}', 4),
	(300, 'client', 'clan/labels/requestFromTitle', 'Clan request from:', 1),
	(302, 'client', 'clan/labels/leaderNameTitle', 'Clan leader: %leaderName', 1),
	(303, 'client', 'clan/labels/propertyMaxValue', '/ %propertyMaxValue', 1),
	(304, 'server', 'rewards/actions/interactionsDistance', '140', 2),
	(305, 'server', 'rewards/actions/disappearTime', '1800000', 2),
	(306, 'client', 'rewards/titles/rewardMessage', 'You obtained %dropQuantity %itemLabel', 1),
	(307, 'client', 'clan/general/openInvites', '0', 3),
	(311, 'client', 'login/termsAndConditions/link', 'Accept our Terms and Conditions (click here).', 1),
	(312, 'client', 'login/termsAndConditions/heading', 'Terms and conditions', 1),
	(313, 'client', 'login/termsAndConditions/body', 'This is our test terms and conditions content.', 1),
	(314, 'client', 'login/termsAndConditions/checkboxLabel', 'Accept terms and conditions', 1),
	(315, 'client', 'ui/chat/showTabs', '1', 3),
	(317, 'client', 'ads/general/providers/crazyGames/sdkUrl', 'https://sdk.crazygames.com/crazygames-sdk-v2.js', 1),
	(319, 'client', 'ads/general/providers/crazyGames/videoMinimumDuration', '3000', 2),
	(320, 'client', 'ads/general/providers/gameMonetize/sdkUrl', 'https://api.gamemonetize.com/sdk.js', 1),
	(321, 'client', 'ads/general/providers/gameMonetize/gameId', 'your-game-id-should-be-here', 1),
	(322, 'client', 'login/termsAndConditions/es/body', 'Este es el contenido de nuestros términos y condiciones de prueba.', 1),
	(323, 'client', 'login/termsAndConditions/es/checkboxLabel', 'Aceptar terminos y condiciones', 1),
	(324, 'client', 'login/termsAndConditions/es/heading', 'Términos y condiciones', 1),
	(325, 'client', 'login/termsAndConditions/es/link', 'Acepta nuestros Términos y Condiciones (haz clic aquí).', 1);

-- Dumping structure for table config_types
CREATE TABLE IF NOT EXISTS `config_types` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `label` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table config_types: ~5 rows (approximately)
INSERT INTO `config_types` (`id`, `label`) VALUES
	(1, 'string'),
	(2, 'float'),
	(3, 'boolean'),
	(4, 'json'),
	(5, 'comma_separated');

-- Dumping structure for table features
CREATE TABLE IF NOT EXISTS `features` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `is_enabled` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table features: ~15 rows (approximately)
INSERT INTO `features` (`id`, `code`, `title`, `is_enabled`) VALUES
	(1, 'chat', 'Chat', 1),
	(2, 'objects', 'Objects', 1),
	(3, 'respawn', 'Respawn', 1),
	(4, 'inventory', 'Inventory', 1),
	(5, 'firebase', 'Firebase', 1),
	(6, 'actions', 'Actions', 1),
	(7, 'users', 'Users', 1),
	(8, 'audio', 'Audio', 1),
	(9, 'rooms', 'Rooms', 1),
	(10, 'admin', 'Admin', 1),
	(11, 'prediction', 'Prediction', 0),
	(12, 'teams', 'Teams', 1),
	(13, 'rewards', 'Rewards', 1),
	(14, 'snippets', 'Snippets', 1),
	(16, 'ads', 'Ads', 1);

-- Dumping structure for table items_group
CREATE TABLE IF NOT EXISTS `items_group` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `label` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8 COLLATE utf8_unicode_ci,
  `files_name` text CHARACTER SET utf8 COLLATE utf8_unicode_ci,
  `sort` int DEFAULT NULL,
  `items_limit` int NOT NULL DEFAULT '0',
  `limit_per_item` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='The group table is to save the groups settings.';

-- Dumping data for table items_group: ~6 rows (approximately)
INSERT INTO `items_group` (`id`, `key`, `label`, `description`, `files_name`, `sort`, `items_limit`, `limit_per_item`) VALUES
	(1, 'weapon', 'Weapon', 'All kinds of weapons.', 'weapon.png', 2, 1, 0),
	(2, 'shield', 'Shield', 'Protect with these items.', 'shield.png', 3, 1, 0),
	(3, 'armor', 'Armor', '', 'armor.png', 4, 1, 0),
	(4, 'boots', 'Boots', '', 'boots.png', 6, 1, 0),
	(5, 'gauntlets', 'Gauntlets', '', 'gauntlets.png', 5, 1, 0),
	(6, 'helmet', 'Helmet', '', 'helmet.png', 1, 1, 0);

-- Dumping structure for table items_inventory
CREATE TABLE IF NOT EXISTS `items_inventory` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` int unsigned NOT NULL,
  `item_id` int unsigned NOT NULL,
  `qty` int NOT NULL DEFAULT '0',
  `remaining_uses` int DEFAULT NULL,
  `is_active` int DEFAULT NULL COMMENT 'For example equipped or not equipped items.',
  PRIMARY KEY (`id`),
  KEY `FK_items_inventory_items_item` (`item_id`),
  CONSTRAINT `FK_items_inventory_items_item` FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Inventory table is to save the items for each owner.';

-- Dumping structure for table items_item
CREATE TABLE IF NOT EXISTS `items_item` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `type` int NOT NULL DEFAULT '0',
  `group_id` int unsigned DEFAULT NULL,
  `label` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `qty_limit` int NOT NULL DEFAULT '0' COMMENT 'Default 0 to unlimited qty.',
  `uses_limit` int NOT NULL DEFAULT '1' COMMENT 'Default 1 use per item (0 = unlimited).',
  `useTimeOut` int DEFAULT NULL,
  `execTimeOut` int DEFAULT NULL,
  `customData` text CHARACTER SET utf8 COLLATE utf8_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `key` (`key`),
  KEY `group_id` (`group_id`),
  KEY `type` (`type`),
  CONSTRAINT `FK_items_item_items_group` FOREIGN KEY (`group_id`) REFERENCES `items_group` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_items_item_items_types` FOREIGN KEY (`type`) REFERENCES `items_types` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='List of all available items in the system.';

-- Dumping data for table items_item: ~6 rows (approximately)
INSERT INTO `items_item` (`id`, `key`, `type`, `group_id`, `label`, `description`, `qty_limit`, `uses_limit`, `useTimeOut`, `execTimeOut`, `customData`) VALUES
	(1, 'coins', 3, NULL, 'Coins', NULL, 0, 1, NULL, NULL, NULL),
	(2, 'branch', 10, NULL, 'Tree branch', 'An useless tree branch (for now)', 0, 1, NULL, NULL, NULL),
	(3, 'heal_potion_20', 5, NULL, 'Heal Potion', 'A heal potion that will restore 20 HP.', 0, 1, NULL, NULL, '{"animationData":{"frameWidth":64,"frameHeight":64,"start":6,"end":11,"repeat":0,"hide":true,"usePlayerPosition":true,"closeInventoryOnUse":true,"followPlayer":true,"startsOnTarget":true},"removeAfterUse":true}'),
	(4, 'axe', 1, 1, 'Axe', 'A short distance but powerful weapon.', 0, 0, NULL, NULL, '{"animationData":{"frameWidth":64,"frameHeight":64,"start":6,"end":11,"repeat":0,"hide":true,"destroyOnComplete":true,"usePlayerPosition":true,"closeInventoryOnUse":true,"followPlayer":true,"startsOnTarget":true}}'),
	(5, 'spear', 1, 1, 'Spear', 'A short distance but powerful weapon.', 0, 0, NULL, NULL, '{"animationData":{"frameWidth":64,"frameHeight":64,"start":6,"end":11,"repeat":0,"hide":true,"destroyOnComplete":true,"usePlayerPosition":true,"closeInventoryOnUse":true,"followPlayer":true,"startsOnTarget":true}}'),
	(6, 'magic_potion_20', 5, NULL, 'Magic Potion', 'A magic potion that will restore 20 MP.', 0, 1, NULL, NULL, '{"animationData":{"frameWidth":64,"frameHeight":64,"start":6,"end":11,"repeat":0,"hide":true,"usePlayerPosition":true,"closeInventoryOnUse":true,"followPlayer":true,"startsOnTarget":true},"removeAfterUse":true}');

-- Dumping structure for table items_item_modifiers
CREATE TABLE IF NOT EXISTS `items_item_modifiers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `item_id` int unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` int NOT NULL,
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `maxProperty` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `FK_items_item_modifiers_items_item` FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Modifiers is the way we will affect the item owner.';

-- Dumping data for table items_item_modifiers: ~4 rows (approximately)
INSERT INTO `items_item_modifiers` (`id`, `item_id`, `key`, `property_key`, `operation`, `value`, `maxProperty`) VALUES
	(1, 4, 'atk', 'stats/atk', 5, '5', NULL),
	(2, 3, 'heal_potion_20', 'stats/hp', 1, '20', 'statsBase/hp'),
	(3, 5, 'atk', 'stats/atk', 5, '3', NULL),
	(4, 6, 'magic_potion_20', 'stats/mp', 1, '20', 'statsBase/mp');

-- Dumping structure for table items_types
CREATE TABLE IF NOT EXISTS `items_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table items_types: ~6 rows (approximately)
INSERT INTO `items_types` (`id`, `key`) VALUES
	(10, 'base'),
	(1, 'equipment'),
	(3, 'single'),
	(4, 'single_equipment'),
	(5, 'single_usable'),
	(2, 'usable');

-- Dumping structure for table locale
CREATE TABLE IF NOT EXISTS `locale` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `locale` varchar(5) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `language_code` varchar(2) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `country_code` varchar(2) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `enabled` int unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table locale: ~1 rows (approximately)
INSERT INTO `locale` (`id`, `locale`, `language_code`, `country_code`, `enabled`) VALUES
	(1, 'en_US', 'en', 'US', 1);

-- Dumping structure for table objects
CREATE TABLE IF NOT EXISTS `objects` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `room_id` int unsigned NOT NULL,
  `layer_name` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `tile_index` int unsigned DEFAULT NULL,
  `class_type` int unsigned DEFAULT NULL,
  `object_class_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `client_key` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `private_params` text CHARACTER SET utf8 COLLATE utf8_unicode_ci,
  `client_params` text CHARACTER SET utf8 COLLATE utf8_unicode_ci,
  `enabled` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `room_id_layer_name_tile_index` (`room_id`,`layer_name`,`tile_index`),
  KEY `room_id` (`room_id`),
  KEY `object_class_key` (`object_class_key`),
  KEY `class_type` (`class_type`),
  CONSTRAINT `FK_objects_objects_types` FOREIGN KEY (`class_type`) REFERENCES `objects_types` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_objects_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table objects: ~9 rows (approximately)
INSERT INTO `objects` (`id`, `room_id`, `layer_name`, `tile_index`, `class_type`, `object_class_key`, `client_key`, `title`, `private_params`, `client_params`, `enabled`) VALUES
	(1, 4, 'ground-collisions', 444, 2, 'door_1', 'door_house_1', '', '{"runOnHit":true,"roomVisible":true,"yFix":6}', '{"positionFix":{"y":-18},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000}', 1),
	(4, 4, 'ground-collisions', 951, 2, 'door_2', 'door_house_2', '', '{"runOnHit":true,"roomVisible":true,"yFix":6}', '{"positionFix":{"y":-18},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000}', 1),
	(5, 4, 'house-collisions-over-player', 535, 3, 'npc_1', 'people_town_1', 'Alfred', '{"runOnAction":true,"playerVisible":true}', '{"content":"Hello! My name is Alfred. Go to the forest and kill some monsters! Now... leave me alone!"}', 1),
	(6, 5, 'respawn-area-monsters-lvl-1-2', NULL, 7, 'enemy_1', 'enemy_forest_1', 'Tree', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true}', '{"autoStart":true}', 1),
	(7, 5, 'respawn-area-monsters-lvl-1-2', NULL, 7, 'enemy_2', 'enemy_forest_2', 'Tree Punch', '{"shouldRespawn":true,"childObjectType":4}', '{"autoStart":true}', 1),
	(8, 4, 'house-collisions-over-player', 538, 3, 'npc_2', 'healer_1', 'Mamon', '{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true}', '{"content":"Hello traveler! I can restore your health, would you like me to do it?","options":{"1":{"label":"Heal HP","value":1},"2":{"label":"Nothing...","value":2},"3":{"label":"Need some MP","value":3}},"ui":true}', 1),
	(10, 4, 'house-collisions-over-player', 560, 5, 'npc_3', 'merchant_1', 'Gimly', '{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true}', '{"content":"Hi there! What would you like to do?","options":{"buy":{"label":"Buy","value":"buy"},"sell":{"label":"Sell","value":"sell"}}}', 1),
	(12, 4, 'house-collisions-over-player', 562, 3, 'npc_4', 'weapons_master_1', 'Barrik', '{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true}', '{"content":"Hi, I am the weapons master, choose your weapon and go kill some monsters!","options":{"1":{"key":"axe","label":"Axe","value":1,"icon":"axe"},"2":{"key":"spear","label":"Spear","value":2,"icon":"spear"}},"ui":true}', 1),
	(13, 5, 'forest-collisions', 258, 3, 'npc_5', 'quest_npc_1', 'Miles', '{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true}', '{"content":"Hi there! Do you want a coin? I can give you one if you give me a tree branch.","options":{"1":{"label":"Sure!","value":1},"2":{"label":"No, thank you.","value":2}},"ui":true}', 1);

-- Dumping structure for table objects_animations
CREATE TABLE IF NOT EXISTS `objects_animations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int unsigned NOT NULL,
  `animationKey` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `animationData` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `object_id_animationKey` (`object_id`,`animationKey`),
  KEY `id` (`id`) USING BTREE,
  KEY `object_id` (`object_id`) USING BTREE,
  CONSTRAINT `FK_objects_animations_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table objects_animations: ~4 rows (approximately)
INSERT INTO `objects_animations` (`id`, `object_id`, `animationKey`, `animationData`) VALUES
	(5, 6, 'respawn-area-monsters-lvl-1-2_6_right', '{"start":6,"end":8}'),
	(6, 6, 'respawn-area-monsters-lvl-1-2_6_down', '{"start":0,"end":2}'),
	(7, 6, 'respawn-area-monsters-lvl-1-2_6_left', '{"start":3,"end":5}'),
	(8, 6, 'respawn-area-monsters-lvl-1-2_6_up', '{"start":9,"end":11}');

-- Dumping structure for table objects_assets
CREATE TABLE IF NOT EXISTS `objects_assets` (
  `object_asset_id` int unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int unsigned NOT NULL,
  `asset_type` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `asset_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `file_1` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `file_2` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `extra_params` text CHARACTER SET utf8 COLLATE utf8_unicode_ci,
  PRIMARY KEY (`object_asset_id`),
  KEY `object_id` (`object_id`),
  CONSTRAINT `FK_objects_assets_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table objects_assets: ~9 rows (approximately)
INSERT INTO `objects_assets` (`object_asset_id`, `object_id`, `asset_type`, `asset_key`, `file_1`, `file_2`, `extra_params`) VALUES
	(1, 1, 'spritesheet', 'door_house_1', 'door-a-x2', NULL, '{"frameWidth":32,"frameHeight":58}'),
	(2, 4, 'spritesheet', 'door_house_2', 'door-a-x2', NULL, '{"frameWidth":32,"frameHeight":58}'),
	(3, 5, 'spritesheet', 'people_town_1', 'people-b-x2', NULL, '{"frameWidth":52,"frameHeight":71}'),
	(5, 6, 'spritesheet', 'enemy_forest_1', 'monster-treant', NULL, '{"frameWidth":47,"frameHeight":50}'),
	(6, 7, 'spritesheet', 'enemy_forest_2', 'monster-golem2', NULL, '{"frameWidth":47,"frameHeight":50}'),
	(7, 5, 'spritesheet', 'healer_1', 'healer-1', NULL, '{"frameWidth":52,"frameHeight":71}'),
	(9, 10, 'spritesheet', 'merchant_1', 'people-d-x2', NULL, '{"frameWidth":52,"frameHeight":71}'),
	(10, 12, 'spritesheet', 'weapons_master_1', 'people-c-x2', NULL, '{"frameWidth":52,"frameHeight":71}'),
	(11, 13, 'spritesheet', 'quest_npc_1', 'people-quest-npc', NULL, '{"frameWidth":52,"frameHeight":71}');

-- Dumping structure for table objects_items_inventory
CREATE TABLE IF NOT EXISTS `objects_items_inventory` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` int unsigned NOT NULL,
  `item_id` int unsigned NOT NULL,
  `qty` int NOT NULL DEFAULT '0',
  `remaining_uses` int DEFAULT NULL,
  `is_active` int DEFAULT NULL COMMENT 'For example equipped or not equipped items.',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `FK_items_inventory_items_item` (`item_id`) USING BTREE,
  KEY `FK_objects_items_inventory_objects` (`owner_id`),
  CONSTRAINT `FK_objects_items_inventory_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_objects_items_inventory_objects` FOREIGN KEY (`owner_id`) REFERENCES `objects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci ROW_FORMAT=COMPACT COMMENT='Inventory table is to save the items for each owner.';

-- Dumping data for table objects_items_inventory: ~4 rows (approximately)
INSERT INTO `objects_items_inventory` (`id`, `owner_id`, `item_id`, `qty`, `remaining_uses`, `is_active`) VALUES
	(2, 10, 4, -1, -1, 0),
	(3, 10, 5, -1, -1, 0),
	(5, 10, 3, -1, 1, 0),
	(6, 10, 6, -1, 1, 0);

-- Dumping structure for table objects_items_requirements
CREATE TABLE IF NOT EXISTS `objects_items_requirements` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int unsigned NOT NULL,
  `item_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `required_item_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `required_quantity` int unsigned NOT NULL DEFAULT '0',
  `auto_remove_requirement` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `FK_objects_items_requirements_objects` (`object_id`),
  KEY `FK_objects_items_requirements_items_item` (`item_key`),
  KEY `FK_objects_items_requirements_items_item_2` (`required_item_key`),
  CONSTRAINT `FK_objects_items_requirements_items_item` FOREIGN KEY (`item_key`) REFERENCES `items_item` (`key`),
  CONSTRAINT `FK_objects_items_requirements_items_item_2` FOREIGN KEY (`required_item_key`) REFERENCES `items_item` (`key`),
  CONSTRAINT `FK_objects_items_requirements_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table objects_items_requirements: ~4 rows (approximately)
INSERT INTO `objects_items_requirements` (`id`, `object_id`, `item_key`, `required_item_key`, `required_quantity`, `auto_remove_requirement`) VALUES
	(1, 10, 'axe', 'coins', 5, 1),
	(2, 10, 'spear', 'coins', 2, 1),
	(3, 10, 'heal_potion_20', 'coins', 2, 1),
	(5, 10, 'magic_potion_20', 'coins', 2, 1);

-- Dumping structure for table objects_items_rewards
CREATE TABLE IF NOT EXISTS `objects_items_rewards` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int unsigned NOT NULL,
  `item_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `reward_item_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `reward_quantity` int unsigned NOT NULL DEFAULT '0',
  `reward_item_is_required` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `FK_objects_items_requirements_objects` (`object_id`) USING BTREE,
  KEY `FK_objects_items_rewards_items_item` (`item_key`),
  KEY `FK_objects_items_rewards_items_item_2` (`reward_item_key`),
  CONSTRAINT `FK_objects_items_rewards_items_item` FOREIGN KEY (`item_key`) REFERENCES `items_item` (`key`),
  CONSTRAINT `FK_objects_items_rewards_items_item_2` FOREIGN KEY (`reward_item_key`) REFERENCES `items_item` (`key`),
  CONSTRAINT `objects_items_rewards_ibfk_1` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci ROW_FORMAT=COMPACT;

-- Dumping data for table objects_items_rewards: ~4 rows (approximately)
INSERT INTO `objects_items_rewards` (`id`, `object_id`, `item_key`, `reward_item_key`, `reward_quantity`, `reward_item_is_required`) VALUES
	(1, 10, 'axe', 'coins', 2, 0),
	(2, 10, 'spear', 'coins', 1, 0),
	(3, 10, 'heal_potion_20', 'coins', 1, 0),
	(5, 10, 'magic_potion_20', 'coins', 1, 0);

-- Dumping structure for table objects_items_rewards_animations
CREATE TABLE IF NOT EXISTS `objects_items_rewards_animations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `reward_id` int unsigned NOT NULL,
  `asset_type` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `asset_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `file` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `extra_params` text CHARACTER SET utf8 COLLATE utf8_unicode_ci,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `FK_objects_items_rewards_animations_rewards` (`reward_id`) USING BTREE,
  CONSTRAINT `FK_objects_items_rewards_animations_rewards` FOREIGN KEY (`reward_id`) REFERENCES `rewards` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table objects_items_rewards_animations: ~2 rows (approximately)
INSERT INTO `objects_items_rewards_animations` (`id`, `reward_id`, `asset_type`, `asset_key`, `file`, `extra_params`) VALUES
	(1, 2, 'spritesheet', 'branch-sprite', 'branch-sprite', '{"start":0,"end":2,"repeat":-1,"frameWidth":32, "frameHeight":32,"depthByPlayer":"above"}'),
	(2, 1, 'spritesheet', 'branch-sprite', 'branch-sprite', '{"start":0,"end":2,"repeat":-1,"frameWidth":32, "frameHeight":32,"depthByPlayer":"above"}');

-- Dumping structure for table objects_skills
CREATE TABLE IF NOT EXISTS `objects_skills` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int unsigned NOT NULL,
  `skill_id` int unsigned NOT NULL,
  `target` tinyint unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `FK_objects_skills_objects` (`object_id`),
  KEY `FK_objects_skills_skills_skill` (`skill_id`),
  KEY `FK_objects_skills_target_options` (`target`),
  CONSTRAINT `FK_objects_skills_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_objects_skills_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_objects_skills_target_options` FOREIGN KEY (`target`) REFERENCES `target_options` (`target_key`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table objects_skills: ~1 rows (approximately)
INSERT INTO `objects_skills` (`id`, `object_id`, `skill_id`, `target`) VALUES
	(1, 6, 1, 1);

-- Dumping structure for table objects_stats
CREATE TABLE IF NOT EXISTS `objects_stats` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int unsigned NOT NULL,
  `stat_id` int unsigned NOT NULL,
  `base_value` int unsigned NOT NULL,
  `value` int unsigned NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `object_id_stat_id` (`object_id`,`stat_id`) USING BTREE,
  KEY `stat_id` (`stat_id`) USING BTREE,
  KEY `object_id` (`object_id`) USING BTREE,
  CONSTRAINT `FK_object_current_stats_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `FK_objects_current_stats_objects_stats` FOREIGN KEY (`stat_id`) REFERENCES `stats` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table objects_stats: ~20 rows (approximately)
INSERT INTO `objects_stats` (`id`, `object_id`, `stat_id`, `base_value`, `value`) VALUES
	(1, 7, 1, 50, 50),
	(2, 7, 2, 50, 50),
	(3, 7, 3, 50, 50),
	(4, 7, 4, 50, 50),
	(5, 7, 5, 50, 50),
	(6, 7, 6, 50, 50),
	(7, 7, 7, 50, 50),
	(8, 7, 8, 50, 50),
	(9, 7, 9, 50, 50),
	(10, 7, 10, 50, 50),
	(16, 6, 1, 50, 50),
	(17, 6, 2, 50, 50),
	(18, 6, 3, 50, 50),
	(19, 6, 4, 50, 50),
	(20, 6, 5, 50, 50),
	(21, 6, 6, 50, 50),
	(22, 6, 7, 50, 50),
	(23, 6, 8, 50, 50),
	(24, 6, 9, 50, 50),
	(25, 6, 10, 50, 50);

-- Dumping structure for table objects_types
CREATE TABLE IF NOT EXISTS `objects_types` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table objects_types: ~7 rows (approximately)
INSERT INTO `objects_types` (`id`, `key`) VALUES
	(2, 'animation'),
	(1, 'base'),
	(6, 'drop'),
	(4, 'enemy'),
	(7, 'multiple'),
	(3, 'npc'),
	(5, 'trader');

-- Dumping structure for table operation_types
CREATE TABLE IF NOT EXISTS `operation_types` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `label` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `key` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table operation_types: ~9 rows (approximately)
INSERT INTO `operation_types` (`id`, `label`, `key`) VALUES
	(1, 'Increment', 1),
	(3, 'Decrease', 2),
	(4, 'Divide', 3),
	(5, 'Multiply', 4),
	(6, 'Increment Percentage', 5),
	(7, 'Decrease Percentage', 6),
	(8, 'Set', 7),
	(9, 'Method', 8),
	(10, 'Set Number', 9);

-- Dumping structure for table players
CREATE TABLE IF NOT EXISTS `players` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `FK_players_users` (`user_id`),
  CONSTRAINT `FK_players_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table players: ~1 rows (approximately)
INSERT INTO `players` (`id`, `user_id`, `name`, `created_at`) VALUES
	(1, 1, 'Darth', '2022-03-17 19:57:50');

-- Dumping structure for table players_state
CREATE TABLE IF NOT EXISTS `players_state` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `player_id` int unsigned NOT NULL,
  `room_id` int unsigned NOT NULL,
  `x` int unsigned NOT NULL,
  `y` int unsigned NOT NULL,
  `dir` varchar(25) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_player_state_rooms` (`room_id`),
  KEY `FK_player_state_player_stats` (`player_id`),
  CONSTRAINT `FK_player_state_player_stats` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_player_state_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table players_state: ~1 rows (approximately)
INSERT INTO `players_state` (`id`, `player_id`, `room_id`, `x`, `y`, `dir`) VALUES
	(1, 1, 4, 979, 552, 'down');

-- Dumping structure for table players_stats
CREATE TABLE IF NOT EXISTS `players_stats` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `player_id` int unsigned NOT NULL,
  `stat_id` int unsigned NOT NULL,
  `base_value` int unsigned NOT NULL,
  `value` int unsigned NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `player_id_stat_id` (`player_id`,`stat_id`) USING BTREE,
  KEY `stat_id` (`stat_id`) USING BTREE,
  KEY `user_id` (`player_id`) USING BTREE,
  CONSTRAINT `FK_player_current_stats_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `FK_players_current_stats_players_stats` FOREIGN KEY (`stat_id`) REFERENCES `stats` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table players_stats: ~10 rows (approximately)
INSERT INTO `players_stats` (`id`, `player_id`, `stat_id`, `base_value`, `value`) VALUES
	(1, 1, 1, 280, 194),
	(2, 1, 2, 280, 120),
	(3, 1, 3, 280, 400),
	(4, 1, 4, 280, 280),
	(5, 1, 5, 100, 100),
	(6, 1, 6, 100, 100),
	(7, 1, 7, 100, 100),
	(8, 1, 8, 100, 100),
	(9, 1, 9, 100, 100),
	(10, 1, 10, 100, 100);

-- Dumping structure for table respawn
CREATE TABLE IF NOT EXISTS `respawn` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int unsigned NOT NULL,
  `respawn_time` int unsigned NOT NULL DEFAULT '0',
  `instances_limit` int unsigned NOT NULL DEFAULT '0',
  `layer` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `respawn_object_id` (`object_id`),
  CONSTRAINT `FK_respawn_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table respawn: ~2 rows (approximately)
INSERT INTO `respawn` (`id`, `object_id`, `respawn_time`, `instances_limit`, `layer`) VALUES
	(3, 6, 20000, 2, 'respawn-area-monsters-lvl-1-2'),
	(4, 7, 10000, 3, 'respawn-area-monsters-lvl-1-2');

-- Dumping structure for table rewards
CREATE TABLE IF NOT EXISTS `rewards` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int unsigned NOT NULL,
  `item_id` int unsigned DEFAULT NULL,
  `modifier_id` int unsigned DEFAULT NULL,
  `experience` int unsigned NOT NULL DEFAULT '0',
  `drop_rate` int unsigned NOT NULL,
  `drop_quantity` int unsigned NOT NULL,
  `is_unique` tinyint unsigned NOT NULL DEFAULT '0',
  `was_given` tinyint unsigned NOT NULL DEFAULT '0',
  `has_drop_body` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `FK_rewards_items_item` (`item_id`) USING BTREE,
  KEY `FK_rewards_objects` (`object_id`) USING BTREE,
  KEY `FK_rewards_rewards_modifiers` (`modifier_id`),
  CONSTRAINT `FK_rewards_items_item` FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`),
  CONSTRAINT `FK_rewards_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`),
  CONSTRAINT `FK_rewards_rewards_modifiers` FOREIGN KEY (`modifier_id`) REFERENCES `rewards_modifiers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table rewards: ~2 rows (approximately)
INSERT INTO `rewards` (`id`, `object_id`, `item_id`, `modifier_id`, `experience`, `drop_rate`, `drop_quantity`, `is_unique`, `was_given`, `has_drop_body`) VALUES
	(1, 7, 2, NULL, 10, 100, 1, 0, 0, 1),
	(2, 6, 2, NULL, 10, 100, 3, 0, 0, 1);

-- Dumping structure for table rewards_modifiers
CREATE TABLE IF NOT EXISTS `rewards_modifiers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` int unsigned NOT NULL,
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `minValue` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `maxValue` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `minProperty` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `maxProperty` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `modifier_id` (`key`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping structure for table rooms
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `map_filename` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL COMMENT 'The map JSON file name.',
  `scene_images` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `room_class_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `customData` text CHARACTER SET utf8 COLLATE utf8_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table rooms: ~6 rows (approximately)
INSERT INTO `rooms` (`id`, `name`, `title`, `map_filename`, `scene_images`, `room_class_key`, `customData`) VALUES
	(2, 'ReldensHouse_1', 'House - 1', 'reldens-house-1', 'reldens-house-1', NULL, NULL),
	(3, 'ReldensHouse_2', 'House - 2', 'reldens-house-2', 'reldens-house-2', NULL, NULL),
	(4, 'ReldensTown', 'Town', 'reldens-town', 'reldens-town', NULL, NULL),
	(5, 'ReldensForest', 'Forest', 'reldens-forest', 'reldens-forest', NULL, NULL),
	(6, 'ReldensHouse_1b', 'House - 1 - Floor 2', 'reldens-house-1-2d-floor', 'reldens-house-1-2d-floor', NULL, NULL),
	(7, 'TopDownRoom', 'Gravity World!', 'reldens-gravity', 'reldens-gravity', NULL, '{"gravity":[0,625],"applyGravity":true,"allowPassWallsFromBelow":true,"timeStep":0.012,"type":"TOP_DOWN_WITH_GRAVITY","useFixedWorldStep":false,"maxSubSteps":5,"movementSpeed":200,"usePathFinder":false}');

-- Dumping structure for table rooms_change_points
CREATE TABLE IF NOT EXISTS `rooms_change_points` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `room_id` int unsigned NOT NULL,
  `tile_index` int unsigned NOT NULL,
  `next_room_id` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `scene_id` (`room_id`),
  KEY `FK_rooms_change_points_rooms_2` (`next_room_id`),
  CONSTRAINT `FK_rooms_change_points_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_rooms_change_points_rooms_2` FOREIGN KEY (`next_room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table rooms_change_points: ~17 rows (approximately)
INSERT INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES
	(1, 2, 816, 4),
	(2, 2, 817, 4),
	(3, 3, 778, 4),
	(4, 3, 779, 4),
	(5, 4, 444, 2),
	(6, 4, 951, 3),
	(7, 4, 18, 5),
	(8, 4, 19, 5),
	(9, 5, 1315, 4),
	(10, 5, 1316, 4),
	(11, 2, 623, 6),
	(12, 2, 663, 6),
	(13, 6, 624, 2),
	(14, 6, 664, 2),
	(15, 7, 540, 3),
	(16, 3, 500, 7),
	(17, 3, 780, 7);

-- Dumping structure for table rooms_return_points
CREATE TABLE IF NOT EXISTS `rooms_return_points` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `room_id` int unsigned NOT NULL,
  `direction` varchar(5) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `x` int unsigned NOT NULL,
  `y` int unsigned NOT NULL,
  `is_default` int unsigned NOT NULL,
  `from_room_id` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_scenes_return_points_rooms` (`room_id`),
  KEY `FK_scenes_return_points_rooms_2` (`from_room_id`) USING BTREE,
  CONSTRAINT `FK_rooms_return_points_rooms_from_room_id` FOREIGN KEY (`from_room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `FK_rooms_return_points_rooms_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table rooms_return_points: ~10 rows (approximately)
INSERT INTO `rooms_return_points` (`id`, `room_id`, `direction`, `x`, `y`, `is_default`, `from_room_id`) VALUES
	(1, 2, 'up', 548, 615, 1, 4),
	(2, 3, 'up', 640, 600, 1, 4),
	(3, 4, 'down', 400, 345, 1, 2),
	(4, 4, 'down', 1266, 670, 0, 3),
	(5, 5, 'up', 640, 768, 0, 4),
	(7, 4, 'down', 615, 64, 0, 5),
	(9, 6, 'right', 820, 500, 0, 2),
	(11, 2, 'left', 720, 540, 0, 6),
	(12, 7, 'left', 340, 600, 0, NULL),
	(13, 3, 'down', 660, 520, 0, 7);

-- Dumping structure for table skills_class_level_up_animations
CREATE TABLE IF NOT EXISTS `skills_class_level_up_animations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `class_path_id` int unsigned DEFAULT NULL,
  `level_id` int unsigned DEFAULT NULL,
  `animationData` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `class_path_id_level_id` (`class_path_id`,`level_id`) USING BTREE,
  KEY `FK_skills_class_level_up_skills_levels` (`level_id`) USING BTREE,
  CONSTRAINT `FK_skills_class_level_up_skills_class_path` FOREIGN KEY (`class_path_id`) REFERENCES `skills_class_path` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `FK_skills_class_level_up_skills_levels` FOREIGN KEY (`level_id`) REFERENCES `skills_levels` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table skills_class_level_up_animations: ~1 rows (approximately)
INSERT INTO `skills_class_level_up_animations` (`id`, `class_path_id`, `level_id`, `animationData`) VALUES
	(1, NULL, NULL, '{"enabled":true,"type":"spritesheet","img":"heal_cast","frameWidth":64,"frameHeight":70,"start":0,"end":3,"repeat":-1,"destroyTime":2000,"depthByPlayer":"above"}');

-- Dumping structure for table skills_class_path
CREATE TABLE IF NOT EXISTS `skills_class_path` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `label` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `levels_set_id` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`),
  KEY `levels_set_id` (`levels_set_id`),
  CONSTRAINT `FK_skills_class_path_skills_levels_set` FOREIGN KEY (`levels_set_id`) REFERENCES `skills_levels_set` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table skills_class_path: ~5 rows (approximately)
INSERT INTO `skills_class_path` (`id`, `key`, `label`, `levels_set_id`) VALUES
	(1, 'journeyman', 'Journeyman', 1),
	(2, 'sorcerer', 'Sorcerer', 2),
	(3, 'warlock', 'Warlock', 3),
	(4, 'swordsman', 'Swordsman', 4),
	(5, 'warrior', 'Warrior', 5);

-- Dumping structure for table skills_class_path_level_labels
CREATE TABLE IF NOT EXISTS `skills_class_path_level_labels` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `class_path_id` int unsigned NOT NULL,
  `level_id` int unsigned NOT NULL,
  `label` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `class_path_id_level_key` (`class_path_id`,`level_id`) USING BTREE,
  KEY `class_path_id` (`class_path_id`),
  KEY `level_key` (`level_id`) USING BTREE,
  CONSTRAINT `FK__skills_class_path` FOREIGN KEY (`class_path_id`) REFERENCES `skills_class_path` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_skills_class_path_level_labels_skills_levels` FOREIGN KEY (`level_id`) REFERENCES `skills_levels` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table skills_class_path_level_labels: ~5 rows (approximately)
INSERT INTO `skills_class_path_level_labels` (`id`, `class_path_id`, `level_id`, `label`) VALUES
	(1, 1, 3, 'Old Traveler'),
	(2, 2, 7, 'Fire Master'),
	(3, 3, 11, 'Magus'),
	(4, 4, 15, 'Blade Master'),
	(5, 5, 19, 'Palading');

-- Dumping structure for table skills_class_path_level_skills
CREATE TABLE IF NOT EXISTS `skills_class_path_level_skills` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `class_path_id` int unsigned NOT NULL,
  `level_id` int unsigned NOT NULL,
  `skill_id` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `class_path_id` (`class_path_id`),
  KEY `skill_id` (`skill_id`),
  KEY `level_key` (`level_id`) USING BTREE,
  CONSTRAINT `FK_skills_class_path_level_skills_skills_class_path` FOREIGN KEY (`class_path_id`) REFERENCES `skills_class_path` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_skills_class_path_level_skills_skills_levels` FOREIGN KEY (`level_id`) REFERENCES `skills_levels` (`key`) ON UPDATE CASCADE,
  CONSTRAINT `FK_skills_class_path_level_skills_skills_levels_id` FOREIGN KEY (`level_id`) REFERENCES `skills_levels` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_skills_class_path_level_skills_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table skills_class_path_level_skills: ~15 rows (approximately)
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES
	(1, 1, 1, 2),
	(2, 1, 3, 1),
	(3, 1, 4, 3),
	(4, 1, 4, 4),
	(5, 2, 5, 1),
	(6, 2, 7, 3),
	(7, 2, 8, 4),
	(8, 3, 9, 1),
	(9, 3, 11, 3),
	(10, 3, 12, 2),
	(11, 4, 13, 2),
	(12, 4, 15, 4),
	(13, 5, 17, 2),
	(14, 5, 19, 1),
	(15, 5, 20, 4);

-- Dumping structure for table skills_groups
CREATE TABLE IF NOT EXISTS `skills_groups` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `label` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `sort` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping structure for table skills_levels
CREATE TABLE IF NOT EXISTS `skills_levels` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` int unsigned NOT NULL,
  `label` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `required_experience` bigint unsigned DEFAULT NULL,
  `level_set_id` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key_level_set_id` (`key`,`level_set_id`),
  KEY `level_set_id` (`level_set_id`),
  CONSTRAINT `FK_skills_levels_skills_levels_set` FOREIGN KEY (`level_set_id`) REFERENCES `skills_levels_set` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table skills_levels: ~20 rows (approximately)
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES
	(1, 1, '1', 0, 1),
	(2, 2, '2', 100, 1),
	(3, 5, '5', 338, 1),
	(4, 10, '10', 2570, 1),
	(5, 1, '1', 0, 2),
	(6, 2, '2', 100, 2),
	(7, 5, '5', 338, 2),
	(8, 10, '10', 2570, 2),
	(9, 1, '1', 0, 3),
	(10, 2, '2', 100, 3),
	(11, 5, '5', 338, 3),
	(12, 10, '10', 2570, 3),
	(13, 1, '1', 0, 4),
	(14, 2, '2', 100, 4),
	(15, 5, '5', 338, 4),
	(16, 10, '10', 2570, 4),
	(17, 1, '1', 0, 5),
	(18, 2, '2', 100, 5),
	(19, 5, '5', 338, 5),
	(20, 10, '10', 2570, 5);

-- Dumping structure for table skills_levels_modifiers
CREATE TABLE IF NOT EXISTS `skills_levels_modifiers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `level_id` int unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` int unsigned NOT NULL,
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `minValue` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `maxValue` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `minProperty` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `maxProperty` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `modifier_id` (`key`) USING BTREE,
  KEY `level_key` (`level_id`) USING BTREE,
  KEY `FK_skills_levels_modifiers_operation_types` (`operation`),
  CONSTRAINT `FK_skills_levels_modifiers_operation_types` FOREIGN KEY (`operation`) REFERENCES `operation_types` (`key`),
  CONSTRAINT `FK_skills_levels_modifiers_skills_levels` FOREIGN KEY (`level_id`) REFERENCES `skills_levels` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=121 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Modifiers table.';

-- Dumping data for table skills_levels_modifiers: ~120 rows (approximately)
INSERT INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES
	(1, 2, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL),
	(2, 2, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL),
	(3, 2, 'inc_hp', 'stats/hp', 1, '10', NULL, NULL, NULL, NULL),
	(4, 2, 'inc_mp', 'stats/mp', 1, '10', NULL, NULL, NULL, NULL),
	(5, 2, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL),
	(6, 2, 'inc_def', 'statsBase/def', 1, '10', NULL, NULL, NULL, NULL),
	(7, 2, 'inc_hp', 'statsBase/hp', 1, '10', NULL, NULL, NULL, NULL),
	(8, 2, 'inc_mp', 'statsBase/mp', 1, '10', NULL, NULL, NULL, NULL),
	(9, 3, 'inc_atk', 'stats/atk', 1, '20', NULL, NULL, NULL, NULL),
	(10, 3, 'inc_def', 'stats/def', 1, '20', NULL, NULL, NULL, NULL),
	(11, 3, 'inc_hp', 'stats/hp', 1, '20', NULL, NULL, NULL, NULL),
	(12, 3, 'inc_mp', 'stats/mp', 1, '20', NULL, NULL, NULL, NULL),
	(13, 3, 'inc_atk', 'statsBase/atk', 1, '20', NULL, NULL, NULL, NULL),
	(14, 3, 'inc_def', 'statsBase/def', 1, '20', NULL, NULL, NULL, NULL),
	(15, 3, 'inc_hp', 'statsBase/hp', 1, '20', NULL, NULL, NULL, NULL),
	(16, 3, 'inc_mp', 'statsBase/mp', 1, '20', NULL, NULL, NULL, NULL),
	(17, 4, 'inc_atk', 'stats/atk', 1, '50', NULL, NULL, NULL, NULL),
	(18, 4, 'inc_def', 'stats/def', 1, '50', NULL, NULL, NULL, NULL),
	(19, 4, 'inc_hp', 'stats/hp', 1, '50', NULL, NULL, NULL, NULL),
	(20, 4, 'inc_mp', 'stats/mp', 1, '50', NULL, NULL, NULL, NULL),
	(21, 4, 'inc_atk', 'statsBase/atk', 1, '50', NULL, NULL, NULL, NULL),
	(22, 4, 'inc_def', 'statsBase/def', 1, '50', NULL, NULL, NULL, NULL),
	(23, 4, 'inc_hp', 'statsBase/hp', 1, '50', NULL, NULL, NULL, NULL),
	(24, 4, 'inc_mp', 'statsBase/mp', 1, '50', NULL, NULL, NULL, NULL),
	(25, 6, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL),
	(26, 6, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL),
	(27, 6, 'inc_hp', 'stats/hp', 1, '10', NULL, NULL, NULL, NULL),
	(28, 6, 'inc_mp', 'stats/mp', 1, '10', NULL, NULL, NULL, NULL),
	(29, 6, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL),
	(30, 6, 'inc_def', 'statsBase/def', 1, '10', NULL, NULL, NULL, NULL),
	(31, 6, 'inc_hp', 'statsBase/hp', 1, '10', NULL, NULL, NULL, NULL),
	(32, 6, 'inc_mp', 'statsBase/mp', 1, '10', NULL, NULL, NULL, NULL),
	(33, 7, 'inc_atk', 'stats/atk', 1, '20', NULL, NULL, NULL, NULL),
	(34, 7, 'inc_def', 'stats/def', 1, '20', NULL, NULL, NULL, NULL),
	(35, 7, 'inc_hp', 'stats/hp', 1, '20', NULL, NULL, NULL, NULL),
	(36, 7, 'inc_mp', 'stats/mp', 1, '20', NULL, NULL, NULL, NULL),
	(37, 7, 'inc_atk', 'statsBase/atk', 1, '20', NULL, NULL, NULL, NULL),
	(38, 7, 'inc_def', 'statsBase/def', 1, '20', NULL, NULL, NULL, NULL),
	(39, 7, 'inc_hp', 'statsBase/hp', 1, '20', NULL, NULL, NULL, NULL),
	(40, 7, 'inc_mp', 'statsBase/mp', 1, '20', NULL, NULL, NULL, NULL),
	(41, 8, 'inc_atk', 'stats/atk', 1, '50', NULL, NULL, NULL, NULL),
	(42, 8, 'inc_def', 'stats/def', 1, '50', NULL, NULL, NULL, NULL),
	(43, 8, 'inc_hp', 'stats/hp', 1, '50', NULL, NULL, NULL, NULL),
	(44, 8, 'inc_mp', 'stats/mp', 1, '50', NULL, NULL, NULL, NULL),
	(45, 8, 'inc_atk', 'statsBase/atk', 1, '50', NULL, NULL, NULL, NULL),
	(46, 8, 'inc_def', 'statsBase/def', 1, '50', NULL, NULL, NULL, NULL),
	(47, 8, 'inc_hp', 'statsBase/hp', 1, '50', NULL, NULL, NULL, NULL),
	(48, 8, 'inc_mp', 'statsBase/mp', 1, '50', NULL, NULL, NULL, NULL),
	(49, 10, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL),
	(50, 10, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL),
	(51, 10, 'inc_hp', 'stats/hp', 1, '10', NULL, NULL, NULL, NULL),
	(52, 10, 'inc_mp', 'stats/mp', 1, '10', NULL, NULL, NULL, NULL),
	(53, 10, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL),
	(54, 10, 'inc_def', 'statsBase/def', 1, '10', NULL, NULL, NULL, NULL),
	(55, 10, 'inc_hp', 'statsBase/hp', 1, '10', NULL, NULL, NULL, NULL),
	(56, 10, 'inc_mp', 'statsBase/mp', 1, '10', NULL, NULL, NULL, NULL),
	(57, 11, 'inc_atk', 'stats/atk', 1, '20', NULL, NULL, NULL, NULL),
	(58, 11, 'inc_def', 'stats/def', 1, '20', NULL, NULL, NULL, NULL),
	(59, 11, 'inc_hp', 'stats/hp', 1, '20', NULL, NULL, NULL, NULL),
	(60, 11, 'inc_mp', 'stats/mp', 1, '20', NULL, NULL, NULL, NULL),
	(61, 11, 'inc_atk', 'statsBase/atk', 1, '20', NULL, NULL, NULL, NULL),
	(62, 11, 'inc_def', 'statsBase/def', 1, '20', NULL, NULL, NULL, NULL),
	(63, 11, 'inc_hp', 'statsBase/hp', 1, '20', NULL, NULL, NULL, NULL),
	(64, 11, 'inc_mp', 'statsBase/mp', 1, '20', NULL, NULL, NULL, NULL),
	(65, 12, 'inc_atk', 'stats/atk', 1, '50', NULL, NULL, NULL, NULL),
	(66, 12, 'inc_def', 'stats/def', 1, '50', NULL, NULL, NULL, NULL),
	(67, 12, 'inc_hp', 'stats/hp', 1, '50', NULL, NULL, NULL, NULL),
	(68, 12, 'inc_mp', 'stats/mp', 1, '50', NULL, NULL, NULL, NULL),
	(69, 12, 'inc_atk', 'statsBase/atk', 1, '50', NULL, NULL, NULL, NULL),
	(70, 12, 'inc_def', 'statsBase/def', 1, '50', NULL, NULL, NULL, NULL),
	(71, 12, 'inc_hp', 'statsBase/hp', 1, '50', NULL, NULL, NULL, NULL),
	(72, 12, 'inc_mp', 'statsBase/mp', 1, '50', NULL, NULL, NULL, NULL),
	(73, 14, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL),
	(74, 14, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL),
	(75, 14, 'inc_hp', 'stats/hp', 1, '10', NULL, NULL, NULL, NULL),
	(76, 14, 'inc_mp', 'stats/mp', 1, '10', NULL, NULL, NULL, NULL),
	(77, 14, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL),
	(78, 14, 'inc_def', 'statsBase/def', 1, '10', NULL, NULL, NULL, NULL),
	(79, 14, 'inc_hp', 'statsBase/hp', 1, '10', NULL, NULL, NULL, NULL),
	(80, 14, 'inc_mp', 'statsBase/mp', 1, '10', NULL, NULL, NULL, NULL),
	(81, 15, 'inc_atk', 'stats/atk', 1, '20', NULL, NULL, NULL, NULL),
	(82, 15, 'inc_def', 'stats/def', 1, '20', NULL, NULL, NULL, NULL),
	(83, 15, 'inc_hp', 'stats/hp', 1, '20', NULL, NULL, NULL, NULL),
	(84, 15, 'inc_mp', 'stats/mp', 1, '20', NULL, NULL, NULL, NULL),
	(85, 15, 'inc_atk', 'statsBase/atk', 1, '20', NULL, NULL, NULL, NULL),
	(86, 15, 'inc_def', 'statsBase/def', 1, '20', NULL, NULL, NULL, NULL),
	(87, 15, 'inc_hp', 'statsBase/hp', 1, '20', NULL, NULL, NULL, NULL),
	(88, 15, 'inc_mp', 'statsBase/mp', 1, '20', NULL, NULL, NULL, NULL),
	(89, 16, 'inc_atk', 'stats/atk', 1, '50', NULL, NULL, NULL, NULL),
	(90, 16, 'inc_def', 'stats/def', 1, '50', NULL, NULL, NULL, NULL),
	(91, 16, 'inc_hp', 'stats/hp', 1, '50', NULL, NULL, NULL, NULL),
	(92, 16, 'inc_mp', 'stats/mp', 1, '50', NULL, NULL, NULL, NULL),
	(93, 16, 'inc_atk', 'statsBase/atk', 1, '50', NULL, NULL, NULL, NULL),
	(94, 16, 'inc_def', 'statsBase/def', 1, '50', NULL, NULL, NULL, NULL),
	(95, 16, 'inc_hp', 'statsBase/hp', 1, '50', NULL, NULL, NULL, NULL),
	(96, 16, 'inc_mp', 'statsBase/mp', 1, '50', NULL, NULL, NULL, NULL),
	(97, 18, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL),
	(98, 18, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL),
	(99, 18, 'inc_hp', 'stats/hp', 1, '10', NULL, NULL, NULL, NULL),
	(100, 18, 'inc_mp', 'stats/mp', 1, '10', NULL, NULL, NULL, NULL),
	(101, 18, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL),
	(102, 18, 'inc_def', 'statsBase/def', 1, '10', NULL, NULL, NULL, NULL),
	(103, 18, 'inc_hp', 'statsBase/hp', 1, '10', NULL, NULL, NULL, NULL),
	(104, 18, 'inc_mp', 'statsBase/mp', 1, '10', NULL, NULL, NULL, NULL),
	(105, 19, 'inc_atk', 'stats/atk', 1, '20', NULL, NULL, NULL, NULL),
	(106, 19, 'inc_def', 'stats/def', 1, '20', NULL, NULL, NULL, NULL),
	(107, 19, 'inc_hp', 'stats/hp', 1, '20', NULL, NULL, NULL, NULL),
	(108, 19, 'inc_mp', 'stats/mp', 1, '20', NULL, NULL, NULL, NULL),
	(109, 19, 'inc_atk', 'statsBase/atk', 1, '20', NULL, NULL, NULL, NULL),
	(110, 19, 'inc_def', 'statsBase/def', 1, '20', NULL, NULL, NULL, NULL),
	(111, 19, 'inc_hp', 'statsBase/hp', 1, '20', NULL, NULL, NULL, NULL),
	(112, 19, 'inc_mp', 'statsBase/mp', 1, '20', NULL, NULL, NULL, NULL),
	(113, 20, 'inc_atk', 'stats/atk', 1, '50', NULL, NULL, NULL, NULL),
	(114, 20, 'inc_def', 'stats/def', 1, '50', NULL, NULL, NULL, NULL),
	(115, 20, 'inc_hp', 'stats/hp', 1, '50', NULL, NULL, NULL, NULL),
	(116, 20, 'inc_mp', 'stats/mp', 1, '50', NULL, NULL, NULL, NULL),
	(117, 20, 'inc_atk', 'statsBase/atk', 1, '50', NULL, NULL, NULL, NULL),
	(118, 20, 'inc_def', 'statsBase/def', 1, '50', NULL, NULL, NULL, NULL),
	(119, 20, 'inc_hp', 'statsBase/hp', 1, '50', NULL, NULL, NULL, NULL),
	(120, 20, 'inc_mp', 'statsBase/mp', 1, '50', NULL, NULL, NULL, NULL);

-- Dumping structure for table skills_levels_modifiers_conditions
CREATE TABLE IF NOT EXISTS `skills_levels_modifiers_conditions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `levels_modifier_id` int unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL COMMENT 'eq,ne,lt,gt,le,ge',
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `levels_modifier_id` (`levels_modifier_id`) USING BTREE,
  CONSTRAINT `FK_skills_levels_modifiers_conditions_skills_levels_modifiers` FOREIGN KEY (`levels_modifier_id`) REFERENCES `skills_levels_modifiers` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf32 COLLATE=utf32_unicode_ci;

-- Dumping structure for table skills_levels_set
CREATE TABLE IF NOT EXISTS `skills_levels_set` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `autoFillRanges` int unsigned NOT NULL DEFAULT '0',
  `autoFillExperienceMultiplier` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table skills_levels_set: ~5 rows (approximately)
INSERT INTO `skills_levels_set` (`id`, `autoFillRanges`, `autoFillExperienceMultiplier`) VALUES
	(1, 1, NULL),
	(2, 1, NULL),
	(3, 1, NULL),
	(4, 1, NULL),
	(5, 1, NULL);

-- Dumping structure for table skills_owners_class_path
CREATE TABLE IF NOT EXISTS `skills_owners_class_path` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `class_path_id` int unsigned NOT NULL,
  `owner_id` int unsigned NOT NULL,
  `currentLevel` bigint unsigned NOT NULL DEFAULT '0',
  `currentExp` bigint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `level_set_id` (`class_path_id`) USING BTREE,
  CONSTRAINT `FK_skills_owners_class_path_skills_class_path` FOREIGN KEY (`class_path_id`) REFERENCES `skills_class_path` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table skills_owners_class_path: ~1 rows (approximately)
INSERT INTO `skills_owners_class_path` (`id`, `class_path_id`, `owner_id`, `currentLevel`, `currentExp`) VALUES
	(1, 1, 1, 10, 9080);

-- Dumping structure for table skills_skill
CREATE TABLE IF NOT EXISTS `skills_skill` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `type` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL COMMENT 'B: 1, ATK: 2, EFCT: 3, PHYS-ATK: 4, PHYS-EFCT: 5',
  `autoValidation` int NOT NULL,
  `skillDelay` int NOT NULL,
  `castTime` int NOT NULL,
  `usesLimit` int NOT NULL DEFAULT '0',
  `range` int NOT NULL,
  `rangeAutomaticValidation` int NOT NULL,
  `rangePropertyX` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL COMMENT 'Property path',
  `rangePropertyY` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL COMMENT 'Property path',
  `rangeTargetPropertyX` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL COMMENT 'Target property path',
  `rangeTargetPropertyY` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL COMMENT 'Target property path',
  `allowSelfTarget` int NOT NULL,
  `criticalChance` int DEFAULT NULL,
  `criticalMultiplier` int DEFAULT NULL,
  `criticalFixedValue` int DEFAULT NULL,
  `customData` text CHARACTER SET utf8 COLLATE utf8_unicode_ci COMMENT 'Any custom data, recommended JSON format.',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `key` (`key`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table skills_skill: ~4 rows (approximately)
INSERT INTO `skills_skill` (`id`, `key`, `type`, `autoValidation`, `skillDelay`, `castTime`, `usesLimit`, `range`, `rangeAutomaticValidation`, `rangePropertyX`, `rangePropertyY`, `rangeTargetPropertyX`, `rangeTargetPropertyY`, `allowSelfTarget`, `criticalChance`, `criticalMultiplier`, `criticalFixedValue`, `customData`) VALUES
	(1, 'attackBullet', '4', 0, 1000, 0, 0, 250, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(2, 'attackShort', '2', 0, 600, 0, 0, 50, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(3, 'fireball', '4', 0, 1500, 2000, 0, 280, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(4, 'heal', '3', 0, 1500, 2000, 0, 100, 1, 'state/x', 'state/y', NULL, NULL, 1, 0, 1, 0, NULL);

-- Dumping structure for table skills_skill_animations
CREATE TABLE IF NOT EXISTS `skills_skill_animations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL COMMENT 'Name conventions [key] + _atk, _cast, _bullet, _hit or _death.',
  `classKey` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `animationData` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `skill_id_key` (`skill_id`,`key`) USING BTREE,
  KEY `id` (`id`) USING BTREE,
  KEY `key` (`key`) USING BTREE,
  KEY `skill_id` (`skill_id`) USING BTREE,
  CONSTRAINT `FK_skills_skill_animations_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table skills_skill_animations: ~4 rows (approximately)
INSERT INTO `skills_skill_animations` (`id`, `skill_id`, `key`, `classKey`, `animationData`) VALUES
	(1, 3, 'bullet', NULL, '{"enabled":true,"type":"spritesheet","img":"fireball_bullet","frameWidth":64,"frameHeight":64,"start":0,"end":3,"repeat":-1,"rate":1,"dir":3}'),
	(2, 3, 'cast', NULL, '{"enabled":true,"type":"spritesheet","img":"fireball_cast","frameWidth":64,"frameHeight":70,"start":0,"end":3,"repeat":-1,"destroyTime":2000,"depthByPlayer":"above"}'),
	(3, 4, 'cast', NULL, '{"enabled":true,"type":"spritesheet","img":"heal_cast","frameWidth":64,"frameHeight":70,"start":0,"end":3,"repeat":-1,"destroyTime":2000}'),
	(6, 4, 'hit', NULL, '{"enabled":true,"type":"spritesheet","img":"heal_hit","frameWidth":64,"frameHeight":70,"start":0,"end":4,"repeat":0,"depthByPlayer":"above"}');

-- Dumping structure for table skills_skill_attack
CREATE TABLE IF NOT EXISTS `skills_skill_attack` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int unsigned NOT NULL,
  `affectedProperty` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `allowEffectBelowZero` int unsigned NOT NULL DEFAULT '0',
  `hitDamage` int unsigned NOT NULL,
  `applyDirectDamage` int unsigned NOT NULL DEFAULT '0',
  `attackProperties` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `defenseProperties` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `aimProperties` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `dodgeProperties` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `dodgeFullEnabled` int NOT NULL DEFAULT '1',
  `dodgeOverAimSuccess` int NOT NULL DEFAULT '2',
  `damageAffected` int NOT NULL DEFAULT '0',
  `criticalAffected` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `skill_id` (`skill_id`),
  CONSTRAINT `FK__skills_skill_attack` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table skills_skill_attack: ~3 rows (approximately)
INSERT INTO `skills_skill_attack` (`id`, `skill_id`, `affectedProperty`, `allowEffectBelowZero`, `hitDamage`, `applyDirectDamage`, `attackProperties`, `defenseProperties`, `aimProperties`, `dodgeProperties`, `dodgeFullEnabled`, `dodgeOverAimSuccess`, `damageAffected`, `criticalAffected`) VALUES
	(1, 1, 'stats/hp', 0, 3, 0, 'stats/atk,stats/stamina,stats/speed', 'stats/def,stats/stamina,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0),
	(2, 2, 'stats/hp', 0, 5, 0, 'stats/atk,stats/stamina,stats/speed', 'stats/def,stats/stamina,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0),
	(3, 3, 'stats/hp', 0, 7, 0, 'stats/atk,stats/stamina,stats/speed', 'stats/def,stats/stamina,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0);

-- Dumping structure for table skills_skill_group_relation
CREATE TABLE IF NOT EXISTS `skills_skill_group_relation` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int unsigned NOT NULL,
  `group_id` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `group_id` (`group_id`),
  KEY `skill_id` (`skill_id`),
  CONSTRAINT `FK__skills_groups` FOREIGN KEY (`group_id`) REFERENCES `skills_groups` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK__skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping structure for table skills_skill_owner_conditions
CREATE TABLE IF NOT EXISTS `skills_skill_owner_conditions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `conditional` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL COMMENT 'eq,ne,lt,gt,le,ge',
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `skill_id` (`skill_id`) USING BTREE,
  CONSTRAINT `FK_skills_skill_owner_conditions_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf32 COLLATE=utf32_unicode_ci;

-- Dumping data for table skills_skill_owner_conditions: ~1 rows (approximately)
INSERT INTO `skills_skill_owner_conditions` (`id`, `skill_id`, `key`, `property_key`, `conditional`, `value`) VALUES
	(1, 3, 'available_mp', 'stats/mp', 'ge', '5');

-- Dumping structure for table skills_skill_owner_effects
CREATE TABLE IF NOT EXISTS `skills_skill_owner_effects` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` int unsigned NOT NULL,
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `minValue` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `maxValue` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `minProperty` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `maxProperty` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `skill_id` (`skill_id`) USING BTREE,
  KEY `FK_skills_skill_owner_effects_operation_types` (`operation`),
  CONSTRAINT `FK_skills_skill_owner_effects_operation_types` FOREIGN KEY (`operation`) REFERENCES `operation_types` (`key`) ON UPDATE CASCADE,
  CONSTRAINT `FK_skills_skill_owner_effects_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Modifiers table.';

-- Dumping data for table skills_skill_owner_effects: ~2 rows (approximately)
INSERT INTO `skills_skill_owner_effects` (`id`, `skill_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES
	(2, 3, 'dec_mp', 'stats/mp', 2, '5', '0', ' ', NULL, NULL),
	(3, 4, 'dec_mp', 'stats/mp', 2, '2', '0', '', NULL, NULL);

-- Dumping structure for table skills_skill_owner_effects_conditions
CREATE TABLE IF NOT EXISTS `skills_skill_owner_effects_conditions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `skill_owner_effect_id` int unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL COMMENT 'eq,ne,lt,gt,le,ge',
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `skill_owner_effect_id` (`skill_owner_effect_id`) USING BTREE,
  CONSTRAINT `FK_skills_skill_owner_effects_conditions_skill_owner_effects` FOREIGN KEY (`skill_owner_effect_id`) REFERENCES `skills_skill_owner_effects` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf32 COLLATE=utf32_unicode_ci;

-- Dumping structure for table skills_skill_physical_data
CREATE TABLE IF NOT EXISTS `skills_skill_physical_data` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int unsigned NOT NULL,
  `magnitude` int unsigned NOT NULL,
  `objectWidth` int unsigned NOT NULL,
  `objectHeight` int unsigned NOT NULL,
  `validateTargetOnHit` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `attack_skill_id` (`skill_id`) USING BTREE,
  CONSTRAINT `FK_skills_skill_physical_data_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table skills_skill_physical_data: ~2 rows (approximately)
INSERT INTO `skills_skill_physical_data` (`id`, `skill_id`, `magnitude`, `objectWidth`, `objectHeight`, `validateTargetOnHit`) VALUES
	(1, 1, 350, 5, 5, 0),
	(2, 3, 550, 5, 5, 0);

-- Dumping structure for table skills_skill_target_effects
CREATE TABLE IF NOT EXISTS `skills_skill_target_effects` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` int unsigned NOT NULL,
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `minValue` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `maxValue` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `minProperty` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `maxProperty` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `skill_id` (`skill_id`) USING BTREE,
  KEY `FK_skills_skill_target_effects_operation_types` (`operation`),
  CONSTRAINT `FK_skills_skill_effect_modifiers` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_skills_skill_target_effects_operation_types` FOREIGN KEY (`operation`) REFERENCES `operation_types` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Modifiers table.';

-- Dumping data for table skills_skill_target_effects: ~1 rows (approximately)
INSERT INTO `skills_skill_target_effects` (`id`, `skill_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES
	(1, 4, 'heal', 'stats/hp', 1, '10', '0', '0', NULL, 'statsBase/hp');

-- Dumping structure for table skills_skill_target_effects_conditions
CREATE TABLE IF NOT EXISTS `skills_skill_target_effects_conditions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `skill_target_effect_id` int unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL COMMENT 'eq,ne,lt,gt,le,ge',
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `skill_target_effect_id` (`skill_target_effect_id`) USING BTREE,
  CONSTRAINT `FK_skills_skill_target_effects_conditions_skill_target_effects` FOREIGN KEY (`skill_target_effect_id`) REFERENCES `skills_skill_target_effects` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf32 COLLATE=utf32_unicode_ci;

-- Dumping structure for table snippets
CREATE TABLE IF NOT EXISTS `snippets` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `locale_id` int unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `value` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `locale_id` (`locale_id`),
  CONSTRAINT `FK_snippets_locale` FOREIGN KEY (`locale_id`) REFERENCES `locale` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping structure for table stats
CREATE TABLE IF NOT EXISTS `stats` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `label` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `base_value` int unsigned NOT NULL,
  `customData` text CHARACTER SET utf8 COLLATE utf8_unicode_ci,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `key` (`key`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table stats: ~10 rows (approximately)
INSERT INTO `stats` (`id`, `key`, `label`, `description`, `base_value`, `customData`) VALUES
	(1, 'hp', 'HP', 'Player life points', 100, '{"showBase":true}'),
	(2, 'mp', 'MP', 'Player magic points', 100, '{"showBase":true}'),
	(3, 'atk', 'Atk', 'Player attack points', 100, NULL),
	(4, 'def', 'Def', 'Player defense points', 100, NULL),
	(5, 'dodge', 'Dodge', 'Player dodge points', 100, NULL),
	(6, 'speed', 'Speed', 'Player speed point', 100, NULL),
	(7, 'aim', 'Aim', 'Player aim points', 100, NULL),
	(8, 'stamina', 'Stamina', 'Player stamina points', 100, '{"showBase":true}'),
	(9, 'mgk-atk', 'Magic Atk', 'Player magic attack', 100, NULL),
	(10, 'mgk-def', 'Magic Def', 'Player magic defense', 100, NULL);

-- Dumping structure for table target_options
CREATE TABLE IF NOT EXISTS `target_options` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `target_key` tinyint unsigned NOT NULL,
  `target_label` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `target_key` (`target_key`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table target_options: ~2 rows (approximately)
INSERT INTO `target_options` (`id`, `target_key`, `target_label`) VALUES
	(1, 0, 'Object'),
	(2, 1, 'Player');

-- Dumping structure for table users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `username` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `role_id` int unsigned NOT NULL,
  `status` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `played_time` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table users: ~1 rows (approximately)
INSERT INTO `users` (`id`, `email`, `username`, `password`, `role_id`, `status`, `created_at`, `updated_at`, `played_time`) VALUES
	(1, 'dap@dap.com', 'dap', '$2b$10$RDnURyFoXo7.zcFKVhNcuezJsXXYNslhPBNPzi.crbikFhG8Pnude', 1, '1', '2022-03-17 18:57:44', '2023-10-01 09:37:17', 856025);

-- Dumping structure for table users_locale
CREATE TABLE IF NOT EXISTS `users_locale` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `locale_id` int unsigned DEFAULT NULL,
  `user_id` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `locale_id_player_id` (`locale_id`,`user_id`) USING BTREE,
  KEY `locale_id` (`locale_id`) USING BTREE,
  KEY `player_id` (`user_id`) USING BTREE,
  CONSTRAINT `FK_players_locale_locale` FOREIGN KEY (`locale_id`) REFERENCES `locale` (`id`),
  CONSTRAINT `FK_users_locale_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table users_locale: ~1 rows (approximately)
INSERT INTO `users_locale` (`id`, `locale_id`, `user_id`) VALUES
	(1, 1, 1);

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
