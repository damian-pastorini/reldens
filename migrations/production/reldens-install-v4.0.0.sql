-- --------------------------------------------------------
-- Host:                         localhost
-- Server version:               8.0.21 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             11.3.0.6295
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Dumping structure for table reldens.audio
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

-- Dumping data for table reldens.audio: ~3 rows (approximately)
/*!40000 ALTER TABLE `audio` DISABLE KEYS */;
INSERT INTO `audio` (`id`, `audio_key`, `files_name`, `config`, `room_id`, `category_id`) VALUES
	(3, 'footstep', 'footstep.ogg,footstep.mp3', NULL, NULL, 3),
	(4, 'ReldensTownAudio', 'reldens-town.ogg,reldens-town.mp3', NULL, 4, 1),
	(5, 'intro', 'intro.ogg,intro.mp3', NULL, NULL, 1);
/*!40000 ALTER TABLE `audio` ENABLE KEYS */;

-- Dumping structure for table reldens.audio_categories
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

-- Dumping data for table reldens.audio_categories: ~2 rows (approximately)
/*!40000 ALTER TABLE `audio_categories` DISABLE KEYS */;
INSERT INTO `audio_categories` (`id`, `category_key`, `category_label`, `enabled`, `single_audio`) VALUES
	(1, 'music', 'Music', 1, 1),
	(3, 'sound', 'Sound', 1, 0);
/*!40000 ALTER TABLE `audio_categories` ENABLE KEYS */;

-- Dumping structure for table reldens.audio_markers
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

-- Dumping data for table reldens.audio_markers: ~5 rows (approximately)
/*!40000 ALTER TABLE `audio_markers` DISABLE KEYS */;
INSERT INTO `audio_markers` (`id`, `audio_id`, `marker_key`, `start`, `duration`, `config`) VALUES
	(4, 4, 'ReldensTown', 0, 41, NULL),
	(5, 3, 'journeyman_right', 0, 1, NULL),
	(6, 3, 'journeyman_left', 0, 1, NULL),
	(7, 3, 'journeyman_up', 0, 1, NULL),
	(8, 3, 'journeyman_down', 0, 1, NULL),
	(13, 3, 'r_journeyman_right', 0, 1, NULL),
	(14, 3, 'r_journeyman_left', 0, 1, NULL),
	(15, 3, 'r_journeyman_up', 0, 1, NULL),
	(16, 3, 'r_journeyman_down', 0, 1, NULL);
/*!40000 ALTER TABLE `audio_markers` ENABLE KEYS */;

-- Dumping structure for table reldens.audio_player_config
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

-- Dumping data for table reldens.audio_player_config: ~2 rows (approximately)
/*!40000 ALTER TABLE `audio_player_config` DISABLE KEYS */;
INSERT INTO `audio_player_config` (`id`, `player_id`, `category_id`, `enabled`) VALUES
	(1, 1112, 1, 1),
	(2, 1112, 3, 1);
/*!40000 ALTER TABLE `audio_player_config` ENABLE KEYS */;

-- Dumping structure for table reldens.chat
CREATE TABLE IF NOT EXISTS `chat` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `player_id` int unsigned NOT NULL,
  `room_id` int unsigned DEFAULT NULL,
  `message` varchar(140) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `private_player_id` int unsigned DEFAULT NULL,
  `message_type` varchar(10) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `message_time` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`player_id`),
  KEY `scene_id` (`room_id`),
  KEY `private_user_id` (`private_player_id`),
  CONSTRAINT `FK__players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK__players_2` FOREIGN KEY (`private_player_id`) REFERENCES `players` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK__scenes` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.chat: ~349 rows (approximately)
/*!40000 ALTER TABLE `chat` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat` ENABLE KEYS */;

