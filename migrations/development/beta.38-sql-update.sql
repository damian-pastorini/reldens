--

SET FOREIGN_KEY_CHECKS = 0;

--

-- Config:
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'scores/obtainedScorePerPlayer', '10', 2);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'scores/obtainedScorePerNpc', '5', 2);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'scores/useNpcCustomScore', '1', 3);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'scores/fullTableView/enabled', '1', 3);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/scores/enabled', '1', 3);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/scores/responsiveX', '100', 2);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/scores/responsiveY', '0', 2);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/scores/x', '430', 2);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/scores/y', '150', 2);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'rewards/loginReward/enabled', '1', 3);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'rewards/playedTimeReward/enabled', '1', 3);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'rewards/playedTimeReward/time', '30000', 3);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/rewards/enabled', '1', 3);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/rewards/responsiveX', '100', 2);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/rewards/responsiveY', '0', 2);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/rewards/x', '430', 2);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/rewards/y', '200', 2);
UPDATE `config` SET `value` = '240' WHERE `scope` = 'client' AND `path` = 'ui/minimap/camX';
UPDATE `config` SET `value` = '42' WHERE `scope` = 'client' AND `path` = 'ui/minimap/responsiveX';
UPDATE `config` SET `value` = '330' WHERE `scope` = 'client' AND `path` = 'ui/minimap/x';
UPDATE `config` SET `value` = '320' WHERE `scope` = 'client' AND `path` = 'ui/minimap/circleX';

-- Features:
INSERT INTO `features` (`code`, `title`, `is_enabled`) VALUES ('scores', 'Scores', 1);

