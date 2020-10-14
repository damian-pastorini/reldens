-- --------------------------------------------------------
-- Host:                         localhost
-- Server version:               5.7.26 - MySQL Community Server (GPL)
-- Server OS:                    Win64
-- HeidiSQL Version:             11.0.0.5919
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
) ENGINE=InnoDB AUTO_INCREMENT=120 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.config: ~116 rows (approximately)
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
	(9, 'server', 'players/initialStats/atk', '100', 'i'),
	(10, 'server', 'players/initialStats/def', '100', 'i'),
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
	(40, 'client', 'ui/chat/x', '440', 'i'),
	(41, 'client', 'ui/chat/y', '940', 'i'),
	(42, 'server', 'players/actions/interactionDistance', '40', 'i'),
	(43, 'server', 'objects/actions/interactionsDistance', '140', 'i'),
	(44, 'client', 'ui/playerName/enabled', '1', 'b'),
	(45, 'client', 'ui/playerName/y', '30', 'i'),
	(46, 'client', 'ui/uiLifeBar/enabled', '1', 'b'),
	(47, 'client', 'ui/uiTarget/x', '0', 'i'),
	(48, 'client', 'ui/uiTarget/y', '0', 'i'),
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
	(66, 'client', 'ui/uiLifeBar/x', '225', 'i'),
	(67, 'client', 'ui/uiLifeBar/y', '210', 'i'),
	(68, 'client', 'ui/uiLifeBar/height', '5', 'i'),
	(69, 'client', 'ui/uiLifeBar/width', '50', 'i'),
	(71, 'client', 'ui/uiLifeBar/fixedPosition', '0', 'b'),
	(72, 'server', 'rooms/world/tryClosestPath', '1', 'b'),
	(73, 'server', 'actions/pvp/battleTimeOff', '20000', 'i'),
	(74, 'server', 'actions/pvp/timerType', 'bt', 's'),
	(75, 'server', 'enemies/initialStats/atk', '100', 'i'),
	(76, 'server', 'enemies/initialStats/def', '100', 'i'),
	(77, 'server', 'enemies/initialStats/dodge', '100', 'i'),
	(78, 'server', 'enemies/initialStats/hp', '20', 'i'),
	(79, 'server', 'enemies/initialStats/mp', '20', 'i'),
	(80, 'server', 'enemies/initialStats/speed', '100', 'i'),
	(81, 'server', 'enemies/initialStats/stamina', '100', 'i'),
	(82, 'client', 'ui/pointer/show', '1', 'b'),
	(83, 'server', 'enemies/defaultAttacks/attackBullet', '0', 'b'),
	(84, 'client', 'players/size/topOffset', '20', 'i'),
	(85, 'client', 'players/size/leftOffset', '0', 'i'),
	(86, 'server', 'rooms/world/onlyWalkable', '1', 'b'),
	(87, 'client', 'ui/inventory/y', '450', 'i'),
	(88, 'client', 'ui/inventory/x', '380', 'i'),
	(89, 'client', 'ui/equipment/x', '430', 'i'),
	(90, 'client', 'ui/equipment/y', '90', 'i'),
	(91, 'client', 'ui/screen/responsive', '1', 'b'),
	(92, 'client', 'ui/uiTarget/responsiveY', '0', 'i'),
	(93, 'client', 'ui/uiTarget/responsiveX', '0', 'i'),
	(94, 'client', 'ui/uiLifeBar/responsiveY', '50', 'i'),
	(95, 'client', 'ui/uiLifeBar/responsiveX', '50', 'i'),
	(96, 'client', 'ui/sceneLabel/responsiveY', '0', 'i'),
	(97, 'client', 'ui/sceneLabel/responsiveX', '50', 'i'),
	(98, 'client', 'ui/playerStats/responsiveY', '0', 'i'),
	(99, 'client', 'ui/playerStats/responsiveX', '100', 'i'),
	(100, 'client', 'ui/playerName/responsiveY', '0', 'i'),
	(101, 'client', 'ui/playerName/responsiveX', '0', 'i'),
	(102, 'client', 'ui/controls/responsiveY', '100', 'i'),
	(103, 'client', 'ui/controls/responsiveX', '0', 'i'),
	(104, 'client', 'ui/inventory/responsiveY', '0', 'i'),
	(105, 'client', 'ui/inventory/responsiveX', '100', 'i'),
	(106, 'client', 'ui/equipment/responsiveY', '0', 'i'),
	(107, 'client', 'ui/equipment/responsiveX', '100', 'i'),
	(108, 'client', 'ui/chat/responsiveY', '100', 'i'),
	(109, 'client', 'ui/chat/responsiveX', '100', 'i'),
	(110, 'client', 'ui/chat/enabled', '1', 'b'),
	(111, 'client', 'ui/inventory/enabled', '1', 'b'),
	(112, 'client', 'ui/equipment/enabled', '1', 'b'),
	(113, 'client', 'ui/npcDialog/x', '120', 'i'),
	(114, 'client', 'ui/npcDialog/y', '100', 'i'),
	(115, 'client', 'ui/npcDialog/responsiveX', '10', 'i'),
	(116, 'client', 'ui/npcDialog/responsiveY', '10', 'i'),
	(117, 'client', 'ui/maximum/x', '1280', 'i'),
	(118, 'client', 'ui/maximum/y', '720', 'i'),
	(119, 'server', 'players/initialStats/aim', '100', 'i');