-- Dumping structure for table reldens.config
CREATE TABLE IF NOT EXISTS `config` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `scope` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `path` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `value` text CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `type` varchar(2) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=212 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.config: ~183 rows (approximately)
/*!40000 ALTER TABLE `config` DISABLE KEYS */;
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES
	(1, 'server', 'rooms/validation/valid', 'room_game,chat_global', 't'),
	(2, 'server', 'players/initialState/room_id', '4', 'i'),
	(3, 'server', 'players/initialState/x', '400', 'i'),
	(4, 'server', 'players/initialState/y', '345', 'i'),
	(5, 'server', 'players/initialState/dir', 'down', 't'),
	(13, 'server', 'rooms/validation/enabled', '1', 'b'),
	(14, 'server', 'rooms/world/gravity_enabled', '0', 'b'),
	(16, 'server', 'players/size/width', '25', 'i'),
	(17, 'server', 'players/size/height', '25', 'i'),
	(18, 'server', 'general/controls/allow_simultaneous_keys', '1', 'b'),
	(19, 'server', 'rooms/world/timestep', '0.04', 'i'),
	(20, 'server', 'chat/messages/broadcast_join', '1', 'b'),
	(21, 'server', 'chat/messages/broadcast_leave', '1', 'b'),
	(22, 'server', 'chat/messages/global_enabled', '1', 'b'),
	(23, 'server', 'chat/messages/global_allowed_roles', '1,9000', 't'),
	(24, 'server', 'players/physicsBody/speed', '180', 'i'),
	(25, 'client', 'players/animations/fadeDuration', '1000', 'i'),
	(26, 'client', 'ui/playerBox/x', '50', 'i'),
	(27, 'client', 'ui/playerStats/enabled', '1', 'b'),
	(28, 'client', 'ui/controls/enabled', '1', 'b'),
	(29, 'client', 'general/tileData/width', '16', 'i'),
	(30, 'client', 'general/tileData/height', '16', 'i'),
	(31, 'client', 'general/tileData/margin', '1', 'i'),
	(32, 'client', 'general/tileData/spacing', '2', 'i'),
	(33, 'client', 'players/size/width', '52', 'i'),
	(34, 'client', 'players/size/height', '71', 'i'),
	(35, 'client', 'general/animations/frameRate', '10', 'i'),
	(36, 'client', 'map/layersDepth/belowPlayer', '0', 'i'),
	(37, 'client', 'map/layersDepth/changePoints', '0', 'i'),
	(38, 'client', 'ui/sceneLabel/enabled', '1', 'b'),
	(39, 'client', 'general/controls/action_button_hold', '0', 'b'),
	(40, 'client', 'ui/chat/x', '440', 'i'),
	(41, 'client', 'ui/chat/y', '940', 'i'),
	(42, 'server', 'players/actions/interactionDistance', '40', 'i'),
	(43, 'server', 'objects/actions/interactionsDistance', '140', 'i'),
	(44, 'client', 'ui/playerBox/enabled', '1', 'b'),
	(45, 'client', 'ui/playerBox/y', '30', 'i'),
	(46, 'client', 'ui/lifeBar/enabled', '1', 'b'),
	(47, 'client', 'ui/uiTarget/x', '10', 'i'),
	(48, 'client', 'ui/uiTarget/y', '85', 'i'),
	(49, 'client', 'ui/sceneLabel/x', '250', 'i'),
	(50, 'client', 'ui/sceneLabel/y', '20', 'i'),
	(51, 'client', 'ui/controls/x', '120', 'i'),
	(52, 'client', 'ui/controls/y', '390', 'i'),
	(53, 'client', 'ui/playerStats/x', '430', 'i'),
	(54, 'client', 'ui/playerStats/y', '20', 'i'),
	(55, 'client', 'ui/loading/font', 'Verdana, Geneva, sans-serif', 't'),
	(56, 'client', 'ui/loading/fontSize', '20px', 't'),
	(57, 'client', 'ui/loading/assetsSize', '18px', 't'),
	(58, 'client', 'ui/loading/loadingColor', '#ffffff', 't'),
	(59, 'client', 'ui/loading/percentColor', '#666666', 't'),
	(60, 'client', 'ui/loading/assetsColor', '#ffffff', 't'),
	(61, 'client', 'ui/loading/showAssets', '1', 'b'),
	(62, 'client', 'players/animations/basedOnPress', '1', 'b'),
	(63, 'client', 'players/animations/diagonalHorizontal', '1', 'b'),
	(64, 'client', 'ui/uiTarget/hideOnDialog', '0', 'b'),
	(65, 'client', 'ui/uiTarget/enabled', '1', 'b'),
	(66, 'client', 'ui/lifeBar/x', '5', 'i'),
	(67, 'client', 'ui/lifeBar/y', '12', 'i'),
	(68, 'client', 'ui/lifeBar/height', '5', 'i'),
	(69, 'client', 'ui/lifeBar/width', '50', 'i'),
	(70, 'client', 'ui/lifeBar/fixedPosition', '0', 'b'),
	(71, 'server', 'rooms/world/tryClosestPath', '1', 'b'),
	(72, 'server', 'actions/pvp/battleTimeOff', '20000', 'i'),
	(73, 'server', 'actions/pvp/timerType', 'bt', 's'),
	(74, 'server', 'enemies/initialStats/atk', '10', 'i'),
	(75, 'server', 'enemies/initialStats/def', '10', 'i'),
	(76, 'server', 'enemies/initialStats/dodge', '10', 'i'),
	(77, 'server', 'enemies/initialStats/hp', '10', 'i'),
	(78, 'server', 'enemies/initialStats/mp', '10', 'i'),
	(79, 'server', 'enemies/initialStats/speed', '10', 'i'),
	(80, 'server', 'enemies/initialStats/stamina', '10', 'i'),
	(81, 'client', 'ui/pointer/show', '1', 'b'),
	(82, 'server', 'enemies/defaultAttacks/attackBullet', '0', 'b'),
	(83, 'client', 'players/size/topOffset', '20', 'i'),
	(84, 'client', 'players/size/leftOffset', '0', 'i'),
	(85, 'server', 'rooms/world/onlyWalkable', '1', 'b'),
	(86, 'client', 'ui/screen/responsive', '1', 'b'),
	(87, 'client', 'ui/uiTarget/responsiveY', '0', 'i'),
	(88, 'client', 'ui/uiTarget/responsiveX', '0', 'i'),
	(89, 'client', 'ui/inventory/enabled', '1', 'b'),
	(90, 'client', 'ui/inventory/x', '380', 'i'),
	(91, 'client', 'ui/inventory/y', '450', 'i'),
	(92, 'client', 'ui/inventory/responsiveY', '0', 'i'),
	(93, 'client', 'ui/inventory/responsiveX', '100', 'i'),
	(94, 'client', 'ui/equipment/enabled', '1', 'b'),
	(95, 'client', 'ui/equipment/x', '430', 'i'),
	(96, 'client', 'ui/equipment/y', '90', 'i'),
	(97, 'client', 'ui/equipment/responsiveY', '0', 'i'),
	(98, 'client', 'ui/equipment/responsiveX', '100', 'i'),
	(99, 'client', 'ui/lifeBar/responsiveY', '24', 'i'),
	(100, 'client', 'ui/lifeBar/responsiveX', '1', 'i'),
	(101, 'client', 'ui/sceneLabel/responsiveY', '0', 'i'),
	(102, 'client', 'ui/sceneLabel/responsiveX', '50', 'i'),
	(103, 'client', 'ui/playerStats/responsiveY', '0', 'i'),
	(104, 'client', 'ui/playerStats/responsiveX', '100', 'i'),
	(105, 'client', 'ui/playerBox/responsiveY', '0', 'i'),
	(106, 'client', 'ui/playerBox/responsiveX', '0', 'i'),
	(107, 'client', 'ui/controls/responsiveY', '100', 'i'),
	(108, 'client', 'ui/controls/responsiveX', '0', 'i'),
	(109, 'client', 'ui/chat/responsiveY', '100', 'i'),
	(110, 'client', 'ui/chat/responsiveX', '100', 'i'),
	(111, 'client', 'ui/chat/enabled', '1', 'b'),
	(112, 'client', 'ui/npcDialog/x', '120', 'i'),
	(113, 'client', 'ui/npcDialog/y', '100', 'i'),
	(114, 'client', 'ui/npcDialog/responsiveX', '10', 'i'),
	(115, 'client', 'ui/npcDialog/responsiveY', '10', 'i'),
	(116, 'client', 'ui/maximum/x', '1280', 'i'),
	(117, 'client', 'ui/maximum/y', '720', 'i'),
	(118, 'client', 'ui/chat/defaultOpen', '0', 'b'),
	(119, 'client', 'ui/chat/notificationBalloon', '1', 'b'),
	(120, 'client', 'ui/chat/damageMessages', '1', 'b'),
	(121, 'server', 'players/actions/initialClassPathId', '1', 'i'),
	(122, 'server', 'enemies/initialStats/aim', '10', 'i'),
	(123, 'client', 'actions/skills/affectedProperty', 'hp', 't'),
	(124, 'client', 'ui/controls/opacityEffect', '1', 'b'),
	(125, 'client', 'ui/skills/y', '390', 'i'),
	(126, 'client', 'ui/skills/x', '230', 'i'),
	(127, 'client', 'ui/skills/responsiveY', '100', 'i'),
	(128, 'client', 'ui/skills/responsiveX', '0', 'i'),
	(129, 'client', 'ui/skills/enabled', '1', 'b'),
	(130, 'client', 'skills/animations/default_atk', '{"key":"default_atk","animationData":{"enabled":true,"type":"spritesheet","img":"default_atk","frameWidth":64,"frameHeight":64,"start":0,"end":4,"repeat":0}}', 'j'),
	(131, 'client', 'skills/animations/default_bullet', '{"key":"default_bullet","animationData":{"enabled":true,"type":"spritesheet","img":"default_bullet","frameWidth":64,"frameHeight":64,"start":0,"end":2,"repeat":-1,"rate":1}}', 'j'),
	(132, 'client', 'skills/animations/default_cast', '{"key": "default_cast","animationData":{"enabled":false,"type":"spritesheet","img":"default_cast","frameWidth":64,"frameHeight":64,"start":0,"end":3,"repeat":0}}', 'j'),
	(133, 'client', 'skills/animations/default_death', '{"key":"default_death","animationData":{"enabled":true,"type":"spritesheet","img":"default_death","frameWidth":64,"frameHeight":64,"start":0,"end":1,"repeat":0,"rate":1}}', 'j'),
	(134, 'client', 'skills/animations/default_hit', '{"key":"default_hit","animationData":{"enabled":true,"type":"spritesheet","img":"default_hit","frameWidth":64,"frameHeight":64,"start":0,"end":3,"repeat":0,"depthByPlayer":"above"}}', 'j'),
	(135, 'client', 'ui/controls/defaultActionKey', '', 't'),
	(136, 'client', 'players/animations/collideWorldBounds', '1', 'b'),
	(137, 'server', 'rooms/world/bulletsStopOnPlayer', '1', 'b'),
	(138, 'client', 'players/animations/fallbackImage', 'player-base', 't'),
	(139, 'client', 'players/multiplePlayers/enabled', '1', 'b'),
	(140, 'server', 'players/gameOver/timeOut', '10000', 'i'),
	(141, 'client', 'ui/controls/tabTarget', '1', 'b'),
	(142, 'client', 'ui/controls/disableContextMenu', '1', 'b'),
	(143, 'client', 'ui/controls/primaryMove', '1', 'b'),
	(144, 'client', 'ui/instructions/enabled', '1', 'b'),
	(145, 'client', 'ui/instructions/responsiveX', '100', 'i'),
	(146, 'client', 'ui/instructions/responsiveY', '100', 'i'),
	(147, 'client', 'ui/instructions/x', '380', 'i'),
	(148, 'client', 'ui/instructions/y', '940', 'i'),
	(149, 'client', 'ui/players/showNames', '1', 'b'),
	(150, 'client', 'ui/players/nameHeight', '15', 'i'),
	(151, 'client', 'ui/players/nameFill', '#ffffff', 't'),
	(152, 'client', 'ui/players/nameStroke', '#000000', 't'),
	(153, 'client', 'ui/players/nameStrokeThickness', '4', 'i'),
	(154, 'client', 'ui/players/nameShadowColor', 'rgba(0,0,0,0.7)', 't'),
	(155, 'client', 'ui/players/nameFontFamily', 'Verdana, Geneva, sans-serif', 't'),
	(156, 'client', 'ui/players/nameFontSize', '12', 'i'),
	(157, 'client', 'ui/lifeBar/top', '5', 'i'),
	(158, 'client', 'actions/damage/enabled', '1', 'b'),
	(159, 'client', 'actions/damage/showAll', '0', 'b'),
	(160, 'client', 'actions/damage/font', 'Verdana, Geneva, sans-serif', 't'),
	(161, 'client', 'actions/damage/color', '#ff0000', 't'),
	(162, 'client', 'actions/damage/duration', '600', 'i'),
	(163, 'client', 'actions/damage/top', '50', 'i'),
	(164, 'client', 'actions/damage/fontSize', '14', 'i'),
	(165, 'client', 'actions/damage/stroke', '#000000', 't'),
	(166, 'client', 'actions/damage/strokeThickness', '4', 'i'),
	(167, 'client', 'actions/damage/shadowColor', 'rgba(0,0,0,0.7)', 't'),
	(168, 'client', 'ui/lifeBar/fillStyle', '0xff0000', 't'),
	(169, 'client', 'ui/lifeBar/lineStyle', '0xffffff', 't'),
	(170, 'client', 'ui/lifeBar/showAllPlayers', '0', 'b'),
	(171, 'client', 'ui/lifeBar/showEnemies', '1', 'b'),
	(172, 'client', 'players/animations/defaultFrames/left/start', '3', 'i'),
	(173, 'client', 'players/animations/defaultFrames/left/end', '5', 'i'),
	(174, 'client', 'players/animations/defaultFrames/right/start', '6', 'i'),
	(175, 'client', 'players/animations/defaultFrames/right/end', '8', 'i'),
	(176, 'client', 'players/animations/defaultFrames/up/start', '9', 'i'),
	(177, 'client', 'players/animations/defaultFrames/up/end', '11', 'i'),
	(178, 'client', 'players/animations/defaultFrames/down/start', '0', 'i'),
	(179, 'client', 'players/animations/defaultFrames/down/end', '2', 'i'),
	(180, 'client', 'ui/minimap/enabled', '1', 'b'),
	(181, 'client', 'ui/minimap/mapWidthDivisor', '1', 'i'),
	(182, 'client', 'ui/minimap/mapHeightDivisor', '1', 'i'),
	(183, 'client', 'ui/minimap/fixedWidth', '450', 'i'),
	(184, 'client', 'ui/minimap/fixedHeight', '450', 'i'),
	(185, 'client', 'ui/minimap/roundMap', '1', 'b'),
	(186, 'client', 'ui/minimap/camX', '140', 'i'),
	(187, 'client', 'ui/minimap/camY', '10', 'i'),
	(188, 'client', 'ui/minimap/camBackgroundColor', 'rgba(0,0,0,0.6)', 't'),
	(189, 'client', 'ui/minimap/camZoom', '0.35', 'i'),
	(190, 'client', 'ui/minimap/roundMap', '1', 'b'),
	(191, 'client', 'ui/minimap/addCircle', '1', 'b'),
	(192, 'client', 'ui/minimap/circleX', '220', 'i'),
	(193, 'client', 'ui/minimap/circleY', '88', 'i'),
	(194, 'client', 'ui/minimap/circleRadio', '80.35', 'i'),
	(195, 'client', 'ui/minimap/circleColor', 'rgb(0,0,0)', 't'),
	(196, 'client', 'ui/minimap/circleAlpha', '1', 'i'),
	(197, 'client', 'ui/minimap/circleStrokeLineWidth', '6', 'i'),
	(198, 'client', 'ui/minimap/circleStrokeColor', '0', 'i'),
	(199, 'client', 'ui/minimap/circleStrokeAlpha', '0.6', 'i'),
	(200, 'client', 'ui/minimap/circleFillColor', '1', 'i'),
	(201, 'client', 'ui/minimap/circleFillAlpha', '0', 'i'),
	(202, 'client', 'ui/pointer/topOffSet', '16', 'i'),
	(203, 'client', 'ui/minimap/responsiveX', '34', 'i'),
	(204, 'client', 'ui/minimap/responsiveY', '2.4', 'i'),
	(205, 'client', 'ui/minimap/x', '180', 'i'),
	(206, 'client', 'ui/minimap/y', '10', 'i'),
	(207, 'client', 'ui/settings/responsiveX', '100', 'i'),
	(208, 'client', 'ui/settings/responsiveY', '100', 'i'),
	(209, 'client', 'ui/settings/x', '940', 'i'),
	(210, 'client', 'ui/settings/y', '280', 'i'),
	(211, 'client', 'ui/settings/enabled', '1', 'b');
