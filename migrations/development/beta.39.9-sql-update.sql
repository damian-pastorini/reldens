--

SET FOREIGN_KEY_CHECKS = 0;

--

-- Update config for trade buttons position
UPDATE `config` SET `value` = '{"decline":{"label":"Decline","value":2},"accept":{"label":"Accept","value":1}}' WHERE `scope` = 'client' AND `path` = 'ui/options/acceptOrDecline';

-- Bigger minimap circle for the simplified minimap image
UPDATE `config` SET `value` = '100' WHERE `scope` = 'client' AND `path` = 'ui/minimap/circleRadio';
UPDATE `config` SET `value` = '0.08' WHERE `scope` = 'client' AND `path` = 'ui/minimap/camZoom';

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
	(2, 2, 41, 1520, 1424, 'down'),
	(3, 3, 41, 1520, 1424, 'down');

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

REPLACE INTO `skills_owners_class_path` (`id`, `class_path_id`, `owner_id`, `currentLevel`, `currentExp`) VALUES
	(2, 1, 2, 1, 0),
	(3, 1, 3, 1, 0);

REPLACE INTO `items_inventory` (`id`, `owner_id`, `item_id`, `qty`, `remaining_uses`, `is_active`) VALUES
	(3, 2, 4, 1, NULL, 0),
	(4, 2, 3, 5, NULL, NULL),
	(5, 3, 4, 1, NULL, 0),
	(6, 3, 3, 5, NULL, NULL);

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
	`private_params` = '{"shouldRespawn":true,"childObjectClassKey":"rock_forest_1","itemKey":"ore","cancelOnMove":true,"cancelOnHit":true,"cancelOnOutOfRange":false,"runOnAction":true,"collisionType":2,"hasState":true,"interactionArea":48}',
	`client_params` = '{"timingDuration":5000,"isInteractive":true,"frameStart":0,"frameEnd":0,"classKey":"rock_forest_1","ui":false}',
	`enabled` = 1
WHERE `id` = 16;

REPLACE INTO `objects_types` (`id`, `key`) VALUES (8, 'timing');

UPDATE `objects` SET `class_type` = 8, `client_params` = '{"timingDuration":10000,"isInteractive":true,"frameStart":0,"frameEnd":2,"autoStart":true,"repeat":-1,"classKey":"fish_spawn_forest_1","ui":false}', `private_params` = '{"cancelOnMove":true,"cancelOnHit":true,"cancelOnOutOfRange":false,"rewards":[{"key":"fish","rate":100}],"runOnAction":true,"fishCooldown":3000,"collisionType":2}' WHERE `id` = 17;

REPLACE INTO `objects_assets` (`object_asset_id`, `object_id`, `asset_type`, `asset_key`, `asset_file`, `extra_params`) VALUES
	(14, 16, 'spritesheet', 'rock_forest_1', 'rock.png', '{"frameWidth":32,"frameHeight":32}'),
	(15, 17, 'spritesheet', 'fish_spawn_forest_1', 'fish-spawn.png', '{"frameWidth":32,"frameHeight":32}'),
	(16, 18, 'spritesheet', 'chest_forest_1', 'chest.png', '{"frameWidth":32,"frameHeight":32}');

REPLACE INTO `respawn` (`id`, `object_id`, `respawn_time`, `instances_limit`, `layer`) VALUES
	(7, 16, 30000, 1, 'respawn-area-mining-rocks');

-- Add collisionType to all NPC objects so players cannot walk through them
UPDATE `objects` SET `private_params` = '{"runOnAction":true,"playerVisible":true,"collisionType":2}' WHERE `id` = 5;
UPDATE `objects` SET `private_params` = '{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true,"collisionType":2}' WHERE `id` IN (8, 10, 12, 13);

-- Keep the chat history when a room is deleted: unlink it instead of cascading.
-- The chat player_id and private_player_id FKs already use SET NULL, room_id was the only one destroying rows.
ALTER TABLE `chat` DROP FOREIGN KEY `FK__scenes`;
ALTER TABLE `chat` ADD CONSTRAINT `FK__scenes` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `players_state` DROP FOREIGN KEY `FK_player_state_rooms`;
ALTER TABLE `players_state` MODIFY `room_id` INT UNSIGNED NULL DEFAULT NULL;
ALTER TABLE `players_state` ADD CONSTRAINT `FK_player_state_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE ON DELETE SET NULL;

-- The audio room FK was unlinking on room id updates too, only the delete should unlink.
ALTER TABLE `audio` DROP FOREIGN KEY `FK_audio_rooms`;
ALTER TABLE `audio` ADD CONSTRAINT `FK_audio_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Allow objects to survive room deletion: nullable room_id with SET NULL (this FK was blocking room deletion)
ALTER TABLE `objects` DROP FOREIGN KEY `FK_objects_rooms`;
ALTER TABLE `objects` MODIFY `room_id` INT UNSIGNED NULL DEFAULT NULL;
ALTER TABLE `objects` ADD CONSTRAINT `FK_objects_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE ON DELETE SET NULL;

-- Cascade player deletes to player-owned runtime data (these FKs were blocking player deletion)
ALTER TABLE `players_state` DROP FOREIGN KEY `FK_player_state_player_stats`;
ALTER TABLE `players_state` ADD CONSTRAINT `FK_player_state_player_stats` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE `players_stats` DROP FOREIGN KEY `FK_player_current_stats_players`;
ALTER TABLE `players_stats` ADD CONSTRAINT `FK_player_current_stats_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ads_played` DROP FOREIGN KEY `FK_ads_played_players`;
ALTER TABLE `ads_played` ADD CONSTRAINT `FK_ads_played_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `audio_player_config` DROP FOREIGN KEY `FK_audio_player_config_players`;
ALTER TABLE `audio_player_config` ADD CONSTRAINT `FK_audio_player_config_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `clan_members` DROP FOREIGN KEY `FK_clan_members_players`;
ALTER TABLE `clan_members` ADD CONSTRAINT `FK_clan_members_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `items_inventory` DROP FOREIGN KEY `FK_items_inventory_players`;
ALTER TABLE `items_inventory` ADD CONSTRAINT `FK_items_inventory_players` FOREIGN KEY (`owner_id`) REFERENCES `players` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE `skills_owners_class_path` DROP FOREIGN KEY `FK_skills_owners_class_path_players`;
ALTER TABLE `skills_owners_class_path` ADD CONSTRAINT `FK_skills_owners_class_path_players` FOREIGN KEY (`owner_id`) REFERENCES `players` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE `rewards_events_state` DROP FOREIGN KEY `FK_rewards_events_state_players`;
ALTER TABLE `rewards_events_state` ADD CONSTRAINT `FK_rewards_events_state_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep chat history when a player is deleted: nullable author/recipient with SET NULL
ALTER TABLE `chat` MODIFY `player_id` INT UNSIGNED NULL DEFAULT NULL;
ALTER TABLE `chat` DROP FOREIGN KEY `FK__players`;
ALTER TABLE `chat` ADD CONSTRAINT `FK__players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `chat` DROP FOREIGN KEY `FK__players_2`;
ALTER TABLE `chat` ADD CONSTRAINT `FK__players_2` FOREIGN KEY (`private_player_id`) REFERENCES `players` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Rooms deletion behavior: notify and close the live room after the configured time when its record is deleted
INSERT IGNORE INTO `config` (`scope`, `path`, `value`, `type`) VALUES
	('server', 'rooms/deletion/closeActiveRoomsEnabled', '1', 3),
	('server', 'rooms/deletion/closeActiveRoomsSeconds', '10', 2),
	('server', 'rooms/deletion/closeActiveRoomsWarningSeconds', '5', 2),
	('server', 'rooms/deletion/setDefault', '1', 3);

