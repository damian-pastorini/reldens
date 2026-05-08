--

SET FOREIGN_KEY_CHECKS = 0;

--

-- Update config for trade buttons position
UPDATE `config` SET `value` = '{"decline":{"label":"Decline","value":2},"accept":{"label":"Accept","value":1}}' WHERE `scope` = 'client' AND `path` = 'ui/options/acceptOrDecline';

-- Add test users root2/root3, their players, states and stats

REPLACE INTO `items_item` (`id`, `key`, `type`, `group_id`, `label`, `description`, `qty_limit`, `uses_limit`, `useTimeOut`, `execTimeOut`, `customData`) VALUES
	(4, 'axe', 4, 1, 'Axe', 'A short distance but powerful weapon.', 0, 0, NULL, NULL, '{"canBeDropped":true,"animationData":{"frameWidth":64,"frameHeight":64,"start":6,"end":11,"repeat":0,"destroyOnComplete":true,"usePlayerPosition":true,"followPlayer":true,"startsOnTarget":true}}');

REPLACE INTO `users` (`id`, `email`, `username`, `password`, `role_id`, `status`, `created_at`, `updated_at`, `played_time`) VALUES
	(2, 'root2@yourgame.com', 'root2', '879abc0494b36a09f184fd8308ea18f2643d71263f145b1e40e2ec3546d42202:6a186aff4d69daadcd7940a839856b394b12f0aec64a5df745c83cf9d881dc9dcb121b03d946872571f214228684216df097305b68417a56403299b8b2388db3', 1, '1', '2022-03-17 18:57:44', '2023-10-21 16:51:55', 0),
	(3, 'root3@yourgame.com', 'root3', '879abc0494b36a09f184fd8308ea18f2643d71263f145b1e40e2ec3546d42202:6a186aff4d69daadcd7940a839856b394b12f0aec64a5df745c83cf9d881dc9dcb121b03d946872571f214228684216df097305b68417a56403299b8b2388db3', 1, '1', '2022-03-17 18:57:44', '2023-10-21 16:51:55', 0);

REPLACE INTO `users_locale` (`id`, `locale_id`, `user_id`) VALUES
	(2, 1, 2),
	(3, 1, 3);

REPLACE INTO `players` (`id`, `user_id`, `name`, `created_at`) VALUES
	(2, 2, 'ImRoot2', '2022-03-17 19:57:50'),
	(3, 3, 'ImRoot3', '2022-03-17 19:57:50');

REPLACE INTO `players_state` (`id`, `player_id`, `room_id`, `x`, `y`, `dir`) VALUES
	(2, 2, 4, 400, 345, 'down'),
	(3, 3, 4, 400, 345, 'down');

REPLACE INTO `players_stats` (`id`, `player_id`, `stat_id`, `base_value`, `value`) VALUES
	(11, 2, 1, 280, 280),
	(12, 2, 2, 280, 280),
	(13, 2, 3, 280, 280),
	(14, 2, 4, 280, 280),
	(15, 2, 5, 100, 100),
	(16, 2, 6, 100, 100),
	(17, 2, 7, 100, 100),
	(18, 2, 8, 100, 100),
	(19, 2, 9, 100, 100),
	(20, 2, 10, 100, 100),
	(21, 3, 1, 280, 280),
	(22, 3, 2, 280, 280),
	(23, 3, 3, 280, 280),
	(24, 3, 4, 280, 280),
	(25, 3, 5, 100, 100),
	(26, 3, 6, 100, 100),
	(27, 3, 7, 100, 100),
	(28, 3, 8, 100, 100),
	(29, 3, 9, 100, 100),
	(30, 3, 10, 100, 100);

CREATE TABLE IF NOT EXISTS `quests_progress` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `player_id` INT UNSIGNED NULL DEFAULT NULL,
    `quest_key` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `customData` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

REPLACE INTO `items_item` (`id`, `key`, `type`, `group_id`, `label`, `description`, `qty_limit`, `uses_limit`, `useTimeOut`, `execTimeOut`, `customData`) VALUES
	(7, 'ore', 3, NULL, 'Ore', 'A chunk of raw ore.', 0, 0, NULL, NULL, '{}'),
	(8, 'fish', 2, NULL, 'Fish', 'A fish.', 0, 0, NULL, NULL, '{"removeAfterUse":true}');

REPLACE INTO `items_item_modifiers` (`id`, `item_id`, `key`, `property_key`, `operation`, `value`, `maxProperty`) VALUES
	(5, 8, 'fish', 'stats/hp', 1, '10', 'statsBase/hp');

REPLACE INTO `objects_items_rewards` (`id`, `object_id`, `item_key`, `reward_item_key`, `reward_quantity`, `reward_item_is_required`) VALUES
	(6, 10, 'ore', 'coins', 1, 0);

UPDATE `objects` SET
	`layer_name` = 'respawn-area-mining-rocks',
	`tile_index` = NULL,
	`class_type` = 7,
	`object_class_key` = 'rock_forest_1_area',
	`private_params` = '{"shouldRespawn":true,"childObjectClassKey":"rock_forest_1","itemKey":"ore","cancelOnMove":true,"cancelOnOutOfRange":false,"runOnAction":true,"collisionType":2,"hasState":true}',
	`client_params` = '{"timingDuration":5000,"isInteractive":true,"frameStart":0,"frameEnd":0,"classKey":"rock_forest_1","ui":false}',
	`enabled` = 1
WHERE `id` = 16;

REPLACE INTO `objects_types` (`id`, `key`) VALUES (8, 'timing');

UPDATE `objects` SET `class_type` = 8, `client_params` = '{"timingDuration":10000,"isInteractive":true,"frameStart":0,"frameEnd":2,"autoStart":true,"repeat":-1,"classKey":"fish_spawn_forest_1","ui":false}', `private_params` = '{"cancelOnMove":true,"cancelOnOutOfRange":false,"rewards":[{"key":"fish","rate":100}],"runOnAction":true,"fishCooldown":3000,"collisionType":2}' WHERE `id` = 17;

REPLACE INTO `objects_assets` (`object_asset_id`, `object_id`, `asset_type`, `asset_key`, `asset_file`, `extra_params`) VALUES
	(14, 16, 'spritesheet', 'rock_forest_1', 'rock.png', '{"frameWidth":32,"frameHeight":32}'),
	(15, 17, 'spritesheet', 'fish_spawn_forest_1', 'fish-spawn.png', '{"frameWidth":32,"frameHeight":32}'),
	(16, 18, 'spritesheet', 'chest_forest_1', 'chest.png', '{"frameWidth":32,"frameHeight":32}');

REPLACE INTO `respawn` (`id`, `object_id`, `respawn_time`, `instances_limit`, `layer`) VALUES
	(7, 16, 30000, 1, 'respawn-area-mining-rocks');

-- Add collisionType to all NPC objects so players cannot walk through them
UPDATE `objects` SET `private_params` = '{"runOnAction":true,"playerVisible":true,"collisionType":2}' WHERE `id` = 5;
UPDATE `objects` SET `private_params` = '{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true,"collisionType":2}' WHERE `id` IN (8, 10, 12, 13);

--

SET FOREIGN_KEY_CHECKS = 1;

--