/*!40000 ALTER TABLE `config` ENABLE KEYS */;

-- Dumping structure for table reldens.features
CREATE TABLE IF NOT EXISTS `features` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `is_enabled` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.features: ~7 rows (approximately)
/*!40000 ALTER TABLE `features` DISABLE KEYS */;
INSERT INTO `features` (`id`, `code`, `title`, `is_enabled`) VALUES
	(1, 'chat', 'Chat', 1),
	(2, 'objects', 'Objects', 1),
	(3, 'respawn', 'Respawn', 1),
	(4, 'inventory', 'Inventory', 1),
	(5, 'firebase', 'Firebase', 1),
	(6, 'actions', 'Actions', 1),
	(7, 'users', 'Users', 1),
	(8, 'audio', 'Audio', 1);
/*!40000 ALTER TABLE `features` ENABLE KEYS */;

-- Dumping structure for table reldens.items_group
CREATE TABLE IF NOT EXISTS `items_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `label` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8 COLLATE utf8_unicode_ci,
  `sort` int DEFAULT NULL,
  `items_limit` int NOT NULL DEFAULT '0',
  `limit_per_item` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='The group table is to save the groups settings.';

-- Dumping data for table reldens.items_group: ~6 rows (approximately)
/*!40000 ALTER TABLE `items_group` DISABLE KEYS */;
INSERT INTO `items_group` (`id`, `key`, `label`, `description`, `sort`, `items_limit`, `limit_per_item`) VALUES
	(1, 'weapon', 'Weapon', 'All kinds of weapons.', 2, 1, 0),
	(2, 'shield', 'Shield', 'Protect with these items.', 3, 1, 0),
	(3, 'armor', 'Armor', '', 4, 1, 0),
	(4, 'boots', 'Boots', '', 6, 1, 0),
	(5, 'gauntlets', 'Gauntlets', '', 5, 1, 0),
	(6, 'helmet', 'Helmet', '', 1, 1, 0);
/*!40000 ALTER TABLE `items_group` ENABLE KEYS */;

-- Dumping structure for table reldens.items_inventory
CREATE TABLE IF NOT EXISTS `items_inventory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `owner_id` int NOT NULL,
  `item_id` int NOT NULL,
  `qty` int NOT NULL DEFAULT '0',
  `remaining_uses` int DEFAULT NULL,
  `is_active` int DEFAULT NULL COMMENT 'For example equipped or not equipped items.',
  PRIMARY KEY (`id`),
  KEY `FK_items_inventory_items_item` (`item_id`),
  CONSTRAINT `FK_items_inventory_items_item` FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=754 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Inventory table is to save the items for each owner.';