-- Scores:
CREATE TABLE IF NOT EXISTS `scores` (
	`id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
	`player_id` INT UNSIGNED NOT NULL,
	`total_score` INT UNSIGNED NOT NULL,
	`players_kills_count` INT UNSIGNED NOT NULL,
	`npcs_kills_count` INT UNSIGNED NOT NULL,
	`last_player_kill_time` DATETIME DEFAULT NULL,
	`last_npc_kill_time` DATETIME DEFAULT NULL,
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `player_id` (`player_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `scores_detail` (
	`id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
	`player_id` INT UNSIGNED NOT NULL,
	`obtained_score` INT UNSIGNED NOT NULL,
	`kill_time` DATETIME NOT NULL,
	`kill_player_id` INT UNSIGNED NULL DEFAULT NULL,
	`kill_npc_id` INT UNSIGNED NULL DEFAULT NULL,
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `player_id` (`player_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

-- Login:
ALTER TABLE `users` ADD COLUMN `login_count` INT NOT NULL DEFAULT '0' AFTER `played_time`;

CREATE TABLE IF NOT EXISTS `users_login` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `login_date` TIMESTAMP NOT NULL DEFAULT (now()),
    `logout_date` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`) USING BTREE,
    INDEX `user_id` (`user_id`) USING BTREE,
    CONSTRAINT `FK_users_login_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

-- Rewards Events:
CREATE TABLE IF NOT EXISTS `rewards_events` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
    `description` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_unicode_ci',
    `handler_key` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
    `event_key` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
    `event_data` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
    `position` INT UNSIGNED NOT NULL DEFAULT '0',
    `enabled` TINYINT NOT NULL DEFAULT '0',
    `active_from` DATETIME NULL DEFAULT NULL,
    `active_to` DATETIME NULL DEFAULT NULL,
    PRIMARY KEY (`id`) USING BTREE,
    INDEX `event_key` (`event_key`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

CREATE TABLE IF NOT EXISTS `rewards_events_state` (
	`id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `rewards_events_id` INT UNSIGNED NOT NULL,
    `player_id` INT UNSIGNED NOT NULL,
    `state` TEXT NULL DEFAULT NULL COLLATE 'utf8mb4_unicode_ci',
    PRIMARY KEY (`id`) USING BTREE,
    INDEX `rewards_events_id` (`rewards_events_id`) USING BTREE,
    INDEX `user_id` (`player_id`) USING BTREE,
    CONSTRAINT `FK_rewards_events_state_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT `FK__rewards_events` FOREIGN KEY (`rewards_events_id`) REFERENCES `rewards_events` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE='utf8mb4_unicode_ci';

REPLACE INTO `rewards_events` (`id`, `label`, `description`, `handler_key`, `event_key`, `event_data`, `position`, `enabled`, `active_from`, `active_to`) VALUES
    (1, 'rewards.dailyLogin', 'rewards.dailyDescription', 'login', 'reldens.joinRoomEnd', '{"action":"dailyLogin","items":{"coins":1}}', 0, 1, NULL, NULL),
    (2, 'rewards.straightDaysLogin', 'rewards.straightDaysDescription', 'login', 'reldens.joinRoomEnd', '{"action":"straightDaysLogin","days":2,"items":{"coins":10}}', 0, 1, NULL, NULL);

-- Bots Test Rooms:
INSERT INTO `rooms` (`id`,`name`, `title`, `map_filename`, `scene_images`, `room_class_key`, `customData`) VALUES
    (9, 'reldens-bots-forest', 'Bots Forest', 'reldens-bots-forest.json', 'reldens-bots-forest.png', NULL, '{"allowGuest":true,"joinInRandomPlace":true}'),
    (10, 'reldens-bots-forest-house-01-n0', 'Bots Forest - House 1-0', 'reldens-bots-forest-house-01-n0.json', 'reldens-bots-forest-house-01-n0.png', NULL, '{"allowGuest":true}');

INSERT INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES
    (NULL, 9, 20349, 10),
    (NULL, 10, 381, 9),
    (NULL, 10, 382, 9);

INSERT INTO `rooms_return_points` (`id`, `room_id`, `direction`, `x`, `y`, `is_default`, `from_room_id`) VALUES
    (NULL, 9, 'down', 4608, 960, 0, 9),
    (NULL, 9, 'down', 1600, 4544, 0, 10),
    (NULL, 10, 'up', 64, 544, 1, 9);

INSERT INTO `objects` (`id`, `room_id`, `layer_name`, `tile_index`, `class_type`, `object_class_key`, `client_key`, `title`, `private_params`, `client_params`, `enabled`) VALUES
	(14, 9, 'ground-respawn-area', NULL, 7, 'enemy_bot_b1', 'enemy_forest_1', 'Tree', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true}', '{"autoStart":true}', 0),
	(15, 9, 'ground-respawn-area', NULL, 7, 'enemy_bot_b2', 'enemy_forest_2', 'Tree Punch', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":180}', '{"autoStart":true}', 0);

INSERT INTO `objects_assets` (`object_asset_id`, `object_id`, `asset_type`, `asset_key`, `asset_file`, `extra_params`) VALUES
	(12, 14, 'spritesheet', 'enemy_forest_1', 'monster-treant.png', '{"frameWidth":47,"frameHeight":50}'),
    (13, 15, 'spritesheet', 'enemy_forest_2', 'monster-golem2.png', '{"frameWidth":47,"frameHeight":50}');

REPLACE INTO `objects_stats` (`id`, `object_id`, `stat_id`, `base_value`, `value`) VALUES
	(1, 2, 1, 50, 50),
    (2, 2, 2, 50, 50),
    (3, 2, 3, 50, 50),
    (4, 2, 4, 50, 50),
    (5, 2, 5, 50, 50),
    (6, 2, 6, 50, 50),
    (7, 2, 7, 50, 50),
    (8, 2, 8, 50, 50),
    (9, 2, 9, 50, 50),
    (10, 2, 10, 50, 50),
    (11, 3, 1, 50, 50),
    (12, 3, 2, 50, 50),
    (13, 3, 3, 50, 50),
    (14, 3, 4, 50, 50),
    (15, 3, 5, 50, 50),
    (16, 3, 6, 50, 50),
    (17, 3, 7, 50, 50),
    (18, 3, 8, 50, 50),
    (19, 3, 9, 50, 50),
    (20, 3, 10, 50, 50),
    (21, 6, 1, 50, 50),
    (22, 6, 2, 50, 50),
    (23, 6, 3, 50, 50),
    (24, 6, 4, 50, 50),
    (25, 6, 5, 50, 50),
    (26, 6, 6, 50, 50),
    (27, 6, 7, 50, 50),
    (28, 6, 8, 50, 50),
    (29, 6, 9, 50, 50),
    (30, 6, 10, 50, 50),
    (31, 7, 1, 50, 50),
    (32, 7, 2, 50, 50),
    (33, 7, 3, 50, 50),
    (34, 7, 4, 50, 50),
    (35, 7, 5, 50, 50),
    (36, 7, 6, 50, 50),
    (37, 7, 7, 50, 50),
    (38, 7, 8, 50, 50),
    (39, 7, 9, 50, 50),
    (40, 7, 10, 50, 50),
    (41, 14, 1, 50, 50),
    (42, 14, 2, 50, 50),
    (43, 14, 3, 50, 50),
    (44, 14, 4, 50, 50),
    (45, 14, 5, 50, 50),
    (46, 14, 6, 50, 50),
    (47, 14, 7, 50, 50),
    (48, 14, 8, 50, 50),
    (49, 14, 9, 50, 50),
    (50, 14, 10, 50, 50),
    (51, 15, 1, 50, 50),
    (52, 15, 2, 50, 50),
    (53, 15, 3, 50, 50),
    (54, 15, 4, 50, 50),
    (55, 15, 5, 50, 50),
    (56, 15, 6, 50, 50),
    (57, 15, 7, 50, 50),
    (58, 15, 8, 50, 50),
    (59, 15, 9, 50, 50),
    (60, 15, 10, 50, 50);

INSERT INTO `respawn` (`id`, `object_id`, `respawn_time`, `instances_limit`, `layer`) VALUES
    (5, 14, 20000, 200, 'ground-respawn-area'),
    (6, 15, 10000, 200, 'ground-respawn-area');

--

SET FOREIGN_KEY_CHECKS = 1;

--
