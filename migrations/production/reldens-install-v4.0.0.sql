#
# Reldens - Installation
#

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

CREATE TABLE IF NOT EXISTS `features` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_enabled` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `config_types` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `label` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `operation_types` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `label` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `target_options` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `target_key` tinyint unsigned NOT NULL,
  `target_label` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `target_key` (`target_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `locale` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `locale` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `language_code` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `country_code` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `enabled` int unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` int unsigned NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `played_time` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `stats` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `base_value` int unsigned NOT NULL,
  `customData` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `key` (`key`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `players` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `FK_players_users` (`user_id`),
  CONSTRAINT `FK_players_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `rooms` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `map_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scene_images` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `room_class_key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customData` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `rooms_return_points` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `room_id` int unsigned NOT NULL,
  `direction` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `x` int unsigned NOT NULL,
  `y` int unsigned NOT NULL,
  `is_default` int unsigned NOT NULL,
  `from_room_id` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_scenes_return_points_rooms` (`room_id`),
  KEY `FK_scenes_return_points_rooms_2` (`from_room_id`) USING BTREE,
  CONSTRAINT `FK_rooms_return_points_rooms_from_room_id` FOREIGN KEY (`from_room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `FK_rooms_return_points_rooms_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `players_state` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `player_id` int unsigned NOT NULL,
  `room_id` int unsigned NOT NULL,
  `x` int unsigned NOT NULL,
  `y` int unsigned NOT NULL,
  `dir` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_player_state_rooms` (`room_id`),
  KEY `FK_player_state_player_stats` (`player_id`),
  CONSTRAINT `FK_player_state_player_stats` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_player_state_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `ads_providers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` int unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `ads_types` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `ads` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_id` int unsigned NOT NULL,
  `type_id` int unsigned NOT NULL,
  `width` int unsigned DEFAULT NULL,
  `height` int unsigned DEFAULT NULL,
  `position` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `ads_banner` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `ads_id` int unsigned NOT NULL,
  `banner_data` text COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ads_id` (`ads_id`),
  CONSTRAINT `FK_ads_banner_ads` FOREIGN KEY (`ads_id`) REFERENCES `ads` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `ads_event_video` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `ads_id` int unsigned NOT NULL,
  `event_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_data` text COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ads_id` (`ads_id`),
  KEY `ad_id` (`ads_id`) USING BTREE,
  KEY `room_id` (`event_key`) USING BTREE,
  CONSTRAINT `FK_ads_scene_change_video_ads` FOREIGN KEY (`ads_id`) REFERENCES `ads` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `audio_categories` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` int NOT NULL DEFAULT '0',
  `single_audio` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_key` (`category_key`),
  UNIQUE KEY `category_label` (`category_label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `audio` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `audio_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `files_name` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `config` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `room_id` int unsigned DEFAULT NULL,
  `category_id` int unsigned DEFAULT NULL,
  `enabled` int unsigned DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `audio_key` (`audio_key`),
  KEY `FK_audio_rooms` (`room_id`),
  KEY `FK_audio_audio_categories` (`category_id`),
  CONSTRAINT `FK_audio_audio_categories` FOREIGN KEY (`category_id`) REFERENCES `audio_categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_audio_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL ON UPDATE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `audio_markers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `audio_id` int unsigned NOT NULL,
  `marker_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start` int unsigned NOT NULL,
  `duration` int unsigned NOT NULL,
  `config` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `audio_id_marker_key` (`audio_id`,`marker_key`),
  KEY `audio_id` (`audio_id`),
  CONSTRAINT `FK_audio_markers_audio` FOREIGN KEY (`audio_id`) REFERENCES `audio` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `chat_message_types` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `show_tab` int unsigned NOT NULL DEFAULT (0),
  `also_show_in_type` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `FK_chat_message_types_chat_message_types` (`also_show_in_type`),
  CONSTRAINT `FK_chat_message_types_chat_message_types` FOREIGN KEY (`also_show_in_type`) REFERENCES `chat_message_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `chat` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `player_id` int unsigned NOT NULL,
  `room_id` int unsigned DEFAULT NULL,
  `message` varchar(140) COLLATE utf8mb4_unicode_ci NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `clan_levels` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` int unsigned NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `required_experience` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `clan` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` int unsigned NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `points` int unsigned NOT NULL DEFAULT '0',
  `level` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `owner_id` (`owner_id`),
  UNIQUE KEY `name` (`name`),
  KEY `FK_clan_clan_levels` (`level`),
  CONSTRAINT `FK_clan_clan_levels` FOREIGN KEY (`level`) REFERENCES `clan_levels` (`key`),
  CONSTRAINT `FK_clan_players` FOREIGN KEY (`owner_id`) REFERENCES `players` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `clan_levels_modifiers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `level_id` int unsigned NOT NULL,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `property_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operation` int unsigned NOT NULL,
  `value` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `minValue` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `maxValue` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `minProperty` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `maxProperty` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `modifier_id` (`key`) USING BTREE,
  KEY `level_key` (`level_id`) USING BTREE,
  KEY `FK_clan_levels_modifiers_operation_types` (`operation`) USING BTREE,
  CONSTRAINT `FK_clan_levels_modifiers_clan_levels` FOREIGN KEY (`level_id`) REFERENCES `clan_levels` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_clan_levels_modifiers_operation_types` FOREIGN KEY (`operation`) REFERENCES `operation_types` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `config` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `scope` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `scope_path` (`scope`,`path`),
  KEY `FK_config_config_types` (`type`),
  CONSTRAINT `FK_config_config_types` FOREIGN KEY (`type`) REFERENCES `config_types` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `items_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `items_group` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `files_name` text COLLATE utf8mb4_unicode_ci,
  `sort` int DEFAULT NULL,
  `items_limit` int NOT NULL DEFAULT '0',
  `limit_per_item` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `items_item` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` int NOT NULL DEFAULT '0',
  `group_id` int unsigned DEFAULT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qty_limit` int NOT NULL DEFAULT '0',
  `uses_limit` int NOT NULL DEFAULT '1',
  `useTimeOut` int DEFAULT NULL,
  `execTimeOut` int DEFAULT NULL,
  `customData` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `key` (`key`),
  KEY `group_id` (`group_id`),
  KEY `type` (`type`),
  CONSTRAINT `FK_items_item_items_group` FOREIGN KEY (`group_id`) REFERENCES `items_group` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_items_item_items_types` FOREIGN KEY (`type`) REFERENCES `items_types` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `items_inventory` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` int unsigned NOT NULL,
  `item_id` int unsigned NOT NULL,
  `qty` int NOT NULL DEFAULT '0',
  `remaining_uses` int DEFAULT NULL,
  `is_active` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_items_inventory_items_item` (`item_id`),
  CONSTRAINT `FK_items_inventory_items_item` FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `items_item_modifiers` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`item_id` INT(10) UNSIGNED NOT NULL,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`property_key` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`operation` INT(10) UNSIGNED NOT NULL,
	`value` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`maxProperty` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `item_id` (`item_id`) USING BTREE,
	INDEX `operation` (`operation`) USING BTREE,
	CONSTRAINT `FK_items_item_modifiers_items_item` FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`) ON UPDATE CASCADE ON DELETE NO ACTION,
	CONSTRAINT `FK_items_item_modifiers_operation_types` FOREIGN KEY (`operation`) REFERENCES `operation_types` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `objects_types` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `objects` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `room_id` int unsigned NOT NULL,
  `layer_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tile_index` int unsigned DEFAULT NULL,
  `class_type` int unsigned DEFAULT NULL,
  `object_class_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_key` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `private_params` text COLLATE utf8mb4_unicode_ci,
  `client_params` text COLLATE utf8mb4_unicode_ci,
  `enabled` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `room_id_layer_name_tile_index` (`room_id`,`layer_name`,`tile_index`),
  KEY `room_id` (`room_id`),
  KEY `object_class_key` (`object_class_key`),
  KEY `class_type` (`class_type`),
  CONSTRAINT `FK_objects_objects_types` FOREIGN KEY (`class_type`) REFERENCES `objects_types` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_objects_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `objects_animations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int unsigned NOT NULL,
  `animationKey` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `animationData` text COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `object_id_animationKey` (`object_id`,`animationKey`),
  KEY `id` (`id`) USING BTREE,
  KEY `object_id` (`object_id`) USING BTREE,
  CONSTRAINT `FK_objects_animations_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `objects_assets` (
	`object_asset_id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`object_id` INT(10) UNSIGNED NOT NULL,
	`asset_type` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`asset_key` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`asset_file` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`extra_params` TEXT NULL DEFAULT NULL COLLATE 'utf8mb4_unicode_ci',
	PRIMARY KEY (`object_asset_id`) USING BTREE,
	INDEX `object_id` (`object_id`) USING BTREE,
	CONSTRAINT `FK_objects_assets_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON UPDATE CASCADE ON DELETE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `objects_items_inventory` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` int unsigned NOT NULL,
  `item_id` int unsigned NOT NULL,
  `qty` int NOT NULL DEFAULT '0',
  `remaining_uses` int DEFAULT NULL,
  `is_active` int DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `FK_items_inventory_items_item` (`item_id`) USING BTREE,
  KEY `FK_objects_items_inventory_objects` (`owner_id`),
  CONSTRAINT `FK_objects_items_inventory_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_objects_items_inventory_objects` FOREIGN KEY (`owner_id`) REFERENCES `objects` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `objects_items_requirements` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int unsigned NOT NULL,
  `item_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `required_item_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `required_quantity` int unsigned NOT NULL DEFAULT '0',
  `auto_remove_requirement` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `FK_objects_items_requirements_objects` (`object_id`),
  KEY `FK_objects_items_requirements_items_item` (`item_key`),
  KEY `FK_objects_items_requirements_items_item_2` (`required_item_key`),
  CONSTRAINT `FK_objects_items_requirements_items_item` FOREIGN KEY (`item_key`) REFERENCES `items_item` (`key`),
  CONSTRAINT `FK_objects_items_requirements_items_item_2` FOREIGN KEY (`required_item_key`) REFERENCES `items_item` (`key`),
  CONSTRAINT `FK_objects_items_requirements_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `objects_items_rewards` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int unsigned NOT NULL,
  `item_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `reward_item_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `reward_quantity` int unsigned NOT NULL DEFAULT '0',
  `reward_item_is_required` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `FK_objects_items_requirements_objects` (`object_id`) USING BTREE,
  KEY `FK_objects_items_rewards_items_item` (`item_key`),
  KEY `FK_objects_items_rewards_items_item_2` (`reward_item_key`),
  CONSTRAINT `FK_objects_items_rewards_items_item` FOREIGN KEY (`item_key`) REFERENCES `items_item` (`key`),
  CONSTRAINT `FK_objects_items_rewards_items_item_2` FOREIGN KEY (`reward_item_key`) REFERENCES `items_item` (`key`),
  CONSTRAINT `objects_items_rewards_ibfk_1` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `rewards_modifiers` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`property_key` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`operation` INT(10) UNSIGNED NOT NULL,
	`value` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`minValue` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_unicode_ci',
	`maxValue` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_unicode_ci',
	`minProperty` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_unicode_ci',
	`maxProperty` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `modifier_id` (`key`) USING BTREE,
	INDEX `operation` (`operation`) USING BTREE,
	CONSTRAINT `FK_rewards_modifiers_operation_types` FOREIGN KEY (`operation`) REFERENCES `operation_types` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `objects_items_rewards_animations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `reward_id` int unsigned NOT NULL,
  `asset_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `extra_params` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `FK_objects_items_rewards_animations_rewards` (`reward_id`) USING BTREE,
  CONSTRAINT `FK_objects_items_rewards_animations_rewards` FOREIGN KEY (`reward_id`) REFERENCES `rewards` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `skills_skill_type` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `key` (`key`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `skills_levels_set` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `autoFillRanges` int unsigned NOT NULL DEFAULT '0',
  `autoFillExperienceMultiplier` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `skills_groups` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `skills_skill` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`type` INT(10) UNSIGNED NOT NULL,
	`autoValidation` INT(10) NOT NULL,
	`skillDelay` INT(10) NOT NULL,
	`castTime` INT(10) NOT NULL,
	`usesLimit` INT(10) NOT NULL DEFAULT '0',
	`range` INT(10) NOT NULL,
	`rangeAutomaticValidation` INT(10) NOT NULL,
	`rangePropertyX` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`rangePropertyY` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`rangeTargetPropertyX` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_unicode_ci',
	`rangeTargetPropertyY` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_unicode_ci',
	`allowSelfTarget` INT(10) NOT NULL,
	`criticalChance` INT(10) NULL DEFAULT NULL,
	`criticalMultiplier` INT(10) NULL DEFAULT NULL,
	`criticalFixedValue` INT(10) NULL DEFAULT NULL,
	`customData` TEXT NULL DEFAULT NULL COLLATE 'utf8mb4_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `key` (`key`) USING BTREE,
	INDEX `FK_skills_skill_skills_skill_type` (`type`) USING BTREE,
	CONSTRAINT `FK_skills_skill_skills_skill_type` FOREIGN KEY (`type`) REFERENCES `skills_skill_type` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `respawn` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int unsigned NOT NULL,
  `respawn_time` int unsigned NOT NULL DEFAULT '0',
  `instances_limit` int unsigned NOT NULL DEFAULT '0',
  `layer` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `respawn_object_id` (`object_id`),
  CONSTRAINT `FK_respawn_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `skills_class_path` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `levels_set_id` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`),
  KEY `levels_set_id` (`levels_set_id`),
  CONSTRAINT `FK_skills_class_path_skills_levels_set` FOREIGN KEY (`levels_set_id`) REFERENCES `skills_levels_set` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `skills_levels` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `key` int unsigned NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `required_experience` bigint unsigned DEFAULT NULL,
  `level_set_id` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key_level_set_id` (`key`,`level_set_id`),
  KEY `level_set_id` (`level_set_id`),
  CONSTRAINT `FK_skills_levels_skills_levels_set` FOREIGN KEY (`level_set_id`) REFERENCES `skills_levels_set` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `skills_class_level_up_animations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `class_path_id` int unsigned DEFAULT NULL,
  `level_id` int unsigned DEFAULT NULL,
  `animationData` text COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `class_path_id_level_id` (`class_path_id`,`level_id`) USING BTREE,
  KEY `FK_skills_class_level_up_skills_levels` (`level_id`) USING BTREE,
  CONSTRAINT `FK_skills_class_level_up_skills_class_path` FOREIGN KEY (`class_path_id`) REFERENCES `skills_class_path` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `FK_skills_class_level_up_skills_levels` FOREIGN KEY (`level_id`) REFERENCES `skills_levels` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `skills_class_path_level_labels` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `class_path_id` int unsigned NOT NULL,
  `level_id` int unsigned NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `class_path_id_level_key` (`class_path_id`,`level_id`) USING BTREE,
  KEY `class_path_id` (`class_path_id`),
  KEY `level_key` (`level_id`) USING BTREE,
  CONSTRAINT `FK__skills_class_path` FOREIGN KEY (`class_path_id`) REFERENCES `skills_class_path` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_skills_class_path_level_labels_skills_levels` FOREIGN KEY (`level_id`) REFERENCES `skills_levels` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `skills_levels_modifiers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `level_id` int unsigned NOT NULL,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `property_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operation` int unsigned NOT NULL,
  `value` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `minValue` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `maxValue` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `minProperty` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `maxProperty` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `modifier_id` (`key`) USING BTREE,
  KEY `level_key` (`level_id`) USING BTREE,
  KEY `FK_skills_levels_modifiers_operation_types` (`operation`),
  CONSTRAINT `FK_skills_levels_modifiers_operation_types` FOREIGN KEY (`operation`) REFERENCES `operation_types` (`key`),
  CONSTRAINT `FK_skills_levels_modifiers_skills_levels` FOREIGN KEY (`level_id`) REFERENCES `skills_levels` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `skills_levels_modifiers_conditions` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`levels_modifier_id` INT(10) UNSIGNED NOT NULL,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`property_key` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`conditional` ENUM('eq','ne','lt','gt','le','ge') NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`value` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `levels_modifier_id` (`levels_modifier_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `skills_owners_class_path` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `class_path_id` int unsigned NOT NULL,
  `owner_id` int unsigned NOT NULL,
  `currentLevel` bigint unsigned NOT NULL DEFAULT '0',
  `currentExp` bigint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `level_set_id` (`class_path_id`) USING BTREE,
  CONSTRAINT `FK_skills_owners_class_path_skills_class_path` FOREIGN KEY (`class_path_id`) REFERENCES `skills_class_path` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `skills_skill_animations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int unsigned NOT NULL,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `classKey` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `animationData` text COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `skill_id_key` (`skill_id`,`key`) USING BTREE,
  KEY `id` (`id`) USING BTREE,
  KEY `key` (`key`) USING BTREE,
  KEY `skill_id` (`skill_id`) USING BTREE,
  CONSTRAINT `FK_skills_skill_animations_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `skills_skill_attack` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int unsigned NOT NULL,
  `affectedProperty` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `allowEffectBelowZero` int unsigned NOT NULL DEFAULT '0',
  `hitDamage` int unsigned NOT NULL,
  `applyDirectDamage` int unsigned NOT NULL DEFAULT '0',
  `attackProperties` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `defenseProperties` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `aimProperties` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `dodgeProperties` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `dodgeFullEnabled` int NOT NULL DEFAULT '1',
  `dodgeOverAimSuccess` int NOT NULL DEFAULT '2',
  `damageAffected` int NOT NULL DEFAULT '0',
  `criticalAffected` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `skill_id` (`skill_id`),
  CONSTRAINT `FK__skills_skill_attack` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `skills_skill_group_relation` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int unsigned NOT NULL,
  `group_id` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `group_id` (`group_id`),
  KEY `skill_id` (`skill_id`),
  CONSTRAINT `FK__skills_groups` FOREIGN KEY (`group_id`) REFERENCES `skills_groups` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK__skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `skills_skill_owner_conditions` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`skill_id` INT(10) UNSIGNED NOT NULL,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`property_key` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`conditional` ENUM('eq','ne','lt','gt','le','ge') NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`value` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `skill_id` (`skill_id`) USING BTREE,
	CONSTRAINT `FK_skills_skill_owner_conditions_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `skills_skill_owner_effects` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int unsigned NOT NULL,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `property_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operation` int unsigned NOT NULL,
  `value` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `minValue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `maxValue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `minProperty` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `maxProperty` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `skill_id` (`skill_id`) USING BTREE,
  KEY `FK_skills_skill_owner_effects_operation_types` (`operation`),
  CONSTRAINT `FK_skills_skill_owner_effects_operation_types` FOREIGN KEY (`operation`) REFERENCES `operation_types` (`key`) ON UPDATE CASCADE,
  CONSTRAINT `FK_skills_skill_owner_effects_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `skills_skill_owner_effects_conditions` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`skill_owner_effect_id` INT(10) UNSIGNED NOT NULL,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`property_key` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`conditional` ENUM('eq','ne','lt','gt','le','ge') NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`value` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `skill_owner_effect_id` (`skill_owner_effect_id`) USING BTREE,
	CONSTRAINT `FK_skills_skill_owner_effects_conditions_skill_owner_effects` FOREIGN KEY (`skill_owner_effect_id`) REFERENCES `skills_skill_owner_effects` (`id`) ON UPDATE CASCADE ON DELETE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `skills_skill_target_effects` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int unsigned NOT NULL,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `property_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operation` int unsigned NOT NULL,
  `value` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `minValue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `maxValue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `minProperty` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `maxProperty` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `skill_id` (`skill_id`) USING BTREE,
  KEY `FK_skills_skill_target_effects_operation_types` (`operation`),
  CONSTRAINT `FK_skills_skill_effect_modifiers` FOREIGN KEY (`skill_id`) REFERENCES `skills_skill` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FK_skills_skill_target_effects_operation_types` FOREIGN KEY (`operation`) REFERENCES `operation_types` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `skills_skill_target_effects_conditions` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`skill_target_effect_id` INT(10) UNSIGNED NOT NULL,
	`key` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`property_key` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`conditional` ENUM('eq','ne','lt','gt','le','ge') NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`value` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `skill_target_effect_id` (`skill_target_effect_id`) USING BTREE,
	CONSTRAINT `FK_skills_skill_target_effects_conditions_skill_target_effects` FOREIGN KEY (`skill_target_effect_id`) REFERENCES `skills_skill_target_effects` (`id`) ON UPDATE CASCADE ON DELETE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `snippets` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `locale_id` int unsigned NOT NULL,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `locale_id` (`locale_id`),
  CONSTRAINT `FK_snippets_locale` FOREIGN KEY (`locale_id`) REFERENCES `locale` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