/*!40000 ALTER TABLE `config` ENABLE KEYS */;

-- Dumping structure for table reldens.features
CREATE TABLE IF NOT EXISTS `features` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `is_enabled` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.features: ~6 rows (approximately)
/*!40000 ALTER TABLE `features` DISABLE KEYS */;
INSERT INTO `features` (`id`, `code`, `title`, `is_enabled`) VALUES
	(1, 'chat', 'Chat', 1),
	(2, 'objects', 'Objects', 1),
	(3, 'respawn', 'Respawn', 1),
	(4, 'inventory', 'Inventory', 1),
	(5, 'firebase', 'Firebase', 1),
	(6, 'actions', 'Actions', 1);
/*!40000 ALTER TABLE `features` ENABLE KEYS */;

-- Dumping structure for table reldens.items_group
CREATE TABLE IF NOT EXISTS `items_group` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `description` text COLLATE utf8_unicode_ci,
  `sort` int(11) DEFAULT NULL,
  `items_limit` int(1) NOT NULL DEFAULT '0',
  `limit_per_item` int(1) NOT NULL DEFAULT '0',
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
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `owner_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `qty` int(11) NOT NULL DEFAULT '0',
  `remaining_uses` int(11) DEFAULT NULL,
  `is_active` int(1) DEFAULT NULL COMMENT 'For example equipped or not equipped items.',
  PRIMARY KEY (`id`),
  KEY `FK_items_inventory_items_item` (`item_id`),
  CONSTRAINT `FK_items_inventory_items_item` FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=224 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Inventory table is to save the items for each owner.';

-- Dumping data for table reldens.items_inventory: ~71 rows (approximately)
/*!40000 ALTER TABLE `items_inventory` DISABLE KEYS */;
INSERT INTO `items_inventory` (`id`, `owner_id`, `item_id`, `qty`, `remaining_uses`, `is_active`) VALUES
	(1, 1, 1, 143, NULL, NULL),
	(2, 2, 1, 7, NULL, NULL),
	(3, 2, 2, 1, NULL, NULL),
	(4, 2, 2, 1, NULL, NULL),
	(91, 1, 3, 10, NULL, NULL),
	(92, 3, 3, 1, NULL, NULL),
	(93, 1, 5, 1, NULL, 1),
	(94, 1, 4, 1, NULL, 0),
	(95, 2, 4, 1, 0, 1),
	(96, 2, 5, 1, 0, 0),
	(101, 17, 1, 1, 0, 0),
	(102, 17, 4, 1, 0, 0),
	(103, 17, 5, 1, 0, 1),
	(104, 17, 3, 3, 0, 0),
	(119, 1, 6, 17, 0, 0),
	(137, 1, 2, 1, 0, 0),
	(138, 1, 2, 1, 0, 0),
	(152, 1, 2, 1, 0, 0),
	(160, 1, 2, 1, 0, 0);
/*!40000 ALTER TABLE `items_inventory` ENABLE KEYS */;

-- Dumping structure for table reldens.items_item
CREATE TABLE IF NOT EXISTS `items_item` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `group_id` int(11) DEFAULT NULL,
  `label` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `qty_limit` int(11) NOT NULL DEFAULT '0' COMMENT 'Default 0 to unlimited qty.',
  `uses_limit` int(11) NOT NULL DEFAULT '1' COMMENT 'Default 1 use per item (0 = unlimited).',
  `useTimeOut` int(11) DEFAULT NULL,
  `execTimeOut` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `key` (`key`),
  KEY `group_id` (`group_id`),
  CONSTRAINT `FK_items_item_items_group` FOREIGN KEY (`group_id`) REFERENCES `items_group` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='List of all available items in the system.';

-- Dumping data for table reldens.items_item: ~5 rows (approximately)
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
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `item_id` int(11) NOT NULL,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `operation` int(11) NOT NULL,
  `value` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `maxProperty` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `FK_items_item_modifiers_items_item` FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Modifiers is the way we will affect the item owner.';

-- Dumping data for table reldens.items_item_modifiers: ~3 rows (approximately)
/*!40000 ALTER TABLE `items_item_modifiers` DISABLE KEYS */;
INSERT INTO `items_item_modifiers` (`id`, `item_id`, `key`, `property_key`, `operation`, `value`, `maxProperty`) VALUES
	(1, 4, 'atk', 'stats/atk', 5, '5', NULL),
	(2, 3, 'heal_potion_20', 'stats/hp', 1, '20', 'initialStats/hp'),
	(3, 5, 'atk', 'stats/atk', 5, '3', NULL),
	(4, 6, 'magic_potion_20', 'stats/mp', 1, '20', 'initialStats/mp');
/*!40000 ALTER TABLE `items_item_modifiers` ENABLE KEYS */;

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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.objects: ~8 rows (approximately)
/*!40000 ALTER TABLE `objects` DISABLE KEYS */;
INSERT INTO `objects` (`id`, `room_id`, `layer_name`, `tile_index`, `object_class_key`, `client_key`, `title`, `private_params`, `client_params`, `enabled`) VALUES
	(1, 4, 'ground-collisions', 444, 'door_1', 'door_house_1', '', NULL, NULL, 1),
	(4, 4, 'ground-collisions', 951, 'door_2', 'door_house_2', '', NULL, NULL, 1),
	(5, 4, 'house-collisions-over-player', 535, 'npc_1', 'people_town_1', 'Alfred', NULL, NULL, 1),
	(6, 5, 'respawn-area-monsters-lvl-1-2', NULL, 'enemy_1', 'enemy_forest_1', 'Tree', NULL, NULL, 1),
	(7, 5, 'respawn-area-monsters-lvl-1-2', NULL, 'enemy_2', 'enemy_forest_2', 'Tree Punch', NULL, NULL, 1),
	(8, 4, 'house-collisions-over-player', 538, 'npc_2', 'healer_1', 'Mamon', NULL, NULL, 1),
	(10, 4, 'house-collisions-over-player', 560, 'npc_3', 'merchant_1', 'Gimly', NULL, NULL, 1),
	(12, 4, 'house-collisions-over-player', 562, 'npc_4', 'weapons_master_1', 'Barrik', NULL, NULL, 1);
/*!40000 ALTER TABLE `objects` ENABLE KEYS */;

-- Dumping structure for table reldens.objects_assets
CREATE TABLE IF NOT EXISTS `objects_assets` (
  `object_asset_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int(10) unsigned NOT NULL,
  `asset_type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `asset_key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `file_1` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `file_2` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `extra_params` text COLLATE utf8_unicode_ci,
  PRIMARY KEY (`object_asset_id`),
  KEY `object_id` (`object_id`),
  CONSTRAINT `FK_objects_assets_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.objects_assets: ~8 rows (approximately)
/*!40000 ALTER TABLE `objects_assets` DISABLE KEYS */;
INSERT INTO `objects_assets` (`object_asset_id`, `object_id`, `asset_type`, `asset_key`, `file_1`, `file_2`, `extra_params`) VALUES
	(1, 1, 'spritesheet', 'door_house_1', 'door-a-x2', NULL, '{"frameWidth":32,"frameHeight":58}'),
	(2, 4, 'spritesheet', 'door_house_2', 'door-a-x2', NULL, '{"frameWidth":32,"frameHeight":58}'),
	(3, 5, 'spritesheet', 'people_town_1', 'people-b-x2', NULL, '{"frameWidth":52,"frameHeight":71}'),
	(4, 6, 'spritesheet', 'enemy_forest_1', 'monster-treant', NULL, '{"frameWidth":47,"frameHeight":50}'),
	(5, 7, 'spritesheet', 'enemy_forest_2', 'monster-golem2', NULL, '{"frameWidth":47,"frameHeight":50}'),
	(6, 8, 'spritesheet', 'healer_1', 'healer-1', NULL, '{"frameWidth":52,"frameHeight":71}'),
	(7, 10, 'spritesheet', 'merchant_1', 'people-d-x2', NULL, '{"frameWidth":52,"frameHeight":71}'),
	(8, 12, 'spritesheet', 'weapons_master_1', 'people-c-x2', NULL, '{"frameWidth":52,"frameHeight":71}');
/*!40000 ALTER TABLE `objects_assets` ENABLE KEYS */;

-- Dumping structure for table reldens.players
CREATE TABLE IF NOT EXISTS `players` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_players_users` (`user_id`),
  CONSTRAINT `FK_players_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.players: ~5 rows (approximately)
/*!40000 ALTER TABLE `players` DISABLE KEYS */;
INSERT INTO `players` (`id`, `user_id`, `name`) VALUES
	(1, 29, 'DarthStormrage'),
	(2, 30, 'dap2'),
	(3, 31, 'dap3'),
	(17, 45, 'Fire Test');
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
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.players_state: ~4 rows (approximately)
/*!40000 ALTER TABLE `players_state` DISABLE KEYS */;
INSERT INTO `players_state` (`id`, `player_id`, `room_id`, `x`, `y`, `dir`) VALUES
	(3, 1, 5, 731, 251, 'right'),
	(4, 2, 5, 647, 677, 'left'),
	(5, 3, 4, 385, 449, 'right'),
	(19, 17, 4, 1085, 489, 'right');
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
  `aim` int(10) unsigned NOT NULL,
  `speed` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`player_id`),
  CONSTRAINT `FK_player_stats_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.players_stats: ~4 rows (approximately)