-- Dumping data for table reldens.items_inventory: ~17 rows (approximately)
/*!40000 ALTER TABLE `items_inventory` DISABLE KEYS */;
INSERT INTO `items_inventory` (`id`, `owner_id`, `item_id`, `qty`, `remaining_uses`, `is_active`) VALUES
	(1, 1, 1, 143, NULL, NULL),
	(2, 2, 1, 7, NULL, NULL),
	(3, 2, 2, 1, NULL, NULL),
	(4, 2, 2, 1, NULL, NULL),
	(76, 1, 2, 1, NULL, NULL),
	(91, 1, 3, 20, NULL, NULL),
	(92, 3, 3, 1, NULL, NULL),
	(93, 1, 5, 1, NULL, 0),
	(94, 1, 4, 1, NULL, 0),
	(95, 2, 4, 1, 0, 0),
	(96, 2, 5, 1, 0, 0),
	(98, 54, 1, 1, 0, 0),
	(99, 54, 4, 1, 0, 1),
	(100, 54, 5, 1, 0, 0),
	(101, 559, 1, 1, 0, 0),
	(102, 559, 4, 1, 0, 0),
	(103, 559, 5, 1, 0, 0);
/*!40000 ALTER TABLE `items_inventory` ENABLE KEYS */;

-- Dumping structure for table reldens.items_item
CREATE TABLE IF NOT EXISTS `items_item` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `group_id` int DEFAULT NULL,
  `label` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `qty_limit` int NOT NULL DEFAULT '0' COMMENT 'Default 0 to unlimited qty.',
  `uses_limit` int NOT NULL DEFAULT '1' COMMENT 'Default 1 use per item (0 = unlimited).',
  `useTimeOut` int DEFAULT NULL,
  `execTimeOut` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `key` (`key`),
  KEY `group_id` (`group_id`),
  CONSTRAINT `FK_items_item_items_group` FOREIGN KEY (`group_id`) REFERENCES `items_group` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='List of all available items in the system.';

-- Dumping data for table reldens.items_item: ~6 rows (approximately)
/*!40000 ALTER TABLE `items_item` DISABLE KEYS */;
INSERT INTO `items_item` (`id`, `key`, `group_id`, `label`, `description`, `qty_limit`, `uses_limit`, `useTimeOut`, `execTimeOut`) VALUES
	(1, 'coins', NULL, 'Coins', NULL, 0, 1, NULL, NULL),
	(2, 'branch', NULL, 'Tree branch', 'An useless tree branch (for now)', 0, 1, NULL, NULL),
	(3, 'heal_potion_20', NULL, 'Heal Potion', 'A heal potion that will restore 20 HP.', 0, 1, NULL, NULL),
	(4, 'axe', 1, 'Axe', 'A short distance but powerful weapon.', 0, 0, NULL, NULL),
	(5, 'spear', 1, 'Spear', 'A short distance but powerful weapon.', 0, 0, NULL, NULL),
	(6, 'magic_potion_20', NULL, 'Magic Potion', 'A magic potion that will restore 20 MP.', 0, 1, NULL, NULL);
/*!40000 ALTER TABLE `items_item` ENABLE KEYS */;

-- Dumping structure for table reldens.items_item_modifiers
CREATE TABLE IF NOT EXISTS `items_item_modifiers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` int NOT NULL,
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `maxProperty` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `FK_items_item_modifiers_items_item` FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Modifiers is the way we will affect the item owner.';

-- Dumping data for table reldens.items_item_modifiers: ~4 rows (approximately)
/*!40000 ALTER TABLE `items_item_modifiers` DISABLE KEYS */;
INSERT INTO `items_item_modifiers` (`id`, `item_id`, `key`, `property_key`, `operation`, `value`, `maxProperty`) VALUES
	(1, 4, 'atk', 'stats/atk', 5, '5', NULL),
	(2, 3, 'heal_potion_20', 'stats/hp', 1, '20', 'statsBase/hp'),
	(3, 5, 'atk', 'stats/atk', 5, '3', NULL),
	(4, 6, 'magic_potion_20', 'stats/mp', 1, '20', 'statsBase/mp');
/*!40000 ALTER TABLE `items_item_modifiers` ENABLE KEYS */;

