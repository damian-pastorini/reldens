-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               5.7.26 - MySQL Community Server (GPL)
-- Server OS:                    Win64
-- HeidiSQL Version:             9.5.0.5196
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;

-- Dumping structure for table reldens.chat
CREATE TABLE IF NOT EXISTS `chat` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `player_id` int(11) unsigned NOT NULL,
  `room_id` int(11) unsigned DEFAULT NULL,
  `message` varchar(140) COLLATE utf8_unicode_ci NOT NULL,
  `private_player_id` int(11) unsigned DEFAULT NULL,
  `message_type` varchar(10) COLLATE utf8_unicode_ci DEFAULT NULL,
  `message_time` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`player_id`),
  KEY `scene_id` (`room_id`),
  KEY `private_user_id` (`private_player_id`),
  CONSTRAINT `FK__players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK__players_2` FOREIGN KEY (`private_player_id`) REFERENCES `players` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK__scenes` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.chat: ~0 rows (approximately)
/*!40000 ALTER TABLE `chat` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat` ENABLE KEYS */;

-- Dumping structure for table reldens.config
CREATE TABLE IF NOT EXISTS `config` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `scope` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `path` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `value` text COLLATE utf8_unicode_ci NOT NULL,
  `type` varchar(2) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.config: ~59 rows (approximately)
/*!40000 ALTER TABLE `config` DISABLE KEYS */;
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES
	(1, 'server', 'rooms/validation/valid', 'room_game,chat_global', 't'),
	(2, 'server', 'players/initialState/room_id', '4', 'i'),
	(3, 'server', 'players/initialState/x', '400', 'i'),
	(4, 'server', 'players/initialState/y', '345', 'i'),
	(5, 'server', 'players/initialState/dir', 'down', 't'),
	(6, 'server', 'players/initialStats/hp', '100', 'i'),
	(7, 'server', 'players/initialStats/mp', '100', 'i'),
	(8, 'server', 'players/initialStats/stamina', '100', 'i'),
	(9, 'server', 'players/initialStats/atk', '1001', 'i'),
	(10, 'server', 'players/initialStats/def', '1001', 'i'),
	(11, 'server', 'players/initialStats/dodge', '100', 'i'),
	(12, 'server', 'players/initialStats/speed', '100', 'i'),
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
	(26, 'client', 'ui/playerName/x', '50', 'i'),
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
	(40, 'client', 'chat/position/x', '440', 'i'),
	(41, 'client', 'chat/position/y', '450', 'i'),
	(42, 'server', 'players/actions/interactionDistance', '40', 'i'),
	(43, 'server', 'objects/actions/interactionsDistance', '64', 'i'),
	(44, 'client', 'ui/playerName/enabled', '1', 'b'),
	(45, 'client', 'ui/playerName/y', '30', 'i'),
	(46, 'client', 'ui/uiTarget/enabled', '1', 'b'),
	(47, 'client', 'ui/uiTarget/x', '10', 'i'),
	(48, 'client', 'ui/uiTarget/y', '80', 'i'),
	(49, 'client', 'ui/sceneLabel/x', '250', 'i'),
	(50, 'client', 'ui/sceneLabel/y', '20', 'i'),
	(51, 'client', 'ui/controls/x', '90', 'i'),
	(52, 'client', 'ui/controls/y', '400', 'i'),
	(53, 'client', 'ui/playerStats/x', '420', 'i'),
	(54, 'client', 'ui/playerStats/y', '10', 'i'),
	(55, 'client', 'ui/loading/font', 'Verdana, Geneva, sans-serif', 't'),
	(56, 'client', 'ui/loading/fontSize', '20px', 't'),
	(57, 'client', 'ui/loading/assetsSize', '18px', 't'),
	(58, 'client', 'ui/loading/loadingColor', '#ffffff', 't'),
	(59, 'client', 'ui/loading/percentColor', '#666666', 't'),
	(60, 'client', 'ui/loading/assetsColor', '#ffffff', 't'),
	(61, 'client', 'ui/loading/showAssets', '1', 'b'),
	(62, 'client', 'players/animations/basedOnPress', '1', 'b'),
	(63, 'client', 'players/animations/diagonalHorizontal', '1', 'b'),
	(64, 'client', 'ui/uiTarget/hideOnDialog', '0', 'b');
/*!40000 ALTER TABLE `config` ENABLE KEYS */;