/*!40000 ALTER TABLE `players_stats` DISABLE KEYS */;
INSERT INTO `players_stats` (`id`, `player_id`, `hp`, `mp`, `stamina`, `atk`, `def`, `dodge`, `aim`, `speed`) VALUES
	(1, 1, 100, 100, 100, 150, 150, 100, 100, 100),
	(2, 2, 52, 100, 100, 105, 100, 100, 100, 100),
	(3, 3, 100, 100, 100, 100, 100, 100, 100, 100),
	(17, 17, 100, 100, 100, 103, 100, 100, 100, 100);
/*!40000 ALTER TABLE `players_stats` ENABLE KEYS */;

-- Dumping structure for table reldens.respawn
CREATE TABLE IF NOT EXISTS `respawn` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int(11) unsigned NOT NULL,
  `respawn_time` int(11) unsigned NOT NULL DEFAULT '0',
  `instances_limit` int(11) unsigned NOT NULL DEFAULT '0',
  `layer` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `respawn_object_id` (`object_id`),
  CONSTRAINT `FK_respawn_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

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
	(1, 2, 816, 4),
	(2, 2, 817, 4),
	(3, 3, 778, 4),
	(4, 3, 779, 4),
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
	(1, 2, 'up', 548, 615, 1, NULL),
	(2, 3, 'up', 640, 600, 1, NULL),
	(3, 4, 'down', 400, 345, 1, 2),
	(4, 4, 'down', 1266, 670, 0, 3),
	(5, 5, 'up', 640, 768, 0, 4),
	(6, 5, 'up', 640, 768, 0, 4),
	(7, 4, 'down', 615, 64, 0, 5),
	(8, 4, 'down', 615, 64, 0, 5);
/*!40000 ALTER TABLE `rooms_return_points` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_class_path
CREATE TABLE IF NOT EXISTS `skills_class_path` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `levels_set_id` int(11) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `levels_set_id` (`levels_set_id`),
  CONSTRAINT `FK_skills_class_path_skills_levels_set` FOREIGN KEY (`levels_set_id`) REFERENCES `skills_levels_set` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.skills_class_path: ~0 rows (approximately)
/*!40000 ALTER TABLE `skills_class_path` DISABLE KEYS */;
INSERT INTO `skills_class_path` (`id`, `key`, `label`, `levels_set_id`) VALUES
	(1, 'mage', 'Mage', 1);
/*!40000 ALTER TABLE `skills_class_path` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_class_path_level_labels
CREATE TABLE IF NOT EXISTS `skills_class_path_level_labels` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `class_path_id` int(11) unsigned NOT NULL,
  `level_key` int(11) unsigned NOT NULL,
  `label` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `class_path_id_level_key` (`class_path_id`,`level_key`),
  KEY `class_path_id` (`class_path_id`),
  KEY `level_key` (`level_key`),
  CONSTRAINT `FK__skills_class_path` FOREIGN KEY (`class_path_id`) REFERENCES `skills_class_path` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_skills_class_path_level_labels_skills_levels` FOREIGN KEY (`level_key`) REFERENCES `skills_levels` (`key`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.skills_class_path_level_labels: ~2 rows (approximately)
/*!40000 ALTER TABLE `skills_class_path_level_labels` DISABLE KEYS */;
INSERT INTO `skills_class_path_level_labels` (`id`, `class_path_id`, `level_key`, `label`) VALUES
	(1, 1, 1, 'Apprentice'),
	(2, 1, 4, 'Mage');
/*!40000 ALTER TABLE `skills_class_path_level_labels` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_class_path_level_skills
CREATE TABLE IF NOT EXISTS `skills_class_path_level_skills` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `class_path_id` int(11) unsigned NOT NULL,
  `level_key` int(11) unsigned NOT NULL,
  `skill_id` int(11) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `class_path_id` (`class_path_id`),
  KEY `level_key` (`level_key`),
  KEY `skill_id` (`skill_id`),
  CONSTRAINT `FK_skills_class_path_level_skills_skills_class_path` FOREIGN KEY (`class_path_id`) REFERENCES `skills_class_path` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_skills_class_path_level_skills_skills_levels` FOREIGN KEY (`level_key`) REFERENCES `skills_levels` (`key`) ON UPDATE CASCADE,
  CONSTRAINT `FK_skills_class_path_level_skills_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.skills_class_path_level_skills: ~2 rows (approximately)
/*!40000 ALTER TABLE `skills_class_path_level_skills` DISABLE KEYS */;
INSERT INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_key`, `skill_id`) VALUES
	(1, 1, 1, 1),
	(2, 1, 1, 2);
/*!40000 ALTER TABLE `skills_class_path_level_skills` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_groups
CREATE TABLE IF NOT EXISTS `skills_groups` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `sort` int(11) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.skills_groups: ~0 rows (approximately)
/*!40000 ALTER TABLE `skills_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `skills_groups` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_levels
CREATE TABLE IF NOT EXISTS `skills_levels` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `key` int(11) unsigned NOT NULL,
  `label` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `required_experience` bigint(20) unsigned DEFAULT NULL,
  `level_set_id` int(11) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`),
  KEY `level_set_id` (`level_set_id`),
  CONSTRAINT `FK_skills_levels_skills_levels_set` FOREIGN KEY (`level_set_id`) REFERENCES `skills_levels_set` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.skills_levels: ~2 rows (approximately)
/*!40000 ALTER TABLE `skills_levels` DISABLE KEYS */;
INSERT INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES
	(1, 1, '1', 0, 1),
	(2, 4, '4', 100, 1),
	(3, 2, '2', 50, 1);
/*!40000 ALTER TABLE `skills_levels` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_levels_modifiers
CREATE TABLE IF NOT EXISTS `skills_levels_modifiers` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `level_key` int(11) unsigned NOT NULL,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `operation` int(11) unsigned NOT NULL,
  `value` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `minValue` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `maxValue` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `minProperty` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `maxProperty` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `level_key` (`level_key`),
  KEY `modifier_id` (`key`) USING BTREE,
  CONSTRAINT `FK__skills_levels` FOREIGN KEY (`level_key`) REFERENCES `skills_levels` (`key`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Modifiers table.';

-- Dumping data for table reldens.skills_levels_modifiers: ~5 rows (approximately)
/*!40000 ALTER TABLE `skills_levels_modifiers` DISABLE KEYS */;
INSERT INTO `skills_levels_modifiers` (`id`, `level_key`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES
	(1, 1, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL),
	(2, 1, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL),
	(3, 4, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL),
	(4, 4, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL),
	(5, 2, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL),
	(6, 2, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL);
/*!40000 ALTER TABLE `skills_levels_modifiers` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_levels_modifiers_conditions
CREATE TABLE IF NOT EXISTS `skills_levels_modifiers_conditions` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `levels_modifier_id` int(11) unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` varchar(50) COLLATE utf32_unicode_ci NOT NULL COMMENT 'eq,ne,lt,gt,le,ge',
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
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `autoFillRanges` int(1) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.skills_levels_set: ~1 rows (approximately)
/*!40000 ALTER TABLE `skills_levels_set` DISABLE KEYS */;
INSERT INTO `skills_levels_set` (`id`, `autoFillRanges`) VALUES
	(1, 1);
/*!40000 ALTER TABLE `skills_levels_set` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_owners_class_path
CREATE TABLE IF NOT EXISTS `skills_owners_class_path` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `class_path_id` int(11) unsigned NOT NULL,
  `owner_id` int(11) unsigned NOT NULL,
  `currentLevel` bigint(20) unsigned NOT NULL DEFAULT '0',
  `currentExp` bigint(20) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `level_set_id` (`class_path_id`) USING BTREE,
  CONSTRAINT `FK_skills_owners_class_path_skills_class_path` FOREIGN KEY (`class_path_id`) REFERENCES `skills_class_path` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.skills_owners_class_path: ~4 rows (approximately)
/*!40000 ALTER TABLE `skills_owners_class_path` DISABLE KEYS */;
INSERT INTO `skills_owners_class_path` (`id`, `class_path_id`, `owner_id`, `currentLevel`, `currentExp`) VALUES
	(1, 1, 1, 1, 0),
	(2, 1, 2, 1, 0),
	(3, 1, 3, 1, 0),
	(4, 1, 17, 1, 0);
/*!40000 ALTER TABLE `skills_owners_class_path` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill
CREATE TABLE IF NOT EXISTS `skills_skill` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `type` varchar(255) COLLATE utf8_unicode_ci NOT NULL COMMENT 'B: 1, ATK: 2, EFCT: 3, PHYS-ATK: 4, PHYS-EFCT: 5',
  `autoValidation` int(1) NOT NULL,
  `skillDelay` int(11) NOT NULL,
  `castTime` int(11) NOT NULL,
  `usesLimit` int(11) NOT NULL DEFAULT '0',
  `range` int(11) NOT NULL,
  `rangeAutomaticValidation` int(1) NOT NULL,
  `rangePropertyX` varchar(255) COLLATE utf8_unicode_ci NOT NULL COMMENT 'Property path',
  `rangePropertyY` varchar(255) COLLATE utf8_unicode_ci NOT NULL COMMENT 'Property path',
  `rangeTargetPropertyX` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT 'Target property path',
  `rangeTargetPropertyY` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT 'Target property path',
  `allowSelfTarget` int(1) NOT NULL,
  `criticalChance` int(11) DEFAULT NULL,
  `criticalMultiplier` int(11) DEFAULT NULL,
  `criticalFixedValue` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.skills_skill: ~0 rows (approximately)
/*!40000 ALTER TABLE `skills_skill` DISABLE KEYS */;
INSERT INTO `skills_skill` (`id`, `key`, `type`, `autoValidation`, `skillDelay`, `castTime`, `usesLimit`, `range`, `rangeAutomaticValidation`, `rangePropertyX`, `rangePropertyY`, `rangeTargetPropertyX`, `rangeTargetPropertyY`, `allowSelfTarget`, `criticalChance`, `criticalMultiplier`, `criticalFixedValue`) VALUES
	(1, 'attackBullet', '4', 0, 1000, 0, 0, 250, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0),
	(2, 'attackShort', '2', 0, 600, 0, 0, 50, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0);
/*!40000 ALTER TABLE `skills_skill` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_attack
CREATE TABLE IF NOT EXISTS `skills_skill_attack` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int(11) unsigned NOT NULL,
  `affectedProperty` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `allowEffectBelowZero` int(1) unsigned NOT NULL DEFAULT '0',
  `hitDamage` int(11) unsigned NOT NULL,
  `applyDirectDamage` int(1) unsigned NOT NULL DEFAULT '0',
  `attackProperties` text COLLATE utf8_unicode_ci NOT NULL,
  `defenseProperties` text COLLATE utf8_unicode_ci NOT NULL,
  `aimProperties` text COLLATE utf8_unicode_ci NOT NULL,
  `dodgeProperties` text COLLATE utf8_unicode_ci NOT NULL,
  `dodgeFullEnabled` int(1) NOT NULL DEFAULT '1',
  `dodgeOverAimSuccess` int(11) NOT NULL DEFAULT '2',
  `damageAffected` int(1) NOT NULL DEFAULT '0',
  `criticalAffected` int(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `skill_id` (`skill_id`),
  CONSTRAINT `FK__skills_skill_attack` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.skills_skill_attack: ~2 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_attack` DISABLE KEYS */;
INSERT INTO `skills_skill_attack` (`id`, `skill_id`, `affectedProperty`, `allowEffectBelowZero`, `hitDamage`, `applyDirectDamage`, `attackProperties`, `defenseProperties`, `aimProperties`, `dodgeProperties`, `dodgeFullEnabled`, `dodgeOverAimSuccess`, `damageAffected`, `criticalAffected`) VALUES
	(1, 1, 'stats/hp', 0, 3, 0, 'stats/atk,stats/stamina,stats/speed', 'stats/def,stats/stamina,stats/speed', 'stats/aim', 'stats/dodge', 1, 2, 0, 0),
	(2, 2, 'stats/hp', 0, 5, 0, 'stats/atk,stats/stamina,stats/speed', 'stats/def,stats/stamina,stats/speed', 'stats/aim', 'stats/dodge', 1, 2, 0, 0);
/*!40000 ALTER TABLE `skills_skill_attack` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_group_relation
CREATE TABLE IF NOT EXISTS `skills_skill_group_relation` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int(11) unsigned NOT NULL,
  `group_id` int(11) unsigned NOT NULL,
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
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int(11) unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` varchar(50) COLLATE utf32_unicode_ci NOT NULL COMMENT 'eq,ne,lt,gt,le,ge',
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `skill_id` (`skill_id`),
  CONSTRAINT `FK_skills_skill_owner_conditions_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf32 COLLATE=utf32_unicode_ci;

-- Dumping data for table reldens.skills_skill_owner_conditions: ~1 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_owner_conditions` DISABLE KEYS */;
INSERT INTO `skills_skill_owner_conditions` (`id`, `skill_id`, `key`, `property_key`, `operation`, `value`) VALUES
	(1, 1, 'available_mp', 'stats/mp', 'ge', '5');
/*!40000 ALTER TABLE `skills_skill_owner_conditions` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_owner_effects
CREATE TABLE IF NOT EXISTS `skills_skill_owner_effects` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int(11) unsigned NOT NULL,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `operation` int(11) NOT NULL,
  `value` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `minValue` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `maxValue` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `minProperty` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `maxProperty` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `skill_id` (`skill_id`) USING BTREE,
  CONSTRAINT `FK_skills_skill_owner_effects_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Modifiers table.';

-- Dumping data for table reldens.skills_skill_owner_effects: ~1 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_owner_effects` DISABLE KEYS */;
INSERT INTO `skills_skill_owner_effects` (`id`, `skill_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES
	(1, 1, 'dec_mp', 'stats/mp', 2, '5', '0', '', NULL, NULL);
/*!40000 ALTER TABLE `skills_skill_owner_effects` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_owner_effects_conditions
CREATE TABLE IF NOT EXISTS `skills_skill_owner_effects_conditions` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `skill_owner_effect_id` int(11) unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` varchar(50) COLLATE utf32_unicode_ci NOT NULL COMMENT 'eq,ne,lt,gt,le,ge',
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
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int(11) unsigned NOT NULL,
  `magnitude` int(11) unsigned NOT NULL,
  `objectWidth` int(11) unsigned NOT NULL,
  `objectHeight` int(11) unsigned NOT NULL,
  `validateTargetOnHit` int(1) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `attack_skill_id` (`skill_id`) USING BTREE,
  CONSTRAINT `FK_skills_skill_physical_data_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.skills_skill_physical_data: ~0 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_physical_data` DISABLE KEYS */;
INSERT INTO `skills_skill_physical_data` (`id`, `skill_id`, `magnitude`, `objectWidth`, `objectHeight`, `validateTargetOnHit`) VALUES
	(1, 1, 350, 5, 5, 0);
/*!40000 ALTER TABLE `skills_skill_physical_data` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_target_effects
CREATE TABLE IF NOT EXISTS `skills_skill_target_effects` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int(11) unsigned NOT NULL,
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `operation` int(11) unsigned NOT NULL,
  `value` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `minValue` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `maxValue` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `minProperty` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `maxProperty` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `skill_id` (`skill_id`) USING BTREE,
  CONSTRAINT `FK_skills_skill_effect_modifiers` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Modifiers table.';

-- Dumping data for table reldens.skills_skill_target_effects: ~0 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_target_effects` DISABLE KEYS */;
/*!40000 ALTER TABLE `skills_skill_target_effects` ENABLE KEYS */;

-- Dumping structure for table reldens.skills_skill_target_effects_conditions
CREATE TABLE IF NOT EXISTS `skills_skill_target_effects_conditions` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `skill_target_effect_id` int(11) unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `property_key` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `operation` varchar(50) COLLATE utf32_unicode_ci NOT NULL COMMENT 'eq,ne,lt,gt,le,ge',
  `value` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `skill_target_effect_id` (`skill_target_effect_id`) USING BTREE,
  CONSTRAINT `FK_skills_skill_target_effects_conditions_skill_target_effects` FOREIGN KEY (`skill_target_effect_id`) REFERENCES `skills_skill_target_effects` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf32 COLLATE=utf32_unicode_ci;

-- Dumping data for table reldens.skills_skill_target_effects_conditions: ~0 rows (approximately)
/*!40000 ALTER TABLE `skills_skill_target_effects_conditions` DISABLE KEYS */;
/*!40000 ALTER TABLE `skills_skill_target_effects_conditions` ENABLE KEYS */;

-- Dumping structure for table reldens.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `username` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `role_id` int(10) unsigned NOT NULL,
  `status` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.users: ~4 rows (approximately)
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` (`id`, `email`, `username`, `password`, `role_id`, `status`, `created_at`, `updated_at`) VALUES
	(29, 'dap@dap.com', 'dap', '$2b$10$PQIYGBFyA/69DaowJVTA5ufVWmIUeIOwIK4e6JCAP5Uen0sp0TAHu', 1, '1595011283764', '2019-08-02 23:06:14', '2020-10-14 16:31:27'),
	(30, 'dap2@dap.com', 'dap2', '$2b$10$Kvjh1XdsMai8Xt2wdivG2.prYvTiW6vJrdnrNPYZenf8qCRLhuZ/a', 9, '1', '2019-08-02 23:06:14', '2020-09-06 22:10:55'),
	(31, 'dap3@dap.com', 'dap3', '$2b$10$CmtWkhIexIVtcBjwsmEkeOlIhqizViykDFYAKtVrl4sF8KWLuBsxO', 1, '1', '2019-08-02 23:06:14', '2020-07-12 19:46:17'),
	(45, 'damian.pastorini@gmail.com', 'Fire Test', '$2b$10$RtF9w7zAbkL/.CP0UTss6O/TtWQtpr5npoaYmBe2fRokJWfU4skZW', 1, '1', '2020-07-28 21:34:39', '2020-10-11 19:45:13');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
