-- Dumping structure for table reldens.scenes
DROP TABLE IF EXISTS `scenes`;
CREATE TABLE IF NOT EXISTS `scenes` (
    `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `scene_map` varchar(255) NOT NULL COMMENT 'The map JSON file name.',
    `scene_images` varchar(255) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `key` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=latin1;

-- Dumping data for table reldens.scenes: ~3 rows (approximately)
/*!40000 ALTER TABLE `scenes` DISABLE KEYS */;
INSERT INTO `scenes` (`id`, `name`, `scene_map`, `scene_images`) VALUES
(2, 'ReldensHouse_1', 'reldens-house-1', 'reldens-house-1'),
(3, 'ReldensHouse_2', 'reldens-house-2', 'reldens-house-2'),
(4, 'ReldensTown', 'reldens-town', 'reldens-town');
/*!40000 ALTER TABLE `scenes` ENABLE KEYS */;

-- Dumping structure for table reldens.scenes_change_points
DROP TABLE IF EXISTS `scenes_change_points`;
CREATE TABLE IF NOT EXISTS `scenes_change_points` (
    `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
    `scene_id` int(11) unsigned NOT NULL,
    `tile_index` int(11) unsigned NOT NULL,
    `next_scene_id` int(11) unsigned NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `id` (`id`),
    KEY `scene_id` (`scene_id`),
    KEY `FK_scenes_change_points_scenes_2` (`next_scene_id`),
    CONSTRAINT `FK_scenes_change_points_scenes` FOREIGN KEY (`scene_id`) REFERENCES `scenes` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `FK_scenes_change_points_scenes_2` FOREIGN KEY (`next_scene_id`) REFERENCES `scenes` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;

-- Dumping data for table reldens.scenes_change_points: ~6 rows (approximately)
/*!40000 ALTER TABLE `scenes_change_points` DISABLE KEYS */;
INSERT INTO `scenes_change_points` (`id`, `scene_id`, `tile_index`, `next_scene_id`) VALUES
(1, 2, 491, 4),
(2, 2, 492, 4),
(3, 3, 187, 4),
(4, 3, 188, 4),
(5, 4, 444, 2),
(6, 4, 951, 3);
/*!40000 ALTER TABLE `scenes_change_points` ENABLE KEYS */;

-- Dumping structure for table reldens.scenes_return_points
DROP TABLE IF EXISTS `scenes_return_points`;
CREATE TABLE IF NOT EXISTS `scenes_return_points` (
    `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
    `scene_id` int(11) unsigned NOT NULL,
    `direction` varchar(5) COLLATE utf8_unicode_ci NOT NULL,
    `x` int(11) unsigned NOT NULL,
    `y` int(11) unsigned NOT NULL,
    `is_default` int(1) unsigned NOT NULL,
    `to_scene_id` int(11) unsigned DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `FK_scenes_return_points_scenes` (`scene_id`),
    KEY `FK_scenes_return_points_scenes_2` (`to_scene_id`),
    CONSTRAINT `FK_scenes_return_points_scenes` FOREIGN KEY (`scene_id`) REFERENCES `scenes` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `FK_scenes_return_points_scenes_2` FOREIGN KEY (`to_scene_id`) REFERENCES `scenes` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table reldens.scenes_return_points: ~3 rows (approximately)
/*!40000 ALTER TABLE `scenes_return_points` DISABLE KEYS */;
INSERT INTO `scenes_return_points` (`id`, `scene_id`, `direction`, `x`, `y`, `is_default`, `to_scene_id`) VALUES
(1, 2, 'up', 400, 470, 1, NULL),
(2, 3, 'up', 190, 430, 1, NULL),
(3, 4, 'down', 400, 345, 1, 2),
(4, 4, 'down', 1274, 670, 0, 3);

ALTER TABLE `users`
    ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `state`,
    ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;