-- Dumping structure for table reldens.features
CREATE TABLE IF NOT EXISTS `features` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `is_enabled` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.features: ~1 rows (approximately)
/*!40000 ALTER TABLE `features` DISABLE KEYS */;
INSERT INTO `features` (`id`, `code`, `title`, `is_enabled`) VALUES
	(1, 'chat', 'Chat', 1),
	(2, 'objects', 'Objects', 1),
	(3, 'respawn', 'Respawn', 1);
/*!40000 ALTER TABLE `features` ENABLE KEYS */;

-- Dumping structure for table reldens.objects
CREATE TABLE IF NOT EXISTS `objects` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `room_id` int(11) unsigned NOT NULL,
  `layer_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `tile_index` int(11) unsigned DEFAULT NULL,
  `object_class_key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `client_key` text COLLATE utf8_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `private_params` text COLLATE utf8_unicode_ci,
  `client_params` text COLLATE utf8_unicode_ci,
  `enabled` int(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `room_id_layer_name_tile_index` (`room_id`,`layer_name`,`tile_index`),
  KEY `room_id` (`room_id`),
  KEY `object_class_key` (`object_class_key`),
  CONSTRAINT `FK_objects_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.objects: ~5 rows (approximately)
/*!40000 ALTER TABLE `objects` DISABLE KEYS */;
INSERT INTO `objects` (`id`, `room_id`, `layer_name`, `tile_index`, `object_class_key`, `client_key`, `title`, `private_params`, `client_params`, `enabled`) VALUES
	(1, 4, 'ground-collisions', 444, 'door_1', 'door_house_1', '', NULL, NULL, 1),
	(4, 4, 'ground-collisions', 951, 'door_2', 'door_house_2', '', NULL, NULL, 1),
	(5, 4, 'house-collisions-over-player', 535, 'npc_1', 'people_town_1', 'Alfred', NULL, NULL, 1),
	(6, 5, 'respawn-area-monsters-lvl-1-2', NULL, 'enemy_1', 'enemy_forest_1', 'Tree', NULL, NULL, 1),
	(7, 5, 'respawn-area-monsters-lvl-1-2', NULL, 'enemy_2', 'enemy_forest_2', 'Tree Punch', NULL, NULL, 1);
/*!40000 ALTER TABLE `objects` ENABLE KEYS */;

-- Dumping structure for table reldens.objects_assets
CREATE TABLE IF NOT EXISTS `objects_assets` (
  `object_asset_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int(10) unsigned NOT NULL,
  `asset_type` varchar(255) NOT NULL,
  `asset_key` varchar(255) NOT NULL,
  `file_1` varchar(255) NOT NULL,
  `file_2` varchar(255) DEFAULT NULL,
  `extra_params` text,
  PRIMARY KEY (`object_asset_id`),
  KEY `object_id` (`object_id`),
  CONSTRAINT `FK_objects_assets_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=latin1;

-- Dumping data for table reldens.objects_assets: ~5 rows (approximately)
/*!40000 ALTER TABLE `objects_assets` DISABLE KEYS */;
INSERT INTO `objects_assets` (`object_asset_id`, `object_id`, `asset_type`, `asset_key`, `file_1`, `file_2`, `extra_params`) VALUES
	(1, 1, 'spritesheet', 'door_house_1', 'door-a-x2', NULL, '{"frameWidth":32,"frameHeight":58}'),
	(2, 4, 'spritesheet', 'door_house_2', 'door-a-x2', NULL, '{"frameWidth":32,"frameHeight":58}'),
	(3, 5, 'spritesheet', 'people_town_1', 'people-b-x2', NULL, '{"frameWidth":52,"frameHeight":71}'),
	(4, 6, 'spritesheet', 'enemy_forest_1', 'monster-treant', NULL, '{"frameWidth":47,"frameHeight":50}'),
	(5, 7, 'spritesheet', 'enemy_forest_2', 'monster-golem2', NULL, '{"frameWidth":47,"frameHeight":50}');
/*!40000 ALTER TABLE `objects_assets` ENABLE KEYS */;

-- Dumping structure for table reldens.players
CREATE TABLE IF NOT EXISTS `players` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_players_users` (`user_id`),
  CONSTRAINT `FK_players_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.players: ~5 rows (approximately)
/*!40000 ALTER TABLE `players` DISABLE KEYS */;
INSERT INTO `players` (`id`, `user_id`, `name`) VALUES
	(1, 29, 'DarthStormrage'),
	(2, 30, 'dap2'),
	(3, 31, 'dap3'),
	(15, 43, 'dap13'),
	(16, 44, 'dap12');
/*!40000 ALTER TABLE `players` ENABLE KEYS */;

-- Dumping structure for table reldens.players_state
CREATE TABLE IF NOT EXISTS `players_state` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `player_id` int(10) unsigned NOT NULL,
  `room_id` int(10) unsigned NOT NULL,
  `x` int(10) unsigned NOT NULL,
  `y` int(10) unsigned NOT NULL,
  `dir` varchar(25) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_player_state_rooms` (`room_id`),
  KEY `FK_player_state_player_stats` (`player_id`),
  CONSTRAINT `FK_player_state_player_stats` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_player_state_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.players_state: ~5 rows (approximately)
/*!40000 ALTER TABLE `players_state` DISABLE KEYS */;
INSERT INTO `players_state` (`id`, `player_id`, `room_id`, `x`, `y`, `dir`) VALUES
	(3, 1, 5, 635, 725, 'down'),
	(4, 2, 5, 666, 599, 'down'),
	(5, 3, 4, 443, 406, 'down'),
	(14, 15, 4, 300, 388, 'down'),
	(15, 16, 4, 508, 381, 'down');
/*!40000 ALTER TABLE `players_state` ENABLE KEYS */;

-- Dumping structure for table reldens.players_stats
CREATE TABLE IF NOT EXISTS `players_stats` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `player_id` int(10) unsigned NOT NULL,
  `hp` int(10) unsigned NOT NULL,
  `mp` int(10) unsigned NOT NULL,
  `stamina` int(10) unsigned NOT NULL,
  `atk` int(10) unsigned NOT NULL,
  `def` int(10) unsigned NOT NULL,
  `dodge` int(10) unsigned NOT NULL,
  `speed` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`player_id`),
  CONSTRAINT `FK_player_stats_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.players_stats: ~5 rows (approximately)
/*!40000 ALTER TABLE `players_stats` DISABLE KEYS */;
INSERT INTO `players_stats` (`id`, `player_id`, `hp`, `mp`, `stamina`, `atk`, `def`, `dodge`, `speed`) VALUES
	(1, 1, 19, 100, 100, 1001, 1001, 100, 100),
	(2, 2, 13, 100, 100, 1001, 1001, 100, 100),
	(3, 3, 100, 100, 100, 1001, 1001, 100, 100),
	(15, 15, 100, 100, 100, 1001, 1001, 100, 100),
	(16, 16, 100, 100, 100, 1001, 1001, 100, 100);
/*!40000 ALTER TABLE `players_stats` ENABLE KEYS */;

-- Dumping structure for table reldens.respawn
CREATE TABLE IF NOT EXISTS `respawn` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int(11) unsigned NOT NULL,
  `respawn_time` int(11) unsigned NOT NULL DEFAULT '0',
  `instances_limit` int(11) unsigned NOT NULL DEFAULT '0',
  `layer` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `respawn_object_id` (`object_id`),
  CONSTRAINT `FK_respawn_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