-- Security: persisted address allow and deny lists, the temporary blocks of the login attempts lockout are stored
-- here with an expiration so they survive a server restart
CREATE TABLE IF NOT EXISTS `ip_lists` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `address` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `list_type` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'deny',
    `reason` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `expires_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`) USING BTREE,
    UNIQUE KEY `address_list_type` (`address`, `list_type`) USING BTREE,
    KEY `list_type` (`list_type`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Security: last reset password email sent per user, so the forgot password interval is shared by every server and
-- survives a restart
SET @addPasswordResetSentAt = (
    SELECT IF(
        0 = COUNT(*),
        'ALTER TABLE `users` ADD COLUMN `password_reset_sent_at` TIMESTAMP NULL DEFAULT NULL AFTER `login_count`',
        'SELECT 1'
    )
    FROM `information_schema`.`COLUMNS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'users' AND `COLUMN_NAME` = 'password_reset_sent_at'
);
PREPARE addPasswordResetSentAtStatement FROM @addPasswordResetSentAt;
EXECUTE addPasswordResetSentAtStatement;
DEALLOCATE PREPARE addPasswordResetSentAtStatement;

-- Users: the registration origin of each account (registration, guest, firebase or admin), the existing guests get the
-- guest origin and every other existing account keeps the registration default
SET @addUsersOrigin = (
    SELECT IF(
        0 = COUNT(*),
        'ALTER TABLE `users` ADD COLUMN `origin` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''registration'' AFTER `password_reset_sent_at`',
        'SELECT 1'
    )
    FROM `information_schema`.`COLUMNS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'users' AND `COLUMN_NAME` = 'origin'
);
PREPARE addUsersOriginStatement FROM @addUsersOrigin;
EXECUTE addUsersOriginStatement;
DEALLOCATE PREPARE addUsersOriginStatement;
UPDATE `users` SET `origin` = 'guest' WHERE `origin` = 'registration' AND `role_id` = (
    SELECT `value` FROM `config` WHERE `scope` = 'server' AND `path` = 'players/guestUser/roleId'
);

-- Security: login attempts lockout, administration panel login limiter and session, CSRF, address lists, game
-- login throttle, registration and guests limits, origin validation, guests cleanup and the password policy
INSERT IGNORE INTO `config` (`scope`, `path`, `value`, `type`) VALUES
	('client', 'players/password/minimumLength', '3', 2),
	('server', 'players/guestUser/cleanupAfterMs', '604800000', 2),
	('server', 'players/guestUser/cleanupEnabled', '0', 3),
	('server', 'players/guestUser/cleanupIntervalMs', '3600000', 2),
	('server', 'rooms/allowRequestsWithoutOrigin', '1', 3),
	('server', 'rooms/maxMessagesPerSecond', '60', 2),
	('server', 'rooms/validateRoomOnServer', '1', 3),
	('server', 'rooms/validateRoomsOriginRequest', '0', 3),
	('server', 'security/adminCsrf/enabled', '1', 3),
	('server', 'security/adminLogin/maxAttempts', '5', 2),
	('server', 'security/adminLogin/windowMs', '900000', 2),
	('server', 'security/adminSession/maxAgeMs', '0', 2),
	('server', 'security/adminSession/sameSite', 'lax', 1),
	('server', 'security/gameLogin/maxJoins', '20', 2),
	('server', 'security/gameLogin/windowMs', '60000', 2),
	('server', 'security/guests/maxPerIp', '20', 2),
	('server', 'security/ipLists/allow', '', 5),
	('server', 'security/ipLists/deny', '', 5),
	('server', 'security/ipLists/enabled', '0', 3),
	('server', 'security/loginAttempts/blockTimeMs', '900000', 2),
	('server', 'security/loginAttempts/enabled', '1', 3),
	('server', 'security/loginAttempts/maxAttempts', '10', 2),
	('server', 'security/registration/maxPerIp', '10', 2);

-- Security: the administration panel CSRF protection is enabled now that every admin form and request sends the token
UPDATE `config` SET `value` = '1' WHERE `scope` = 'server' AND `path` = 'security/adminCsrf/enabled';

-- Security: shared administration panel sessions, so they survive a restart, expire and are shared by every server
CREATE TABLE IF NOT EXISTS `admin_sessions` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `sid` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `data` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `expires` BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (`id`) USING BTREE,
    UNIQUE KEY `sid` (`sid`) USING BTREE,
    KEY `expires` (`expires`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Security: administration sessions expire after one day by default, the scene and feature rooms joins limit, the
-- concurrent password validations limit and the registration username, email and password length policy
UPDATE `config` SET `value` = '86400000'
    WHERE `scope` = 'server' AND `path` = 'security/adminSession/maxAgeMs' AND `value` = '0';
INSERT IGNORE INTO `config` (`scope`, `path`, `value`, `type`) VALUES
	('server', 'security/maxConcurrentPasswordValidations', '8', 2),
	('server', 'security/passwordMaximumLength', '128', 2),
	('server', 'security/registration/emailMaximumLength', '255', 2),
	('server', 'security/registration/usernameMaximumLength', '50', 2),
	('server', 'security/registration/usernameMinimumLength', '3', 2),
	('server', 'security/roomsLogin/maxJoins', '60', 2),
	('server', 'security/roomsLogin/windowMs', '60000', 2);

-- New demo assets: the new age town with its five houses and the six forest levels replace the old town, forest and
-- bots rooms, the enemies get a different monster per level, level skills, random movement and the weather data
-- The rooms below need the new files in the project theme, copy them from the reldens package theme/default before
-- starting the server: assets/maps, assets/custom/sprites, assets/custom/effects, plugins/client-plugin.js and
-- plugins/effects, then run "reldens copyAssetsToDist" to update the dist folder
DELETE FROM `rooms_change_points` WHERE `id` IN (5, 6, 7, 8, 9, 10, 18);
DELETE FROM `rooms_return_points` WHERE `id` IN (1, 2, 3, 4, 5, 6, 7);
DELETE FROM `objects_stats` WHERE `object_id` IN (1, 2, 3, 4);
DELETE FROM `objects_assets` WHERE `object_id` IN (1, 2, 3, 4);
DELETE FROM `respawn` WHERE `id` IN (1, 2);
DELETE FROM `rewards` WHERE `id` IN (1, 2);
DELETE FROM `objects` WHERE `id` IN (1, 2, 3, 4);
UPDATE `players_state` SET `room_id` = 41, `x` = 1520, `y` = 1424, `dir` = 'down';
UPDATE `chat` SET `room_id` = NULL WHERE `room_id` IN (4, 5, 8);
UPDATE `objects` SET `room_id` = NULL WHERE `room_id` IN (4, 5, 8);
UPDATE `audio` SET `room_id` = NULL WHERE `room_id` IN (4, 5, 8);
DELETE FROM `rooms_change_points` WHERE `room_id` IN (4, 5, 8) OR `next_room_id` IN (4, 5, 8);
DELETE FROM `rooms_return_points` WHERE `room_id` IN (4, 5, 8) OR `from_room_id` IN (4, 5, 8);
DELETE FROM `rooms` WHERE `id` IN (4, 5, 8);

UPDATE `config` SET `value` = '41' WHERE `scope` = 'server' AND `path` = 'players/initialState/room_id';
UPDATE `config` SET `value` = '1520' WHERE `scope` = 'server' AND `path` = 'players/initialState/x';
UPDATE `config` SET `value` = '1424' WHERE `scope` = 'server' AND `path` = 'players/initialState/y';

UPDATE `ads_event_video` SET `event_key` = 'reldens.activatedRoom_reldens-new-age-town' WHERE `id` = 1;
UPDATE `ads_event_video` SET `event_key` = 'reldens.activatedRoom_reldens-forest-level-1' WHERE `id` = 2;

REPLACE INTO `rooms` (`id`, `name`, `title`, `map_filename`, `scene_images`, `room_class_key`, `customData`) VALUES
	(2, 'reldens-house-1', 'House - 1', 'reldens-house-1.json', 'reldens-house-1.png', NULL, '{"allowGuest":true}'),
	(3, 'reldens-house-2', 'House - 2', 'reldens-house-2.json', 'reldens-house-2.png', NULL, '{"allowGuest":true}'),
	(6, 'reldens-house-1-2d-floor', 'House - 1 - Floor 2', 'reldens-house-1-2d-floor.json', 'reldens-house-1-2d-floor.png', NULL, NULL),
	(7, 'reldens-gravity', 'Gravity World!', 'reldens-gravity.json', 'reldens-gravity.png', NULL, '{"allowGuest":true,"gravity":[0,625],"applyGravity":true,"allowPassWallsFromBelow":true,"timeStep":0.012,"type":"TOP_DOWN_WITH_GRAVITY","useFixedWorldStep":false,"maxSubSteps":2,"movementSpeed":160,"usePathFinder":false}'),
	(9, 'reldens-bots-forest', 'Bots Forest', 'reldens-bots-forest.json', 'reldens-bots-forest.png', NULL, '{"allowGuest":true,"joinInRandomPlace":true,"joinInRandomPlaceGuestAlways":true}'),
	(10, 'reldens-bots-forest-house-01-n0', 'Bots Forest - House 1-0', 'reldens-bots-forest-house-01-n0.json', 'reldens-bots-forest-house-01-n0.png', NULL, '{"allowGuest":true}'),
	(41, 'reldens-new-age-town', 'New Age Town', 'reldens-new-age-town.json', 'reldens-new-age-town.png', NULL, '{"enabled":true,"allowGuest":true,"weather":{"clouds":{"alpha":0.25,"quantity":6}}}'),
	(109, 'reldens-new-age-town-house-01', 'New Age Town - House 1', 'reldens-new-age-town-house-01.json', 'reldens-new-age-town-house-01.png', NULL, '{"enabled":true,"allowGuest":true}'),
	(110, 'reldens-new-age-town-house-02', 'New Age Town - House 2', 'reldens-new-age-town-house-02.json', 'reldens-new-age-town-house-02.png', NULL, '{"enabled":true,"allowGuest":true}'),
	(111, 'reldens-new-age-town-house-03', 'New Age Town - House 3', 'reldens-new-age-town-house-03.json', 'reldens-new-age-town-house-03.png', NULL, '{"enabled":true,"allowGuest":true}'),
	(112, 'reldens-new-age-town-house-04', 'New Age Town - House 4', 'reldens-new-age-town-house-04.json', 'reldens-new-age-town-house-04.png', NULL, '{"enabled":true,"allowGuest":true}'),
	(113, 'reldens-new-age-town-house-05', 'New Age Town - House 5', 'reldens-new-age-town-house-05.json', 'reldens-new-age-town-house-05.png', NULL, '{"enabled":true,"allowGuest":true}'),
	(114, 'reldens-forest-level-1', 'Forest - Level 1', 'reldens-forest-level-1.json', 'reldens-forest-level-1.png', NULL, '{"enabled":true,"allowGuest":true,"weather":{"clouds":{"alpha":0.29,"quantity":7}}}'),
	(115, 'reldens-forest-level-2', 'Forest - Level 2', 'reldens-forest-level-2.json', 'reldens-forest-level-2.png', NULL, '{"enabled":true,"allowGuest":true,"weather":{"clouds":{"alpha":0.33,"quantity":8}}}'),
	(116, 'reldens-forest-level-3', 'Forest - Level 3', 'reldens-forest-level-3.json', 'reldens-forest-level-3.png', NULL, '{"enabled":true,"allowGuest":true,"weather":{"clouds":{"alpha":0.37,"quantity":9},"rain":true}}'),
	(117, 'reldens-forest-level-4', 'Forest - Level 4', 'reldens-forest-level-4.json', 'reldens-forest-level-4.png', NULL, '{"enabled":true,"allowGuest":true,"weather":{"clouds":{"alpha":0.42,"quantity":10},"rain":true}}'),
	(118, 'reldens-forest-level-5', 'Forest - Level 5', 'reldens-forest-level-5.json', 'reldens-forest-level-5.png', NULL, '{"enabled":true,"allowGuest":true,"weather":{"clouds":{"alpha":0.46,"quantity":11}}}'),
	(119, 'reldens-forest-level-6', 'Forest - Level 6', 'reldens-forest-level-6.json', 'reldens-forest-level-6.png', NULL, '{"enabled":true,"allowGuest":true,"weather":{"clouds":{"alpha":0.5,"quantity":12}}}');

REPLACE INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES
	(1, 2, 816, 41),
	(2, 2, 817, 41),
	(3, 3, 778, 41),
	(4, 3, 779, 41),
	(11, 2, 623, 6),
	(12, 2, 663, 6),
	(13, 6, 624, 2),
	(14, 6, 664, 2),
	(15, 7, 540, 3),
	(16, 3, 500, 7),
	(17, 3, 780, 41),
	(19, 10, 381, 9),
	(20, 10, 382, 9),
	(21, 41, 2078, 2),
	(22, 41, 3387, 3),
	(23, 41, 3242, 109),
	(24, 41, 3255, 110),
	(190, 109, 494, 41),
	(191, 109, 495, 41),
	(192, 110, 476, 41),
	(193, 110, 477, 41),
	(194, 111, 494, 41),
	(195, 111, 495, 41),
	(196, 112, 494, 41),
	(197, 112, 495, 41),
	(198, 113, 476, 41),
	(199, 113, 477, 41),
	(200, 41, 4700, 111),
	(201, 41, 4390, 112),
	(202, 41, 4397, 113),
	(203, 41, 18, 114),
	(204, 41, 19, 114),
	(205, 114, 7114, 41),
	(206, 114, 7115, 41),
	(207, 114, 93, 115),
	(208, 114, 94, 115),
	(209, 115, 7079, 114),
	(210, 115, 7080, 114),
	(211, 115, 3241, 116),
	(212, 115, 3313, 116),
	(213, 116, 2086, 115),
	(214, 116, 2158, 115),
	(215, 116, 7079, 117),
	(216, 116, 7080, 117),
	(217, 117, 102, 116),
	(218, 117, 103, 116),
	(219, 117, 4390, 118),
	(220, 117, 4462, 118),
	(221, 118, 5185, 117),
	(222, 118, 5257, 117),
	(223, 118, 124, 119),
	(224, 118, 125, 119),
	(225, 119, 7082, 118),
	(226, 119, 7083, 118),
	(227, 9, 21097, 10),
	(228, 114, 7113, 41),
	(229, 114, 7116, 41),
	(230, 114, 95, 115),
	(231, 114, 96, 115),
	(232, 115, 7078, 114),
	(233, 115, 7081, 114),
	(234, 115, 3385, 116),
	(235, 115, 3457, 116),
	(236, 115, 3529, 116),
	(237, 116, 2014, 115),
	(238, 116, 2230, 115),
	(239, 116, 7081, 117),
	(240, 116, 7082, 117),
	(241, 117, 104, 116),
	(242, 117, 105, 116),
	(243, 117, 4534, 118),
	(244, 117, 4606, 118),
	(245, 118, 5113, 117),
	(246, 118, 5329, 117),
	(247, 118, 126, 119),
	(248, 118, 127, 119),
	(249, 119, 7081, 118),
	(250, 119, 7084, 118),
	(251, 41, 20, 114),
	(252, 41, 21, 114);

REPLACE INTO `rooms_return_points` (`id`, `room_id`, `direction`, `x`, `y`, `is_default`, `from_room_id`) VALUES
	(9, 6, 'right', 820, 500, 0, 2),
	(11, 2, 'left', 720, 540, 0, 6),
	(12, 7, 'left', 340, 600, 0, NULL),
	(13, 3, 'down', 660, 520, 0, 7),
	(14, 9, 'down', 3120, 3472, 1, NULL),
	(15, 9, 'down', 3120, 3472, 0, 10),
	(16, 10, 'up', 64, 544, 1, 9),
	(38, 2, 'down', 528, 624, 1, 41),
	(39, 3, 'down', 624, 592, 1, 41),
	(91, 109, 'up', 272, 800, 1, 41),
	(92, 110, 'up', 272, 768, 1, 41),
	(93, 111, 'up', 272, 800, 1, 41),
	(94, 112, 'up', 272, 800, 1, 41),
	(95, 113, 'up', 272, 768, 1, 41),
	(96, 41, 'down', 912, 880, 0, 2),
	(97, 41, 'down', 816, 1392, 0, 3),
	(98, 41, 'down', 1424, 1360, 0, 109),
	(99, 41, 'down', 1840, 1360, 0, 110),
	(100, 41, 'down', 848, 1904, 0, 111),
	(101, 41, 'down', 1424, 1840, 0, 112),
	(102, 41, 'down', 1648, 1808, 0, 113),
	(110, 41, 'down', 640, 80, 0, 114),
	(111, 114, 'up', 1888, 3088, 1, 41),
	(112, 114, 'down', 736, 112, 0, 115),
	(113, 115, 'up', 704, 3056, 1, 114),
	(114, 115, 'right', 128, 1504, 0, 116),
	(115, 116, 'left', 2192, 928, 1, 115),
	(116, 116, 'up', 800, 3072, 0, 117),
	(117, 117, 'down', 1024, 112, 1, 116),
	(118, 117, 'left', 2176, 1984, 0, 118),
	(119, 118, 'right', 112, 2336, 1, 117),
	(120, 118, 'down', 1728, 128, 0, 119),
	(121, 119, 'up', 864, 3088, 1, 118),
	(122, 41, 'down', 1520, 1424, 1, NULL);

REPLACE INTO `audio` (`id`, `audio_key`, `files_name`, `config`, `room_id`, `category_id`, `enabled`) VALUES
	(3, 'footstep', 'footstep.mp3', '{"onlyCurrentPlayer":true}', NULL, 3, 1),
	(4, 'reldens-new-age-town', 'reldens-town.mp3', '', 41, 1, 1);

REPLACE INTO `skills_skill` (`id`, `key`, `type`, `label`, `autoValidation`, `skillDelay`, `castTime`, `usesLimit`, `range`, `rangeAutomaticValidation`, `rangePropertyX`, `rangePropertyY`, `rangeTargetPropertyX`, `rangeTargetPropertyY`, `allowSelfTarget`, `criticalChance`, `criticalMultiplier`, `criticalFixedValue`, `customData`) VALUES
	(1, 'attackBullet', '4', NULL, 0, 1000, 0, 0, 250, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(2, 'attackShort', '2', NULL, 0, 600, 0, 0, 50, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(3, 'fireball', '4', NULL, 0, 5000, 2000, 0, 280, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(4, 'heal', '3', NULL, 0, 5000, 2000, 0, 100, 1, 'state/x', 'state/y', NULL, NULL, 1, 0, 1, 0, NULL),
	(5, 'forestStrikeLevel3', '2', 'Forest Strike - Level 3', 0, 900, 0, 0, 60, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(6, 'forestStrikeLevel4', '2', 'Forest Strike - Level 4', 0, 900, 0, 0, 60, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(7, 'forestStrikeLevel5', '2', 'Forest Strike - Level 5', 0, 900, 0, 0, 60, 1, 'state/x', 'state/y', NULL, NULL, 0, 12, 2, 0, NULL),
	(8, 'forestStrikeLevel6', '2', 'Forest Strike - Level 6', 0, 900, 0, 0, 60, 1, 'state/x', 'state/y', NULL, NULL, 0, 15, 2, 0, NULL);

REPLACE INTO `skills_skill_attack` (`id`, `skill_id`, `affectedProperty`, `allowEffectBelowZero`, `hitDamage`, `applyDirectDamage`, `attackProperties`, `defenseProperties`, `aimProperties`, `dodgeProperties`, `dodgeFullEnabled`, `dodgeOverAimSuccess`, `damageAffected`, `criticalAffected`) VALUES
	(1, 1, 'stats/hp', 0, 3, 0, 'stats/atk,stats/speed', 'stats/def,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0),
	(2, 2, 'stats/hp', 0, 5, 0, 'stats/atk,stats/speed', 'stats/def,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0),
	(3, 3, 'stats/hp', 0, 7, 0, 'stats/mgk-atk,stats/speed', 'stats/mgk-def,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0),
	(4, 5, 'stats/hp', 0, 9, 0, 'stats/atk,stats/speed', 'stats/def,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0),
	(5, 6, 'stats/hp', 0, 14, 0, 'stats/atk,stats/speed', 'stats/def,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0),
	(6, 7, 'stats/hp', 0, 20, 0, 'stats/atk,stats/speed', 'stats/def,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0),
	(7, 8, 'stats/hp', 0, 30, 0, 'stats/atk,stats/speed', 'stats/def,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0);

REPLACE INTO `objects` (`id`, `room_id`, `layer_name`, `tile_index`, `class_type`, `object_class_key`, `client_key`, `title`, `private_params`, `client_params`, `enabled`) VALUES
	(5, 41, 'ground', 3482, 3, 'npc_1', 'people_town_1', 'Alfred', '{"runOnAction":true,"playerVisible":true,"collisionType":4,"hasState":true,"randomMovement":{"maxTiles":5}}', '{"content":"Hello! My name is Alfred. Go to the forest and kill some monsters! Now... leave me alone!","autoStart":true,"animations":{"people_town_1_down":{"start":0,"end":2},"people_town_1_left":{"start":3,"end":5},"people_town_1_right":{"start":6,"end":8},"people_town_1_up":{"start":9,"end":11}}}', 1),
	(6, 114, 'merge-respawn-area-monsters', NULL, 7, 'enemy_1', 'enemy_forest_1', 'Tree', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":170,"randomMovement":{"maxTiles":3}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(7, 114, 'merge-respawn-area-monsters', NULL, 7, 'enemy_2', 'enemy_forest_2', 'Tree Punch', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":false,"interactionRadio":70,"randomMovement":{"maxTiles":8}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(8, 41, 'ground', 3567, 3, 'npc_2', 'healer_1', 'Mamon', '{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true,"collisionType":4,"hasState":true}', '{"content":"Hello traveler! I can restore your health, would you like me to do it?","options":{"1":{"label":"Heal HP","value":1},"2":{"label":"Nothing...","value":2},"3":{"label":"Need some MP","value":3}},"ui":true,"autoStart":true,"animations":{"healer_1_down":{"start":0,"end":2},"healer_1_left":{"start":0,"end":2},"healer_1_right":{"start":0,"end":2},"healer_1_up":{"start":0,"end":2}}}', 1),
	(10, 41, 'ground', 3578, 5, 'npc_3', 'merchant_1', 'Gimly', '{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true,"collisionType":4,"hasState":true,"randomMovement":{"maxTiles":5}}', '{"content":"Hi there! What would you like to do?","options":{"buy":{"label":"Buy","value":"buy"},"sell":{"label":"Sell","value":"sell"}},"autoStart":true,"animations":{"merchant_1_down":{"start":0,"end":2},"merchant_1_left":{"start":3,"end":5},"merchant_1_right":{"start":6,"end":8},"merchant_1_up":{"start":9,"end":11}}}', 1),
	(12, 41, 'ground', 3499, 3, 'npc_4', 'weapons_master_1', 'Barrik', '{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true,"collisionType":4,"hasState":true,"randomMovement":{"maxTiles":5}}', '{"content":"Hi, I am the weapons master, choose your weapon and go kill some monsters!","options":{"1":{"key":"axe","label":"Axe","value":1,"icon":"axe"},"2":{"key":"spear","label":"Spear","value":2,"icon":"spear"}},"ui":true,"autoStart":true,"animations":{"weapons_master_1_down":{"start":0,"end":2},"weapons_master_1_left":{"start":3,"end":5},"weapons_master_1_right":{"start":6,"end":8},"weapons_master_1_up":{"start":9,"end":11}}}', 1),
	(13, 114, 'ground', 6833, 3, 'npc_5', 'quest_npc_1', 'Miles', '{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true,"collisionType":4,"hasState":true,"randomMovement":{"maxTiles":5}}', '{"content":"Hi there! Do you want a coin? I can give you one if you give me a tree branch.","options":{"1":{"label":"Sure!","value":1},"2":{"label":"No, thank you.","value":2}},"ui":true,"autoStart":true,"animations":{"quest_npc_1_down":{"start":0,"end":2},"quest_npc_1_left":{"start":3,"end":5},"quest_npc_1_right":{"start":6,"end":8},"quest_npc_1_up":{"start":9,"end":11}}}', 1),
	(14, 9, 'ground-respawn-area', NULL, 7, 'enemy_bot_b1', 'enemy_forest_1', 'Tree', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":170,"randomMovement":{"maxTiles":3}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(15, 9, 'ground-respawn-area', NULL, 7, 'enemy_bot_b2', 'enemy_forest_2', 'Tree Punch', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":false,"interactionRadio":70,"randomMovement":{"maxTiles":8}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(16, 114, 'merge-respawn-area-mining-rocks', NULL, 7, 'rock_forest_1_area', 'rock_forest_1', NULL, '{"shouldRespawn":true,"childObjectClassKey":"rock_forest_1","itemKey":"ore","cancelOnMove":true,"cancelOnHit":true,"cancelOnOutOfRange":false,"runOnAction":true,"collisionType":2,"hasState":true,"interactionArea":48}', '{"timingDuration":5000,"isInteractive":true,"frameStart":0,"frameEnd":0,"classKey":"rock_forest_1","ui":false}', 1),
	(17, 114, 'merge-spot_003_river_grass-collisions', 822, 8, 'fish_spawn_forest_1', 'fish_spawn_forest_1', NULL, '{"cancelOnMove":true,"cancelOnHit":true,"cancelOnOutOfRange":false,"rewards":[{"key":"fish","rate":100}],"runOnAction":true,"fishCooldown":3000,"collisionType":2}', '{"timingDuration":10000,"isInteractive":true,"frameStart":0,"frameEnd":2,"autoStart":true,"repeat":-1,"classKey":"fish_spawn_forest_1","ui":false}', 1),
	(18, 114, 'ground', 6613, 3, 'chest_forest_1', 'chest_forest_1', 'Treasure Chest', '{"runOnAction":true,"playerVisible":true,"collisionType":2}', '{"content":"A dusty old chest...","ui":true,"frameStart":0,"frameEnd":0,"animations":{"chest_forest_1_open":{"asset_key":"chest_forest_1","start":0,"end":1,"frameRate":8,"repeat":0}}}', 1),
	(19, 41, 'merge-collisions', 2078, 2, 'door_3', 'door_house_3', NULL, '{"runOnHit":true,"roomVisible":true,"yFix":6,"collisionResponse":false}', '{"positionFix":{"y":-22},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000,"asset_key":"door_house_3"}', 1),
	(22, 41, 'merge-collisions', 3387, 2, 'door_4', 'door_house_4', NULL, '{"runOnHit":true,"roomVisible":true,"yFix":6,"collisionResponse":false}', '{"positionFix":{"y":-26},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000,"asset_key":"door_house_3"}', 1),
	(23, 41, 'merge-collisions', 3242, 2, 'door_5', 'door_house_5', NULL, '{"runOnHit":true,"roomVisible":true,"yFix":6,"collisionResponse":false}', '{"positionFix":{"y":-22},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000,"asset_key":"door_house_3"}', 1),
	(24, 41, 'merge-collisions', 3255, 2, 'door_6', 'door_house_6', NULL, '{"runOnHit":true,"roomVisible":true,"yFix":6,"collisionResponse":false}', '{"positionFix":{"y":-22},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000,"asset_key":"door_house_3"}', 1),
	(25, 41, 'merge-collisions', 4700, 2, 'door_7', 'door_house_7', NULL, '{"runOnHit":true,"roomVisible":true,"yFix":6,"collisionResponse":false}', '{"positionFix":{"y":-22},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000,"asset_key":"door_house_3"}', 1),
	(26, 41, 'merge-collisions', 4390, 2, 'door_8', 'door_house_8', NULL, '{"runOnHit":true,"roomVisible":true,"yFix":6,"collisionResponse":false}', '{"positionFix":{"y":-22},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000,"asset_key":"door_house_3"}', 1),
	(27, 41, 'merge-collisions', 4397, 2, 'door_9', 'door_house_9', NULL, '{"runOnHit":true,"roomVisible":true,"yFix":6,"collisionResponse":false}', '{"positionFix":{"y":-22},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000,"asset_key":"door_house_3"}', 1),
	(28, 115, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-2_enemy_forest_1', 'forest_purple_mushroom', 'Purple Mushroom', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":170,"randomMovement":{"maxTiles":3}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(29, 115, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-2_enemy_forest_2', 'forest_red_mushroom', 'Red Mushroom', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":false,"interactionRadio":70,"randomMovement":{"maxTiles":8}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(30, 116, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-3_enemy_forest_1', 'forest_carnivorous_plant', 'Carnivorous Plant', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":170,"randomMovement":{"maxTiles":3}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(31, 116, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-3_enemy_forest_2', 'forest_seed_golem', 'Seed Golem', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":false,"interactionRadio":70,"randomMovement":{"maxTiles":8}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(32, 117, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-4_enemy_forest_1', 'forest_snake', 'Forest Snake', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":170,"randomMovement":{"maxTiles":3}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(33, 117, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-4_enemy_forest_2', 'forest_giant_spider', 'Giant Spider', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":false,"interactionRadio":70,"randomMovement":{"maxTiles":8}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(34, 118, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-5_enemy_forest_1', 'forest_scorpion', 'Scorpion', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":170,"randomMovement":{"maxTiles":3}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(35, 118, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-5_enemy_forest_2', 'forest_spiked_armadillo', 'Spiked Armadillo', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":false,"interactionRadio":70,"randomMovement":{"maxTiles":8}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(36, 119, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-6_enemy_forest_1', 'forest_gargoyle', 'Gargoyle', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":170,"randomMovement":{"maxTiles":3}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(37, 119, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-6_enemy_forest_2', 'forest_red_demon', 'Red Demon', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":false,"interactionRadio":70,"randomMovement":{"maxTiles":8}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(38, 114, 'merge-spot_003_river_grass-collisions', 1614, 8, 'fish_spawn_forest_2', 'fish_spawn_forest_2', NULL, '{"cancelOnMove":true,"cancelOnHit":true,"cancelOnOutOfRange":false,"rewards":[{"key":"fish","rate":100}],"runOnAction":true,"fishCooldown":3000,"collisionType":2}', '{"timingDuration":10000,"isInteractive":true,"frameStart":0,"frameEnd":2,"autoStart":true,"repeat":-1,"classKey":"fish_spawn_forest_1","ui":false}', 1),
	(39, 114, 'merge-spot_003_river_grass-collisions', 1965, 8, 'fish_spawn_forest_3', 'fish_spawn_forest_3', NULL, '{"cancelOnMove":true,"cancelOnHit":true,"cancelOnOutOfRange":false,"rewards":[{"key":"fish","rate":100}],"runOnAction":true,"fishCooldown":3000,"collisionType":2}', '{"timingDuration":10000,"isInteractive":true,"frameStart":0,"frameEnd":2,"autoStart":true,"repeat":-1,"classKey":"fish_spawn_forest_1","ui":false}', 1),
	(40, 114, 'merge-spot_003_river_grass-collisions', 1740, 8, 'fish_spawn_forest_4', 'fish_spawn_forest_4', NULL, '{"cancelOnMove":true,"cancelOnHit":true,"cancelOnOutOfRange":false,"rewards":[{"key":"fish","rate":100}],"runOnAction":true,"fishCooldown":3000,"collisionType":2}', '{"timingDuration":10000,"isInteractive":true,"frameStart":0,"frameEnd":2,"autoStart":true,"repeat":-1,"classKey":"fish_spawn_forest_1","ui":false}', 1),
	(41, 114, 'merge-spot_003_river_grass-collisions', 946, 8, 'fish_spawn_forest_5', 'fish_spawn_forest_5', NULL, '{"cancelOnMove":true,"cancelOnHit":true,"cancelOnOutOfRange":false,"rewards":[{"key":"fish","rate":100}],"runOnAction":true,"fishCooldown":3000,"collisionType":2}', '{"timingDuration":10000,"isInteractive":true,"frameStart":0,"frameEnd":2,"autoStart":true,"repeat":-1,"classKey":"fish_spawn_forest_1","ui":false}', 1),
	(42, 114, 'merge-spot_003_river_grass-collisions', 812, 8, 'fish_spawn_forest_6', 'fish_spawn_forest_6', NULL, '{"cancelOnMove":true,"cancelOnHit":true,"cancelOnOutOfRange":false,"rewards":[{"key":"fish","rate":100}],"runOnAction":true,"fishCooldown":3000,"collisionType":2}', '{"timingDuration":10000,"isInteractive":true,"frameStart":0,"frameEnd":2,"autoStart":true,"repeat":-1,"classKey":"fish_spawn_forest_1","ui":false}', 1);

REPLACE INTO `objects_assets` (`object_asset_id`, `object_id`, `asset_type`, `asset_key`, `asset_file`, `extra_params`) VALUES
	(3, 5, 'spritesheet', 'people_town_1', 'people-b-x2.png', '{"frameWidth":52,"frameHeight":71}'),
	(5, 6, 'spritesheet', 'enemy_forest_1', 'monster-treant.png', '{"frameWidth":47,"frameHeight":50,"spacing":2}'),
	(6, 7, 'spritesheet', 'enemy_forest_2', 'monster-golem2.png', '{"frameWidth":47,"frameHeight":50,"spacing":2}'),
	(7, 5, 'spritesheet', 'healer_1', 'healer-1.png', '{"frameWidth":52,"frameHeight":71}'),
	(9, 10, 'spritesheet', 'merchant_1', 'people-d-x2.png', '{"frameWidth":52,"frameHeight":71}'),
	(10, 12, 'spritesheet', 'weapons_master_1', 'people-c-x2.png', '{"frameWidth":52,"frameHeight":71}'),
	(11, 13, 'spritesheet', 'quest_npc_1', 'people-quest-npc.png', '{"frameWidth":52,"frameHeight":71}'),
	(12, 14, 'spritesheet', 'enemy_forest_1', 'monster-treant.png', '{"frameWidth":47,"frameHeight":50,"spacing":2}'),
	(13, 15, 'spritesheet', 'enemy_forest_2', 'monster-golem2.png', '{"frameWidth":47,"frameHeight":50,"spacing":2}'),
	(14, 16, 'spritesheet', 'rock_forest_1', 'rock.png', '{"frameWidth":32,"frameHeight":32}'),
	(15, 17, 'spritesheet', 'fish_spawn_forest_1', 'fish-spawn.png', '{"frameWidth":32,"frameHeight":32}'),
	(16, 18, 'spritesheet', 'chest_forest_1', 'chest.png', '{"frameWidth":32,"frameHeight":32}'),
	(17, 19, 'spritesheet', 'door_house_3', 'door-a-x3.png', '{"frameWidth":32,"frameHeight":64}'),
	(18, 28, 'spritesheet', 'forest_purple_mushroom', 'monster-purple-mushroom.png', '{"frameWidth":32,"frameHeight":46,"spacing":2}'),
	(19, 29, 'spritesheet', 'forest_red_mushroom', 'monster-red-mushroom.png', '{"frameWidth":44,"frameHeight":62,"spacing":2}'),
	(20, 30, 'spritesheet', 'forest_carnivorous_plant', 'monster-carnivorous-plant.png', '{"frameWidth":52,"frameHeight":70,"spacing":2}'),
	(21, 31, 'spritesheet', 'forest_seed_golem', 'monster-seed-golem.png', '{"frameWidth":56,"frameHeight":60,"spacing":2}'),
	(22, 32, 'spritesheet', 'forest_snake', 'monster-forest-snake.png', '{"frameWidth":48,"frameHeight":48,"spacing":2}'),
	(23, 33, 'spritesheet', 'forest_giant_spider', 'monster-giant-spider.png', '{"frameWidth":54,"frameHeight":40,"spacing":2}'),
	(24, 34, 'spritesheet', 'forest_scorpion', 'monster-scorpion.png', '{"frameWidth":54,"frameHeight":52,"spacing":2}'),
	(25, 35, 'spritesheet', 'forest_spiked_armadillo', 'monster-spiked-armadillo.png', '{"frameWidth":64,"frameHeight":70,"spacing":2}'),
	(26, 36, 'spritesheet', 'forest_gargoyle', 'monster-gargoyle.png', '{"frameWidth":78,"frameHeight":68,"spacing":2}'),
	(27, 37, 'spritesheet', 'forest_red_demon', 'monster-red-demon.png', '{"frameWidth":80,"frameHeight":90,"spacing":2}'),
	(28, 38, 'spritesheet', 'fish_spawn_forest_2', 'fish-spawn.png', '{"frameWidth":32,"frameHeight":32}'),
	(29, 39, 'spritesheet', 'fish_spawn_forest_3', 'fish-spawn.png', '{"frameWidth":32,"frameHeight":32}'),
	(30, 40, 'spritesheet', 'fish_spawn_forest_4', 'fish-spawn.png', '{"frameWidth":32,"frameHeight":32}'),
	(31, 41, 'spritesheet', 'fish_spawn_forest_5', 'fish-spawn.png', '{"frameWidth":32,"frameHeight":32}'),
	(32, 42, 'spritesheet', 'fish_spawn_forest_6', 'fish-spawn.png', '{"frameWidth":32,"frameHeight":32}');

REPLACE INTO `objects_animations` (`id`, `object_id`, `animationKey`, `animationData`) VALUES
	(5, 6, 'merge-respawn-area-monsters_6_right', '{"start":6,"end":8}'),
	(6, 6, 'merge-respawn-area-monsters_6_down', '{"start":0,"end":2}'),
	(7, 6, 'merge-respawn-area-monsters_6_left', '{"start":3,"end":5}'),
	(8, 6, 'merge-respawn-area-monsters_6_up', '{"start":9,"end":11}'),
	(9, 28, 'merge-respawn-area-monsters_28_right', '{"start":6,"end":8}'),
	(10, 28, 'merge-respawn-area-monsters_28_down', '{"start":0,"end":2}'),
	(11, 28, 'merge-respawn-area-monsters_28_left', '{"start":3,"end":5}'),
	(12, 28, 'merge-respawn-area-monsters_28_up', '{"start":9,"end":11}'),
	(13, 30, 'merge-respawn-area-monsters_30_right', '{"start":6,"end":8}'),
	(14, 30, 'merge-respawn-area-monsters_30_down', '{"start":0,"end":2}'),
	(15, 30, 'merge-respawn-area-monsters_30_left', '{"start":3,"end":5}'),
	(16, 30, 'merge-respawn-area-monsters_30_up', '{"start":9,"end":11}'),
	(17, 32, 'merge-respawn-area-monsters_32_right', '{"start":6,"end":8}'),
	(18, 32, 'merge-respawn-area-monsters_32_down', '{"start":0,"end":2}'),
	(19, 32, 'merge-respawn-area-monsters_32_left', '{"start":3,"end":5}'),
	(20, 32, 'merge-respawn-area-monsters_32_up', '{"start":9,"end":11}'),
	(21, 34, 'merge-respawn-area-monsters_34_right', '{"start":6,"end":8}'),
	(22, 34, 'merge-respawn-area-monsters_34_down', '{"start":0,"end":2}'),
	(23, 34, 'merge-respawn-area-monsters_34_left', '{"start":3,"end":5}'),
	(24, 34, 'merge-respawn-area-monsters_34_up', '{"start":9,"end":11}'),
	(25, 36, 'merge-respawn-area-monsters_36_right', '{"start":6,"end":8}'),
	(26, 36, 'merge-respawn-area-monsters_36_down', '{"start":0,"end":2}'),
	(27, 36, 'merge-respawn-area-monsters_36_left', '{"start":3,"end":5}'),
	(28, 36, 'merge-respawn-area-monsters_36_up', '{"start":9,"end":11}'),
	(29, 29, 'merge-respawn-area-monsters_29_right', '{"start":6,"end":8}'),
	(30, 29, 'merge-respawn-area-monsters_29_down', '{"start":0,"end":2}'),
	(31, 29, 'merge-respawn-area-monsters_29_left', '{"start":3,"end":5}'),
	(32, 29, 'merge-respawn-area-monsters_29_up', '{"start":9,"end":11}'),
	(33, 31, 'merge-respawn-area-monsters_31_right', '{"start":6,"end":8}'),
	(34, 31, 'merge-respawn-area-monsters_31_down', '{"start":0,"end":2}'),
	(35, 31, 'merge-respawn-area-monsters_31_left', '{"start":3,"end":5}'),
	(36, 31, 'merge-respawn-area-monsters_31_up', '{"start":9,"end":11}'),
	(37, 33, 'merge-respawn-area-monsters_33_right', '{"start":6,"end":8}'),
	(38, 33, 'merge-respawn-area-monsters_33_down', '{"start":0,"end":2}'),
	(39, 33, 'merge-respawn-area-monsters_33_left', '{"start":3,"end":5}'),
	(40, 33, 'merge-respawn-area-monsters_33_up', '{"start":9,"end":11}'),
	(41, 35, 'merge-respawn-area-monsters_35_right', '{"start":6,"end":8}'),
	(42, 35, 'merge-respawn-area-monsters_35_down', '{"start":0,"end":2}'),
	(43, 35, 'merge-respawn-area-monsters_35_left', '{"start":3,"end":5}'),
	(44, 35, 'merge-respawn-area-monsters_35_up', '{"start":9,"end":11}'),
	(45, 37, 'merge-respawn-area-monsters_37_right', '{"start":6,"end":8}'),
	(46, 37, 'merge-respawn-area-monsters_37_down', '{"start":0,"end":2}'),
	(47, 37, 'merge-respawn-area-monsters_37_left', '{"start":3,"end":5}'),
	(48, 37, 'merge-respawn-area-monsters_37_up', '{"start":9,"end":11}'),
	(49, 7, 'merge-respawn-area-monsters_7_right', '{"start":6,"end":8}'),
	(50, 7, 'merge-respawn-area-monsters_7_down', '{"start":0,"end":2}'),
	(51, 7, 'merge-respawn-area-monsters_7_left', '{"start":3,"end":5}'),
	(52, 7, 'merge-respawn-area-monsters_7_up', '{"start":9,"end":11}'),
	(53, 14, 'ground-respawn-area_14_right', '{"start":6,"end":8}'),
	(54, 14, 'ground-respawn-area_14_down', '{"start":0,"end":2}'),
	(55, 14, 'ground-respawn-area_14_left', '{"start":3,"end":5}'),
	(56, 14, 'ground-respawn-area_14_up', '{"start":9,"end":11}'),
	(57, 15, 'ground-respawn-area_15_right', '{"start":6,"end":8}'),
	(58, 15, 'ground-respawn-area_15_down', '{"start":0,"end":2}'),
	(59, 15, 'ground-respawn-area_15_left', '{"start":3,"end":5}'),
	(60, 15, 'ground-respawn-area_15_up', '{"start":9,"end":11}');

REPLACE INTO `objects_stats` (`id`, `object_id`, `stat_id`, `base_value`, `value`) VALUES
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
	(60, 15, 10, 50, 50),
	(61, 28, 1, 60, 60),
	(62, 28, 2, 60, 60),
	(63, 28, 3, 60, 60),
	(64, 28, 4, 60, 60),
	(65, 28, 5, 50, 50),
	(66, 28, 6, 50, 50),
	(67, 28, 7, 50, 50),
	(68, 28, 8, 50, 50),
	(69, 28, 9, 50, 50),
	(70, 28, 10, 50, 50),
	(71, 29, 1, 60, 60),
	(72, 29, 2, 60, 60),
	(73, 29, 3, 60, 60),
	(74, 29, 4, 60, 60),
	(75, 29, 5, 50, 50),
	(76, 29, 6, 50, 50),
	(77, 29, 7, 50, 50),
	(78, 29, 8, 50, 50),
	(79, 29, 9, 50, 50),
	(80, 29, 10, 50, 50),
	(81, 30, 1, 150, 150),
	(82, 30, 2, 100, 100),
	(83, 30, 3, 100, 100),
	(84, 30, 4, 90, 90),
	(85, 30, 5, 50, 50),
	(86, 30, 6, 50, 50),
	(87, 30, 7, 50, 50),
	(88, 30, 8, 50, 50),
	(89, 30, 9, 50, 50),
	(90, 30, 10, 50, 50),
	(91, 31, 1, 150, 150),
	(92, 31, 2, 100, 100),
	(93, 31, 3, 100, 100),
	(94, 31, 4, 90, 90),
	(95, 31, 5, 50, 50),
	(96, 31, 6, 50, 50),
	(97, 31, 7, 50, 50),
	(98, 31, 8, 50, 50),
	(99, 31, 9, 50, 50),
	(100, 31, 10, 50, 50),
	(101, 32, 1, 260, 260),
	(102, 32, 2, 140, 140),
	(103, 32, 3, 150, 150),
	(104, 32, 4, 130, 130),
	(105, 32, 5, 50, 50),
	(106, 32, 6, 50, 50),
	(107, 32, 7, 50, 50),
	(108, 32, 8, 50, 50),
	(109, 32, 9, 50, 50),
	(110, 32, 10, 50, 50),
	(111, 33, 1, 260, 260),
	(112, 33, 2, 140, 140),
	(113, 33, 3, 150, 150),
	(114, 33, 4, 130, 130),
	(115, 33, 5, 50, 50),
	(116, 33, 6, 50, 50),
	(117, 33, 7, 50, 50),
	(118, 33, 8, 50, 50),
	(119, 33, 9, 50, 50),
	(120, 33, 10, 50, 50),
	(121, 34, 1, 420, 420),
	(122, 34, 2, 180, 180),
	(123, 34, 3, 210, 210),
	(124, 34, 4, 180, 180),
	(125, 34, 5, 50, 50),
	(126, 34, 6, 50, 50),
	(127, 34, 7, 50, 50),
	(128, 34, 8, 50, 50),
	(129, 34, 9, 50, 50),
	(130, 34, 10, 50, 50),
	(131, 35, 1, 420, 420),
	(132, 35, 2, 180, 180),
	(133, 35, 3, 210, 210),
	(134, 35, 4, 180, 180),
	(135, 35, 5, 50, 50),
	(136, 35, 6, 50, 50),
	(137, 35, 7, 50, 50),
	(138, 35, 8, 50, 50),
	(139, 35, 9, 50, 50),
	(140, 35, 10, 50, 50),
	(141, 36, 1, 800, 800),
	(142, 36, 2, 250, 250),
	(143, 36, 3, 300, 300),
	(144, 36, 4, 260, 260),
	(145, 36, 5, 70, 70),
	(146, 36, 6, 50, 50),
	(147, 36, 7, 80, 80),
	(148, 36, 8, 50, 50),
	(149, 36, 9, 50, 50),
	(150, 36, 10, 50, 50),
	(151, 37, 1, 800, 800),
	(152, 37, 2, 250, 250),
	(153, 37, 3, 300, 300),
	(154, 37, 4, 260, 260),
	(155, 37, 5, 70, 70),
	(156, 37, 6, 50, 50),
	(157, 37, 7, 80, 80),
	(158, 37, 8, 50, 50),
	(159, 37, 9, 50, 50),
	(160, 37, 10, 50, 50);

REPLACE INTO `objects_skills` (`id`, `object_id`, `skill_id`, `target_id`) VALUES
	(1, 6, 1, 2),
	(2, 28, 1, 2),
	(3, 30, 1, 2),
	(4, 32, 1, 2),
	(5, 34, 1, 2),
	(6, 36, 1, 2),
	(7, 30, 5, 2),
	(8, 31, 5, 2),
	(9, 32, 6, 2),
	(10, 33, 6, 2),
	(11, 34, 7, 2),
	(12, 35, 7, 2),
	(13, 36, 8, 2),
	(14, 37, 8, 2);

REPLACE INTO `respawn` (`id`, `object_id`, `respawn_time`, `instances_limit`, `layer`) VALUES
	(3, 6, 20000, 12, 'merge-respawn-area-monsters'),
	(4, 7, 10000, 18, 'merge-respawn-area-monsters'),
	(5, 14, 20000, 100, 'ground-respawn-area'),
	(6, 15, 10000, 200, 'ground-respawn-area'),
	(7, 16, 30000, 10, 'merge-respawn-area-mining-rocks'),
	(8, 28, 20000, 12, 'merge-respawn-area-monsters'),
	(9, 29, 10000, 18, 'merge-respawn-area-monsters'),
	(10, 30, 20000, 12, 'merge-respawn-area-monsters'),
	(11, 31, 10000, 18, 'merge-respawn-area-monsters'),
	(12, 32, 20000, 12, 'merge-respawn-area-monsters'),
	(13, 33, 10000, 18, 'merge-respawn-area-monsters'),
	(14, 34, 20000, 12, 'merge-respawn-area-monsters'),
	(15, 35, 10000, 18, 'merge-respawn-area-monsters'),
	(16, 36, 20000, 12, 'merge-respawn-area-monsters'),
	(17, 37, 10000, 18, 'merge-respawn-area-monsters');

REPLACE INTO `rewards` (`id`, `object_id`, `item_id`, `modifier_id`, `experience`, `drop_rate`, `drop_quantity`, `is_unique`, `was_given`, `has_drop_body`) VALUES
	(3, 6, 2, NULL, 10, 100, 3, 0, 0, 1),
	(4, 7, 2, NULL, 10, 100, 1, 0, 0, 1),
	(5, 14, 2, NULL, 10, 100, 3, 0, 0, 1),
	(6, 15, 2, NULL, 10, 100, 1, 0, 0, 1),
	(7, 28, 2, NULL, 15, 100, 3, 0, 0, 1),
	(8, 29, 2, NULL, 15, 100, 1, 0, 0, 1),
	(9, 30, 2, NULL, 20, 100, 3, 0, 0, 1),
	(10, 31, 2, NULL, 20, 100, 1, 0, 0, 1),
	(11, 32, 2, NULL, 35, 100, 3, 0, 0, 1),
	(12, 33, 2, NULL, 35, 100, 1, 0, 0, 1),
	(13, 34, 2, NULL, 60, 100, 3, 0, 0, 1),
	(14, 35, 2, NULL, 60, 100, 1, 0, 0, 1),
	(15, 36, 2, NULL, 90, 100, 3, 0, 0, 1),
	(16, 37, 2, NULL, 90, 100, 1, 0, 0, 1);

--

SET FOREIGN_KEY_CHECKS = 1;

--