-- Dumping structure for table reldens.objects
CREATE TABLE IF NOT EXISTS `objects` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `room_id` int unsigned NOT NULL,
  `layer_name` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `tile_index` int unsigned DEFAULT NULL,
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
  CONSTRAINT `FK_objects_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.objects: ~8 rows (approximately)
/*!40000 ALTER TABLE `objects` DISABLE KEYS */;
INSERT INTO `objects` (`id`, `room_id`, `layer_name`, `tile_index`, `object_class_key`, `client_key`, `title`, `private_params`, `client_params`, `enabled`) VALUES
	(1, 4, 'ground-collisions', 444, 'door_1', 'door_house_1', '', NULL, NULL, 1),
	(4, 4, 'ground-collisions', 951, 'door_2', 'door_house_2', '', NULL, NULL, 1),
	(5, 4, 'house-collisions-over-player', 535, 'npc_1', 'people_town_1', 'Alfred', NULL, NULL, 1),
	(6, 5, 'respawn-area-monsters-lvl-1-2', NULL, 'enemy_1', 'enemy_forest_1', 'Tree', NULL, '{"autoStart":true}', 1),
	(7, 5, 'respawn-area-monsters-lvl-1-2', NULL, 'enemy_2', 'enemy_forest_2', 'Tree Punch', NULL, '{"autoStart":true}', 1),
	(8, 4, 'house-collisions-over-player', 538, 'npc_2', 'healer_1', 'Mamon', NULL, NULL, 1),
	(10, 4, 'house-collisions-over-player', 560, 'npc_3', 'merchant_1', 'Gimly', NULL, NULL, 1),
	(12, 4, 'house-collisions-over-player', 562, 'npc_4', 'weapons_master_1', 'Barrik', NULL, NULL, 1);
/*!40000 ALTER TABLE `objects` ENABLE KEYS */;

-- Dumping structure for table reldens.objects_animations
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

-- Dumping data for table reldens.objects_animations: ~4 rows (approximately)
/*!40000 ALTER TABLE `objects_animations` DISABLE KEYS */;
INSERT INTO `objects_animations` (`id`, `object_id`, `animationKey`, `animationData`) VALUES
	(5, 6, 'respawn-area-monsters-lvl-1-2_6_right', '{"start":6,"end":8}'),
	(6, 6, 'respawn-area-monsters-lvl-1-2_6_down', '{"start":0,"end":2}'),
	(7, 6, 'respawn-area-monsters-lvl-1-2_6_left', '{"start":3,"end":5}'),
	(8, 6, 'respawn-area-monsters-lvl-1-2_6_up', '{"start":9,"end":11}');
/*!40000 ALTER TABLE `objects_animations` ENABLE KEYS */;

-- Dumping structure for table reldens.objects_assets
CREATE TABLE IF NOT EXISTS `objects_assets` (
  `object_asset_id` int unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int unsigned NOT NULL,
  `asset_type` varchar(255) NOT NULL,
  `asset_key` varchar(255) NOT NULL,
  `file_1` varchar(255) NOT NULL,
  `file_2` varchar(255) DEFAULT NULL,
  `extra_params` text,
  PRIMARY KEY (`object_asset_id`),
  KEY `object_id` (`object_id`),
  CONSTRAINT `FK_objects_assets_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1;

-- Dumping data for table reldens.objects_assets: ~8 rows (approximately)
/*!40000 ALTER TABLE `objects_assets` DISABLE KEYS */;
INSERT INTO `objects_assets` (`object_asset_id`, `object_id`, `asset_type`, `asset_key`, `file_1`, `file_2`, `extra_params`) VALUES
	(1, 1, 'spritesheet', 'door_house_1', 'door-a-x2', NULL, '{"frameWidth":32,"frameHeight":58}'),
	(2, 4, 'spritesheet', 'door_house_2', 'door-a-x2', NULL, '{"frameWidth":32,"frameHeight":58}'),
	(3, 5, 'spritesheet', 'people_town_1', 'people-b-x2', NULL, '{"frameWidth":52,"frameHeight":71}'),
	(5, 6, 'spritesheet', 'enemy_forest_1', 'monster-treant', NULL, '{"frameWidth":47,"frameHeight":50}'),
	(6, 7, 'spritesheet', 'enemy_forest_2', 'monster-golem2', NULL, '{"frameWidth":47,"frameHeight":50}'),
	(7, 5, 'spritesheet', 'healer_1', 'healer-1', NULL, '{"frameWidth":52,"frameHeight":71}'),
	(9, 10, 'spritesheet', 'merchant_1', 'people-d-x2', NULL, '{"frameWidth":52,"frameHeight":71}'),
	(10, 12, 'spritesheet', 'weapons_master_1', 'people-c-x2', NULL, '{"frameWidth":52,"frameHeight":71}');
/*!40000 ALTER TABLE `objects_assets` ENABLE KEYS */;

-- Dumping structure for table reldens.players
CREATE TABLE IF NOT EXISTS `players` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `FK_players_users` (`user_id`),
  CONSTRAINT `FK_players_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1114 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.players: ~3 rows (approximately)
/*!40000 ALTER TABLE `players` DISABLE KEYS */;
INSERT INTO `players` (`id`, `user_id`, `name`) VALUES
	(17, 48, '123');
/*!40000 ALTER TABLE `players` ENABLE KEYS */;

-- Dumping structure for table reldens.players_state
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
) ENGINE=InnoDB AUTO_INCREMENT=1079 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.players_state: ~3 rows (approximately)
/*!40000 ALTER TABLE `players_state` DISABLE KEYS */;
INSERT INTO `players_state` (`id`, `player_id`, `room_id`, `x`, `y`, `dir`) VALUES
	(20, 17, 4, 400, 470, 'down');
/*!40000 ALTER TABLE `players_state` ENABLE KEYS */;

-- Dumping structure for table reldens.players_stats
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
) ENGINE=InnoDB AUTO_INCREMENT=17884 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.players_stats: ~30 rows (approximately)
/*!40000 ALTER TABLE `players_stats` DISABLE KEYS */;
INSERT INTO `players_stats` (`id`, `player_id`, `stat_id`, `base_value`, `value`) VALUES
	(191, 17, 10, 100, 100),
	(192, 17, 9, 100, 100),
	(193, 17, 8, 100, 100),
	(194, 17, 7, 100, 100),
	(195, 17, 6, 100, 100),
	(196, 17, 5, 100, 100),
	(197, 17, 4, 100, 100),
	(198, 17, 3, 100, 100),
	(199, 17, 2, 100, 100),
	(200, 17, 1, 100, 100);
/*!40000 ALTER TABLE `players_stats` ENABLE KEYS */;

-- Dumping structure for table reldens.respawn
CREATE TABLE IF NOT EXISTS `respawn` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int unsigned NOT NULL,
  `respawn_time` int unsigned NOT NULL DEFAULT '0',
  `instances_limit` int unsigned NOT NULL DEFAULT '0',
  `layer` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `respawn_object_id` (`object_id`),
  CONSTRAINT `FK_respawn_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.respawn: ~2 rows (approximately)
/*!40000 ALTER TABLE `respawn` DISABLE KEYS */;
INSERT INTO `respawn` (`id`, `object_id`, `respawn_time`, `instances_limit`, `layer`) VALUES
	(3, 6, 20000, 2, 'respawn-area-monsters-lvl-1-2'),
	(4, 7, 10000, 3, 'respawn-area-monsters-lvl-1-2');