-- Dumping data for table reldens.respawn: ~2 rows (approximately)
/*!40000 ALTER TABLE `respawn` DISABLE KEYS */;
INSERT INTO `respawn` (`id`, `object_id`, `respawn_time`, `instances_limit`, `layer`) VALUES
	(1, 6, 20000, 2, 'respawn-area-monsters-lvl-1-2'),
	(2, 7, 10000, 3, 'respawn-area-monsters-lvl-1-2');
/*!40000 ALTER TABLE `respawn` ENABLE KEYS */;

-- Dumping structure for table reldens.rooms
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `map_filename` varchar(255) COLLATE utf8_unicode_ci NOT NULL COMMENT 'The map JSON file name.',
  `scene_images` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `room_class_key` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.rooms: ~3 rows (approximately)
/*!40000 ALTER TABLE `rooms` DISABLE KEYS */;
INSERT INTO `rooms` (`id`, `name`, `title`, `map_filename`, `scene_images`, `room_class_key`) VALUES
	(2, 'ReldensHouse_1', 'House - 1', 'reldens-house-1', 'reldens-house-1', NULL),
	(3, 'ReldensHouse_2', 'House - 2', 'reldens-house-2', 'reldens-house-2', NULL),
	(4, 'ReldensTown', 'Town', 'reldens-town', 'reldens-town', NULL),
	(5, 'ReldensForest', 'Forest', 'reldens-forest', 'reldens-forest', NULL);
/*!40000 ALTER TABLE `rooms` ENABLE KEYS */;

