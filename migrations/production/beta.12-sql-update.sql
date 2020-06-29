/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;

# config values:

UPDATE `config` SET `value`='140' WHERE  `path`='objects/actions/interactionsDistance';

UPDATE `config` SET `value`='100' WHERE  `path`='players/initialStats/atk';
UPDATE `config` SET `value`='100' WHERE  `path`='players/initialStats/def';
UPDATE `config` SET `value`='100' WHERE  `path`='enemies/initialStats/atk';
UPDATE `config` SET `value`='100' WHERE  `path`='enemies/initialStats/def';

UPDATE `config` SET `path`='ui/uiChat/x' WHERE `path`='chat/position/x';
UPDATE `config` SET `path`='ui/uiChat/y' WHERE `path`='chat/position/y';

UPDATE `config` SET `value`='430' WHERE  `path`='ui/playerStats/x';
UPDATE `config` SET `value`='20' WHERE  `path`='ui/playerStats/y';

INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/screen/responsive', '1', 'b');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/uiTarget/responsiveY', '0', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/uiTarget/responsiveX', '0', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/inventory/enabled', '1', 'b');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/inventory/x', '380', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/inventory/y', '450', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/inventory/responsiveY', '0', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/inventory/responsiveX', '100', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/equipment/enabled', '1', 'b');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/equipment/x', '430', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/equipment/y', '90', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/equipment/responsiveY', '0', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/equipment/responsiveX', '100', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/uiLifeBar/responsiveY', '0', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/uiLifeBar/responsiveX', '40', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/sceneLabel/responsiveY', '0', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/sceneLabel/responsiveX', '50', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/playerStats/responsiveY', '0', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/playerStats/responsiveX', '100', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/playerName/responsiveY', '0', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/playerName/responsiveX', '0', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/controls/responsiveY', '100', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/controls/responsiveX', '0', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/chat/responsiveY', '100', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/chat/responsiveX', '100', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/chat/enabled', '1', 'b');

INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/npcDialog/x', '120', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/npcDialog/y', '100', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/npcDialog/responsiveX', '10', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/npcDialog/responsiveY', '10', 'i');

INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/maximum/x', '1280', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/maximum/y', '720', 'i');

# player stats update:

UPDATE players_stats SET atk=100, def=100;

# new objects:

/*!40000 ALTER TABLE `objects` DISABLE KEYS */;
INSERT INTO `objects` (`id`, `room_id`, `layer_name`, `tile_index`, `object_class_key`, `client_key`, `title`, `private_params`, `client_params`, `enabled`) VALUES
	(10, 4, 'house-collisions-over-player', 560, 'npc_3', 'merchant_1', 'Gimly', NULL, NULL, 1),
	(12, 4, 'house-collisions-over-player', 562, 'npc_4', 'weapons_master_1', 'Barrik', NULL, NULL, 1);
/*!40000 ALTER TABLE `objects` ENABLE KEYS */;

/*!40000 ALTER TABLE `objects_assets` DISABLE KEYS */;
INSERT INTO `objects_assets` (`object_asset_id`, `object_id`, `asset_type`, `asset_key`, `file_1`, `file_2`, `extra_params`) VALUES
	(7, 10, 'spritesheet', 'merchant_1', 'people-d-x2', NULL, '{"frameWidth":52,"frameHeight":71}'),
	(8, 12, 'spritesheet', 'weapons_master_1', 'people-c-x2', NULL, '{"frameWidth":52,"frameHeight":71}');
/*!40000 ALTER TABLE `objects_assets` ENABLE KEYS */;

# inventory first deploy:

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
) ENGINE=InnoDB AUTO_INCREMENT=97 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Inventory table is to save the items for each owner.';

-- Dumping data for table reldens.items_inventory: ~10 rows (approximately)
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
	(95, 2, 4, 1, 0, 1),
	(96, 2, 5, 1, 0, 0);
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='List of all available items in the system.';

-- Dumping data for table reldens.items_item: ~5 rows (approximately)
/*!40000 ALTER TABLE `items_item` DISABLE KEYS */;
INSERT INTO `items_item` (`id`, `key`, `group_id`, `label`, `description`, `qty_limit`, `uses_limit`, `useTimeOut`, `execTimeOut`) VALUES
	(1, 'coins', NULL, 'Coins', NULL, 0, 1, NULL, NULL),
	(2, 'branch', NULL, 'Tree branch', 'An useless tree branch (for now)', 0, 1, NULL, NULL),
	(3, 'heal_potion_20', NULL, 'Heal Potion', 'A heal potion that will restore 20 HP.', 0, 1, NULL, NULL),
	(4, 'axe', 1, 'Axe', 'A short distance but powerful weapon.', 0, 0, NULL, NULL),
	(5, 'spear', 1, 'Spear', 'A short distance but powerful weapon.', 0, 0, NULL, NULL);
/*!40000 ALTER TABLE `items_item` ENABLE KEYS */;

-- Dumping structure for table reldens.items_item_modifiers
CREATE TABLE IF NOT EXISTS `items_item_modifiers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `item_id` int(11) NOT NULL,
  `property_key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `operation` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `value` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `FK_items_item_modifiers_items_item` FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='Modifiers is the way we will affect the item owner.';

-- Dumping data for table reldens.items_item_modifiers: ~0 rows (approximately)
/*!40000 ALTER TABLE `items_item_modifiers` DISABLE KEYS */;
/*!40000 ALTER TABLE `items_item_modifiers` ENABLE KEYS */;

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