/*!40000 ALTER TABLE `respawn` ENABLE KEYS */;

-- Dumping structure for table reldens.rooms
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `map_filename` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL COMMENT 'The map JSON file name.',
  `scene_images` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `room_class_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.rooms: ~5 rows (approximately)
/*!40000 ALTER TABLE `rooms` DISABLE KEYS */;
INSERT INTO `rooms` (`id`, `name`, `title`, `map_filename`, `scene_images`, `room_class_key`) VALUES
	(2, 'ReldensHouse_1', 'House - 1', 'reldens-house-1', 'reldens-house-1', NULL),
	(3, 'ReldensHouse_2', 'House - 2', 'reldens-house-2', 'reldens-house-2', NULL),
	(4, 'ReldensTown', 'Town', 'reldens-town', 'reldens-town', NULL),
	(5, 'ReldensForest', 'Forest', 'reldens-forest', 'reldens-forest', NULL),
	(6, 'ReldensHouse_1b', 'House - 1 - Floor 2', 'reldens-house-1-2d-floor', 'reldens-house-1-2d-floor', NULL);
/*!40000 ALTER TABLE `rooms` ENABLE KEYS */;

-- Dumping structure for table reldens.rooms_change_points
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
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.rooms_change_points: ~14 rows (approximately)
/*!40000 ALTER TABLE `rooms_change_points` DISABLE KEYS */;
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
	(14, 6, 664, 2);
/*!40000 ALTER TABLE `rooms_change_points` ENABLE KEYS */;

-- Dumping structure for table reldens.rooms_return_points
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
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.rooms_return_points: ~11 rows (approximately)
/*!40000 ALTER TABLE `rooms_return_points` DISABLE KEYS */;
INSERT INTO `rooms_return_points` (`id`, `room_id`, `direction`, `x`, `y`, `is_default`, `from_room_id`) VALUES
	(1, 2, 'up', 548, 615, 0, 4),
	(2, 3, 'up', 640, 600, 1, NULL),
	(3, 4, 'down', 400, 345, 1, 2),
	(4, 4, 'down', 1266, 670, 0, 3),
	(5, 5, 'up', 640, 768, 0, 4),
	(6, 5, 'up', 640, 768, 0, 4),
	(7, 4, 'down', 615, 64, 0, 5),
	(8, 4, 'down', 615, 64, 0, 5),
	(9, 6, 'right', 820, 500, 0, 2),
	(10, 6, 'right', 820, 500, 0, 2),
	(11, 2, 'left', 720, 540, 0, 6);
/*!40000 ALTER TABLE `rooms_return_points` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_class_level_up_animations
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

-- Dumping data for table reldens.skills_class_level_up_animations: ~0 rows (approximately)
/*!40000 ALTER TABLE `skills_class_level_up_animations` DISABLE KEYS */;
INSERT INTO `skills_class_level_up_animations` (`id`, `class_path_id`, `level_id`, `animationData`) VALUES
	(1, NULL, NULL, '{"enabled":true,"type":"spritesheet","img":"heal_cast","frameWidth":64,"frameHeight":70,"start":0,"end":3,"repeat":-1,"destroyTime":2000,"depthByPlayer":"above"}');
/*!40000 ALTER TABLE `skills_class_level_up_animations` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_class_path
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

-- Dumping data for table reldens.skills_class_path: ~5 rows (approximately)
/*!40000 ALTER TABLE `skills_class_path` DISABLE KEYS */;
INSERT INTO `skills_class_path` (`id`, `key`, `label`, `levels_set_id`) VALUES
	(1, 'journeyman', 'Journeyman', 1),
	(2, 'sorcerer', 'Sorcerer', 2),
	(3, 'warlock', 'Warlock', 3),
	(4, 'swordsman', 'Swordsman', 4),
	(5, 'warrior', 'Warrior', 5);
/*!40000 ALTER TABLE `skills_class_path` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_class_path_level_labels
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

-- Dumping data for table reldens.skills_class_path_level_labels: ~5 rows (approximately)
/*!40000 ALTER TABLE `skills_class_path_level_labels` DISABLE KEYS */;
INSERT INTO `skills_class_path_level_labels` (`id`, `class_path_id`, `level_id`, `label`) VALUES
	(1, 1, 3, 'Old Traveler'),
	(2, 2, 7, 'Fire Master'),
	(3, 3, 11, 'Magus'),
	(4, 4, 15, 'Blade Master'),
	(5, 5, 19, 'Palading');
/*!40000 ALTER TABLE `skills_class_path_level_labels` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_class_path_level_skills
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

-- Dumping data for table reldens.skills_class_path_level_skills: ~15 rows (approximately)
/*!40000 ALTER TABLE `skills_class_path_level_skills` DISABLE KEYS */;
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
/*!40000 ALTER TABLE `skills_class_path_level_skills` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_groups
CREATE TABLE IF NOT EXISTS `skills_groups` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `label` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `sort` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.skills_groups: ~0 rows (approximately)
/*!40000 ALTER TABLE `skills_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `skills_groups` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_levels
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

-- Dumping data for table reldens.skills_levels: ~20 rows (approximately)
/*!40000 ALTER TABLE `skills_levels` DISABLE KEYS */;
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
/*!40000 ALTER TABLE `skills_levels` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_levels_modifiers
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
  CONSTRAINT `FK_skills_levels_modifiers_skills_levels` FOREIGN KEY (`level_id`) REFERENCES `skills_levels` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=121 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Modifiers table.';

-- Dumping data for table reldens.skills_levels_modifiers: ~120 rows (approximately)
/*!40000 ALTER TABLE `skills_levels_modifiers` DISABLE KEYS */;
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
/*!40000 ALTER TABLE `skills_levels_modifiers` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_levels_modifiers_conditions
CREATE TABLE IF NOT EXISTS `skills_levels_modifiers_conditions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `levels_modifier_id` int unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` varchar(50) CHARACTER SET utf32 COLLATE utf32_unicode_ci NOT NULL COMMENT 'eq,ne,lt,gt,le,ge',
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
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `autoFillRanges` int unsigned NOT NULL DEFAULT '0',
  `autoFillExperienceMultiplier` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.skills_levels_set: ~5 rows (approximately)
/*!40000 ALTER TABLE `skills_levels_set` DISABLE KEYS */;
INSERT INTO `skills_levels_set` (`id`, `autoFillRanges`, `autoFillExperienceMultiplier`) VALUES
	(1, 1, NULL),
	(2, 1, NULL),
	(3, 1, NULL),
	(4, 1, NULL),
	(5, 1, NULL);