-- Dumping structure for table reldens.rooms_change_points
CREATE TABLE IF NOT EXISTS `rooms_change_points` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `room_id` int(11) unsigned NOT NULL,
  `tile_index` int(11) unsigned NOT NULL,
  `next_room_id` int(11) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `scene_id` (`room_id`),
  KEY `FK_rooms_change_points_rooms_2` (`next_room_id`),
  CONSTRAINT `FK_rooms_change_points_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_rooms_change_points_rooms_2` FOREIGN KEY (`next_room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.rooms_change_points: ~8 rows (approximately)
/*!40000 ALTER TABLE `rooms_change_points` DISABLE KEYS */;
INSERT INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES
	(1, 2, 491, 4),
	(2, 2, 492, 4),
	(3, 3, 187, 4),
	(4, 3, 188, 4),
	(5, 4, 444, 2),
	(6, 4, 951, 3),
	(7, 4, 18, 5),
	(8, 4, 19, 5),
	(9, 5, 1315, 4),
	(10, 5, 1316, 4);
/*!40000 ALTER TABLE `rooms_change_points` ENABLE KEYS */;

-- Dumping structure for table reldens.rooms_return_points
CREATE TABLE IF NOT EXISTS `rooms_return_points` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `room_id` int(11) unsigned NOT NULL,
  `direction` varchar(5) COLLATE utf8_unicode_ci NOT NULL,
  `x` int(11) unsigned NOT NULL,
  `y` int(11) unsigned NOT NULL,
  `is_default` int(1) unsigned NOT NULL,
  `to_room_id` int(11) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_scenes_return_points_rooms` (`room_id`),
  KEY `FK_scenes_return_points_rooms_2` (`to_room_id`),
  CONSTRAINT `FK_scenes_return_points_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  CONSTRAINT `FK_scenes_return_points_rooms_2` FOREIGN KEY (`to_room_id`) REFERENCES `rooms` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.rooms_return_points: ~8 rows (approximately)
/*!40000 ALTER TABLE `rooms_return_points` DISABLE KEYS */;
INSERT INTO `rooms_return_points` (`id`, `room_id`, `direction`, `x`, `y`, `is_default`, `to_room_id`) VALUES
	(1, 2, 'up', 400, 470, 1, NULL),
	(2, 3, 'up', 190, 430, 1, NULL),
	(3, 4, 'down', 400, 345, 1, 2),
	(4, 4, 'down', 1266, 670, 0, 3),
	(5, 5, 'up', 640, 768, 0, 4),
	(6, 5, 'up', 640, 768, 0, 4),
	(7, 4, 'down', 615, 64, 0, 5),
	(8, 4, 'down', 615, 64, 0, 5);
/*!40000 ALTER TABLE `rooms_return_points` ENABLE KEYS */;

-- Dumping structure for table reldens.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `username` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `role_id` int(10) unsigned NOT NULL,
  `status` int(10) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.users: ~5 rows (approximately)
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` (`id`, `email`, `username`, `password`, `role_id`, `status`, `created_at`, `updated_at`) VALUES
	(29, 'dap@dap.com', 'DarthStormrage', '$2b$10$PQIYGBFyA/69DaowJVTA5ufVWmIUeIOwIK4e6JCAP5Uen0sp0TAHu', 1, 1, '2019-08-02 23:06:14', '2020-01-06 21:31:20'),
	(30, 'dap2@dap.com', 'dap2', '$2b$10$Kvjh1XdsMai8Xt2wdivG2.prYvTiW6vJrdnrNPYZenf8qCRLhuZ/a', 9, 1, '2019-08-02 23:06:14', '2020-01-06 21:17:40'),
	(31, 'dap3@dap.com', 'dap3', '$2b$10$CmtWkhIexIVtcBjwsmEkeOlIhqizViykDFYAKtVrl4sF8KWLuBsxO', 1, 1, '2019-08-02 23:06:14', '2019-11-30 10:54:55'),
	(43, 'dap13@dap13.com', 'dap13', '$2b$10$PG6nUdhNmhy2RUpS4k.g..vJ5k3x0sPRyFlpnVZMTPfuAXgXyFP/y', 1, 1, '2019-11-15 21:47:17', '2019-11-15 21:47:17'),
	(44, 'dap12@dap12.com', 'dap12', '$2b$10$PFEKucJCDoQq8evXhO.FiuwMEayr0HLEt5UYo/WU9TgXb.wwwPG8W', 1, 1, '2019-11-15 21:58:32', '2019-11-15 21:58:32');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
