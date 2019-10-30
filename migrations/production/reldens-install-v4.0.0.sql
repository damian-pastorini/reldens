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
  `message` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.config: ~36 rows (approximately)
/*!40000 ALTER TABLE `config` DISABLE KEYS */;
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES
	(1, 'server', 'rooms/validation/valid', 'room_game,chat_global', 't'),
	(2, 'server', 'rooms/initialState/scene', 'ReldensTown', 't'),
	(3, 'server', 'rooms/initialState/x', '400', 'i'),
	(4, 'server', 'rooms/initialState/y', '345', 'i'),
	(5, 'server', 'rooms/initialState/dir', 'down', 't'),
	(6, 'server', 'players/initialStats/hp', '100', 'i'),
	(7, 'server', 'players/initialStats/mp', '100', 'i'),
	(8, 'server', 'players/initialStats/stamina', '100', 'i'),
	(9, 'server', 'players/initialStats/atk', '100', 'i'),
	(10, 'server', 'players/initialStats/def', '100', 'i'),
	(11, 'server', 'players/initialStats/dodge', '100', 'i'),
	(12, 'server', 'players/initialStats/speed', '100', 'i'),
	(13, 'server', 'rooms/validation/enabled', '1', 'b'),
	(14, 'server', 'rooms/world/gravity_enabled', '0', 'b'),
	(16, 'server', 'players/size/width', '25', 'i'),
	(17, 'server', 'players/size/height', '25', 'i'),
	(18, 'server', 'general/controls/allow_simultaneous_keys', '0', 'b'),
	(19, 'server', 'rooms/world/timestep', '0.04', 'i'),
	(20, 'feature', 'chat/messages/broadcast_join', '1', 'b'),
	(21, 'feature', 'chat/messages/broadcast_leave', '1', 'b'),
	(22, 'feature', 'chat/messages/global_enabled', '1', 'b'),
	(23, 'feature', 'chat/messages/global_allowed_roles', '1,9000', 't'),
	(24, 'server', 'players/physicsBody/speed', '180', 'i'),
	(25, 'client', 'players/animations/fadeDuration', '1000', 'i'),
	(26, 'client', 'general/uiVisibility/uiBoxRight', '1', 'b'),
	(27, 'client', 'general/uiVisibility/uiBoxPlayerStats', '1', 'b'),
	(28, 'client', 'general/uiVisibility/uiBoxLeft', '1', 'b'),
	(29, 'client', 'general/tileData/width', '16', 'i'),
	(30, 'client', 'general/tileData/height', '16', 'i'),
	(31, 'client', 'general/tileData/margin', '1', 'i'),
	(32, 'client', 'general/tileData/spacing', '2', 'i'),
	(33, 'client', 'players/size/width', '52', 'i'),
	(34, 'client', 'players/size/height', '71', 'i'),
	(35, 'client', 'general/animations/frameRate', '10', 'i'),
	(36, 'client', 'map/layersDepth/belowPlayer', '0', 'i'),
	(37, 'client', 'map/layersDepth/changePoints', '0', 'i'),
	(38, 'client', 'general/uiVisibility/sceneLabel', '1', 'b');
/*!40000 ALTER TABLE `config` ENABLE KEYS */;

-- Dumping structure for table reldens.features
CREATE TABLE IF NOT EXISTS `features` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `is_enabled` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.features: ~1 rows (approximately)
/*!40000 ALTER TABLE `features` DISABLE KEYS */;
INSERT INTO `features` (`id`, `code`, `title`, `is_enabled`) VALUES
	(1, 'chat', 'Chat', 1),
	(2, 'objects', 'Objects', 1);
/*!40000 ALTER TABLE `features` ENABLE KEYS */;

-- Dumping structure for table reldens.objects
CREATE TABLE IF NOT EXISTS `objects` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `room_id` int(11) unsigned NOT NULL,
  `layer_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `tile_index` int(11) unsigned NOT NULL,
  `server_path` text COLLATE utf8_unicode_ci NOT NULL,
  `client_key` text COLLATE utf8_unicode_ci NOT NULL,
  `private_params` text COLLATE utf8_unicode_ci,
  `public_params` text COLLATE utf8_unicode_ci,
  `enabled` int(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `room_id_layer_name_tile_index` (`room_id`,`layer_name`,`tile_index`),
  KEY `room_id` (`room_id`),
  CONSTRAINT `FK_objects_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.objects: ~2 rows (approximately)
/*!40000 ALTER TABLE `objects` DISABLE KEYS */;
INSERT INTO `objects` (`id`, `room_id`, `layer_name`, `tile_index`, `server_path`, `client_key`, `private_params`, `public_params`, `enabled`) VALUES
	(1, 4, 'ground-collisions', 444, 'packages/server/doors', 'door_house_1', NULL, NULL, 1),
	(4, 4, 'ground-collisions', 951, 'packages/server/doors', 'door_house_2', NULL, NULL, 1);
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