/*!40000 ALTER TABLE `skills_levels_set` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_owners_class_path
CREATE TABLE IF NOT EXISTS `skills_owners_class_path` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `class_path_id` int unsigned NOT NULL,
  `owner_id` int unsigned NOT NULL,
  `currentLevel` bigint unsigned NOT NULL DEFAULT '0',
  `currentExp` bigint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `level_set_id` (`class_path_id`) USING BTREE,
  CONSTRAINT `FK_skills_owners_class_path_skills_class_path` FOREIGN KEY (`class_path_id`) REFERENCES `skills_class_path` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1178 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.skills_owners_class_path: ~7 rows (approximately)
/*!40000 ALTER TABLE `skills_owners_class_path` DISABLE KEYS */;
INSERT INTO `skills_owners_class_path` (`id`, `class_path_id`, `owner_id`, `currentLevel`, `currentExp`) VALUES
	(1, 1, 1, 1, 0),
	(2, 1, 2, 1, 0),
	(3, 1, 3, 1, 0),
	(4, 1, 17, 1, 0),
	(24, 1, 17, 1, 0);
/*!40000 ALTER TABLE `skills_owners_class_path` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill
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

-- Dumping data for table reldens.skills_skill: ~4 rows (approximately)
/*!40000 ALTER TABLE `skills_skill` DISABLE KEYS */;
INSERT INTO `skills_skill` (`id`, `key`, `type`, `autoValidation`, `skillDelay`, `castTime`, `usesLimit`, `range`, `rangeAutomaticValidation`, `rangePropertyX`, `rangePropertyY`, `rangeTargetPropertyX`, `rangeTargetPropertyY`, `allowSelfTarget`, `criticalChance`, `criticalMultiplier`, `criticalFixedValue`, `customData`) VALUES
	(1, 'attackBullet', '4', 0, 1000, 0, 0, 250, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(2, 'attackShort', '2', 0, 600, 0, 0, 50, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(3, 'fireball', '4', 0, 1500, 2000, 0, 280, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(4, 'heal', '3', 0, 1500, 2000, 0, 100, 1, 'state/x', 'state/y', NULL, NULL, 1, 0, 1, 0, NULL);
/*!40000 ALTER TABLE `skills_skill` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_animations
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

-- Dumping data for table reldens.skills_skill_animations: ~4 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_animations` DISABLE KEYS */;
INSERT INTO `skills_skill_animations` (`id`, `skill_id`, `key`, `classKey`, `animationData`) VALUES
	(1, 3, 'bullet', NULL, '{"enabled":true,"type":"spritesheet","img":"fireball_bullet","frameWidth":64,"frameHeight":64,"start":0,"end":3,"repeat":-1,"rate":1,"dir":3}'),
	(2, 3, 'cast', NULL, '{"enabled":true,"type":"spritesheet","img":"fireball_cast","frameWidth":64,"frameHeight":70,"start":0,"end":3,"repeat":-1,"destroyTime":2000,"depthByPlayer":"above"}'),
	(3, 4, 'cast', NULL, '{"enabled":true,"type":"spritesheet","img":"heal_cast","frameWidth":64,"frameHeight":70,"start":0,"end":3,"repeat":-1,"destroyTime":2000}'),
	(6, 4, 'hit', NULL, '{"enabled":true,"type":"spritesheet","img":"heal_hit","frameWidth":64,"frameHeight":70,"start":0,"end":4,"repeat":0,"depthByPlayer":"above"}');
/*!40000 ALTER TABLE `skills_skill_animations` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_attack
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

-- Dumping data for table reldens.skills_skill_attack: ~3 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_attack` DISABLE KEYS */;
INSERT INTO `skills_skill_attack` (`id`, `skill_id`, `affectedProperty`, `allowEffectBelowZero`, `hitDamage`, `applyDirectDamage`, `attackProperties`, `defenseProperties`, `aimProperties`, `dodgeProperties`, `dodgeFullEnabled`, `dodgeOverAimSuccess`, `damageAffected`, `criticalAffected`) VALUES
	(1, 1, 'stats/hp', 0, 3, 0, 'stats/atk,stats/stamina,stats/speed', 'stats/def,stats/stamina,stats/speed', 'stats/aim', 'stats/dodge', 1, 2, 0, 0),
	(2, 2, 'stats/hp', 0, 5, 0, 'stats/atk,stats/stamina,stats/speed', 'stats/def,stats/stamina,stats/speed', 'stats/aim', 'stats/dodge', 1, 2, 0, 0),
	(3, 3, 'stats/hp', 0, 7, 0, 'stats/atk,stats/stamina,stats/speed', 'stats/def,stats/stamina,stats/speed', 'stats/aim', 'stats/dodge', 1, 2, 0, 0);
/*!40000 ALTER TABLE `skills_skill_attack` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_group_relation
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

-- Dumping data for table reldens.skills_skill_group_relation: ~0 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_group_relation` DISABLE KEYS */;
/*!40000 ALTER TABLE `skills_skill_group_relation` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_owner_conditions
CREATE TABLE IF NOT EXISTS `skills_skill_owner_conditions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `conditional` varchar(50) CHARACTER SET utf32 COLLATE utf32_unicode_ci NOT NULL COMMENT 'eq,ne,lt,gt,le,ge',
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `skill_id` (`skill_id`) USING BTREE,
  CONSTRAINT `FK_skills_skill_owner_conditions_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf32 COLLATE=utf32_unicode_ci;

-- Dumping data for table reldens.skills_skill_owner_conditions: ~0 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_owner_conditions` DISABLE KEYS */;
INSERT INTO `skills_skill_owner_conditions` (`id`, `skill_id`, `key`, `property_key`, `conditional`, `value`) VALUES
	(1, 3, 'available_mp', 'stats/mp', 'ge', '5');
/*!40000 ALTER TABLE `skills_skill_owner_conditions` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_owner_effects
CREATE TABLE IF NOT EXISTS `skills_skill_owner_effects` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` int NOT NULL,
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `minValue` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `maxValue` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `minProperty` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `maxProperty` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `skill_id` (`skill_id`) USING BTREE,
  CONSTRAINT `FK_skills_skill_owner_effects_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Modifiers table.';

-- Dumping data for table reldens.skills_skill_owner_effects: ~0 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_owner_effects` DISABLE KEYS */;
INSERT INTO `skills_skill_owner_effects` (`id`, `skill_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES
	(2, 3, 'dec_mp', 'stats/mp', 2, '5', '0', '', NULL, NULL);
/*!40000 ALTER TABLE `skills_skill_owner_effects` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_owner_effects_conditions
CREATE TABLE IF NOT EXISTS `skills_skill_owner_effects_conditions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `skill_owner_effect_id` int unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` varchar(50) CHARACTER SET utf32 COLLATE utf32_unicode_ci NOT NULL COMMENT 'eq,ne,lt,gt,le,ge',
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

-- Dumping data for table reldens.skills_skill_physical_data: ~2 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_physical_data` DISABLE KEYS */;
INSERT INTO `skills_skill_physical_data` (`id`, `skill_id`, `magnitude`, `objectWidth`, `objectHeight`, `validateTargetOnHit`) VALUES
	(1, 1, 350, 5, 5, 0),
	(2, 3, 550, 5, 5, 0);
/*!40000 ALTER TABLE `skills_skill_physical_data` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_target_effects
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
  CONSTRAINT `FK_skills_skill_effect_modifiers` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Modifiers table.';

-- Dumping data for table reldens.skills_skill_target_effects: ~0 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_target_effects` DISABLE KEYS */;
INSERT INTO `skills_skill_target_effects` (`id`, `skill_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES
	(1, 4, 'heal', 'stats/hp', 1, '10', '0', '0', NULL, 'statsBase/hp');
/*!40000 ALTER TABLE `skills_skill_target_effects` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_target_effects_conditions
CREATE TABLE IF NOT EXISTS `skills_skill_target_effects_conditions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `skill_target_effect_id` int unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` varchar(50) CHARACTER SET utf32 COLLATE utf32_unicode_ci NOT NULL COMMENT 'eq,ne,lt,gt,le,ge',
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `skill_target_effect_id` (`skill_target_effect_id`) USING BTREE,
  CONSTRAINT `FK_skills_skill_target_effects_conditions_skill_target_effects` FOREIGN KEY (`skill_target_effect_id`) REFERENCES `skills_skill_target_effects` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf32 COLLATE=utf32_unicode_ci;

-- Dumping data for table reldens.skills_skill_target_effects_conditions: ~0 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_target_effects_conditions` DISABLE KEYS */;
/*!40000 ALTER TABLE `skills_skill_target_effects_conditions` ENABLE KEYS */;

-- Dumping structure for table reldens.stats
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

-- Dumping data for table reldens.stats: ~10 rows (approximately)
/*!40000 ALTER TABLE `stats` DISABLE KEYS */;
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
/*!40000 ALTER TABLE `stats` ENABLE KEYS */;

-- Dumping structure for table reldens.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role_id` int unsigned NOT NULL,
  `status` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=1061 DEFAULT CHARSET=latin1;

-- Dumping data for table reldens.users: ~17 rows (approximately)
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` (`id`, `email`, `username`, `password`, `role_id`, `status`, `created_at`, `updated_at`) VALUES
	(29, 'dap@dap.com', 'Darth', '$2b$10$PQIYGBFyA/69DaowJVTA5ufVWmIUeIOwIK4e6JCAP5Uen0sp0TAHu', 1, '1', '2019-08-11 20:16:52', '2021-07-21 15:58:19'),
	(30, 'dap2@dap.com', 'NoChat', '$2b$10$Kvjh1XdsMai8Xt2wdivG2.prYvTiW6vJrdnrNPYZenf8qCRLhuZ/a', 1, '1596747530588', '2019-08-11 20:16:52', '2021-01-25 16:25:19'),
	(31, 'dap3@dap.com', 'Player3', '$2b$10$CmtWkhIexIVtcBjwsmEkeOlIhqizViykDFYAKtVrl4sF8KWLuBsxO', 1, '1', '2019-08-11 20:16:52', '2021-03-13 16:18:16'),
	(32, 'onbekend@onbekend.nl', 'unknown', '$2b$10$cZuxq9Ms8eV.uO4qdgzOceDcymAtkdvmAjuKu1tmgyPmWvxlLk606', 1, '1', '2019-08-11 20:16:52', '2019-08-11 20:16:52'),
	(33, 'onbekend2@onbekend.nl', 'unkown2', '$2b$10$rjz3IMRCDy9ZusNKapzdyeRI9JzzRyKebXWdEuuu0//lTNUS8mAtO', 1, '1', '2019-08-11 20:16:52', '2019-08-11 20:16:52'),
	(34, '123@qq.com', '123@qq.com', '$2b$10$FVQ5U2g9vcD2jlwaLmzYEOL22mhjv2Vue4bvPTnafOqv95SlyjnuC', 1, '1', '2019-08-11 20:16:52', '2019-08-11 20:16:52'),
	(35, 'endel.dreyer@gmail.com', 'endel', '$2b$10$XTQp4GlMRpVTnBnHF6Ex9OEshHAlJ02oMPpFa.7TZTqRiTLaXxOK.', 1, '1', '2019-08-11 20:16:52', '2021-03-14 21:48:12'),
	(36, 'yohan.g99@gmail.com', 'Eteck', '$2b$10$P2yOhIr.o0U5aEUt/9vcVOCntZzoEtx2bLWK1ijXpFde5YzvA5u0a', 1, '1', '2019-08-11 20:16:52', '2019-08-11 20:16:52'),
	(37, 'blightn1@rocketmail.com', 'asdasd123', '$2b$10$LacmflN0BgGrsWomElijp.7U5mg8avGcN19sWTtF40oHk25NUNNfS', 1, '1', '2019-08-11 20:16:52', '2019-08-11 20:16:52'),
	(38, 'albatros2ko@gmail.com', 'albatros2ko', '$2b$10$Y3HbrNyuFPB1R.FxPm.X8OkXbt3oMMxYDUMmSk6Uf06Vc93433cN.', 1, '1', '2019-08-11 20:16:52', '2019-08-11 20:16:52'),
	(39, 'test@example.com', 'test', '$2b$10$mD1VepM2.IHcH2P8QXq0jOmnuAJumk8Waz50UIpck2erzq4ZN7xra', 1, '1', '2019-08-11 20:16:52', '2021-04-06 08:32:26'),
	(40, 'Tfvb@6467.com', 'aze', '$2b$10$w939/sVQQZbR8FEv7vsexueh8jKxlPd9Cvz4cJ4UhYeUyHqAQqqIu', 1, '1', '2019-08-11 20:16:52', '2019-08-11 20:16:52'),
	(41, 'A@example.com', 'A12345', '$2b$10$R8bO1Sq8.a3E5ZI3ZTc3LOB.noN4bcdu8W2DmZp5v/SKWES6nvfYm', 1, '1', '2019-08-11 20:16:52', '2019-08-11 20:16:52'),
	(42, 'rushdi-14@hotmail.com', 'rushdiGG', '$2b$10$cqkMtjfkPfZbr3v1OfqerOHQpIFqscBY9bB0TQCbrt.EsLOSSuZbu', 1, '1', '2019-08-11 20:16:52', '2019-08-11 20:16:52'),
	(43, 'frank.coyle@gmail.com', 'frankcoyle', '$2b$10$scseoGEstG4epDrHlEqg3OLB/SovZnExQILQClktxFT7DwXOdFmaG', 1, '1', '2019-08-11 20:16:52', '2019-08-11 20:16:52'),
	(44, 'Hublard2000@gmx.ch', 'moepi2k', '$2b$10$mzBI6apDA6VhIIOhRvfJfOWN0U024i2p2Jec7VNEJ7TbyvVsz8PNy', 1, '1', '2019-08-11 20:16:52', '2019-08-11 20:16:52'),
	(45, 'foo@bar.com', 'foo', '$2b$10$lP0dikK7.gxkoQSrOc1tXOma41QHnH37dXOZrP0lMje.bfHImb9Va', 1, '1', '2019-08-11 20:16:52', '2019-08-11 20:16:52');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