-- Dumping data for table reldens.objects_assets: ~2 rows (approximately)
/*!40000 ALTER TABLE `objects_assets` DISABLE KEYS */;
INSERT INTO `objects_assets` (`object_asset_id`, `object_id`, `asset_type`, `asset_key`, `file_1`, `file_2`, `extra_params`) VALUES
	(1, 1, 'spritesheet', 'door_house_1', 'door-a-x2', NULL, '{"frameWidth":32,"frameHeight":58}'),
	(2, 4, 'spritesheet', 'door_house_2', 'door-a-x2', NULL, '{"frameWidth":32,"frameHeight":58}');
/*!40000 ALTER TABLE `objects_assets` ENABLE KEYS */;

-- Dumping structure for table reldens.players
CREATE TABLE IF NOT EXISTS `players` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_players_users` (`user_id`),
  CONSTRAINT `FK_players_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.players: ~3 rows (approximately)
/*!40000 ALTER TABLE `players` DISABLE KEYS */;
INSERT INTO `players` (`id`, `user_id`, `name`) VALUES
	(1, 29, 'dap'),
	(2, 30, 'dap2'),
	(3, 31, 'dap3'),
	(4, 32, 'dap4');
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.players_state: ~4 rows (approximately)
/*!40000 ALTER TABLE `players_state` DISABLE KEYS */;
INSERT INTO `players_state` (`id`, `player_id`, `room_id`, `x`, `y`, `dir`) VALUES
	(3, 1, 4, 1266, 684, 'down'),
	(4, 2, 4, 307, 361, 'down'),
	(5, 3, 4, 400, 345, 'right'),
	(6, 4, 4, 400, 345, 'down');
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.players_stats: ~3 rows (approximately)
/*!40000 ALTER TABLE `players_stats` DISABLE KEYS */;
INSERT INTO `players_stats` (`id`, `player_id`, `hp`, `mp`, `stamina`, `atk`, `def`, `dodge`, `speed`) VALUES
	(1, 1, 100, 100, 100, 100, 100, 100, 100),
	(2, 2, 100, 100, 100, 100, 100, 100, 100),
	(3, 3, 100, 100, 100, 100, 100, 100, 100),
	(4, 4, 100, 100, 100, 100, 100, 100, 100);
/*!40000 ALTER TABLE `players_stats` ENABLE KEYS */;

-- Dumping structure for table reldens.rooms
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `map_filename` varchar(255) COLLATE utf8_unicode_ci NOT NULL COMMENT 'The map JSON file name.',
  `scene_images` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `room_class` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.rooms: ~3 rows (approximately)
/*!40000 ALTER TABLE `rooms` DISABLE KEYS */;
INSERT INTO `rooms` (`id`, `name`, `title`, `map_filename`, `scene_images`, `room_class`) VALUES
	(2, 'ReldensHouse_1', 'House - 1', 'reldens-house-1', 'reldens-house-1', NULL),
	(3, 'ReldensHouse_2', 'House - 2', 'reldens-house-2', 'reldens-house-2', NULL),
	(4, 'ReldensTown', 'Town', 'reldens-town', 'reldens-town', NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.rooms_change_points: ~6 rows (approximately)
/*!40000 ALTER TABLE `rooms_change_points` DISABLE KEYS */;
INSERT INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES
	(1, 2, 491, 4),
	(2, 2, 492, 4),
	(3, 3, 187, 4),
	(4, 3, 188, 4),
	(5, 4, 444, 2),
	(6, 4, 951, 3);
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.rooms_return_points: ~4 rows (approximately)
/*!40000 ALTER TABLE `rooms_return_points` DISABLE KEYS */;
INSERT INTO `rooms_return_points` (`id`, `room_id`, `direction`, `x`, `y`, `is_default`, `to_room_id`) VALUES
	(1, 2, 'up', 400, 470, 1, NULL),
	(2, 3, 'up', 190, 430, 1, NULL),
	(3, 4, 'down', 400, 345, 1, 2),
	(4, 4, 'down', 1266, 670, 0, 3);
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
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.users: ~3 rows (approximately)
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` (`id`, `email`, `username`, `password`, `role_id`, `status`, `created_at`, `updated_at`) VALUES
	(29, 'dap@dap.com', 'dap', '$2b$10$PQIYGBFyA/69DaowJVTA5ufVWmIUeIOwIK4e6JCAP5Uen0sp0TAHu', 1, 1, '2019-08-02 23:06:14', '2019-10-25 22:45:45'),
	(30, 'dap2@dap.com', 'dap2', '$2b$10$Kvjh1XdsMai8Xt2wdivG2.prYvTiW6vJrdnrNPYZenf8qCRLhuZ/a', 9, 1, '2019-08-02 23:06:14', '2019-10-06 13:54:04'),
	(31, 'dap3@dap.com', 'dap3', '$2b$10$CmtWkhIexIVtcBjwsmEkeOlIhqizViykDFYAKtVrl4sF8KWLuBsxO', 1, 1, '2019-08-02 23:06:14', '2019-09-29 16:14:51'),
	(32, 'dap4@dap4.com', 'dap4', '$2b$10$X2.NOm1TiE1YVa44Jjf0Vu.YHndsujPqkj/36UHPvTnCnO.LHwXPq', 1, 1, '2019-09-29 14:04:11', '2019-09-29 14:04:11');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
