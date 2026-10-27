--

SET FOREIGN_KEY_CHECKS = 0;

--

-- Every foreign key below is dropped only when it exists, the databases upgraded from older versions can miss some of
-- them, for example FK_items_inventory_players was only created by the installation script. The beta.39.9 update
-- dropped them without that check, so these statements set them again on every database.

-- Keep the chat history when a room is deleted: unlink it instead of cascading.
-- The chat player_id and private_player_id FKs already use SET NULL, room_id was the only one destroying rows.
SET @dropForeignKey = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `chat` DROP FOREIGN KEY `FK__scenes`')
    FROM `information_schema`.`TABLE_CONSTRAINTS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'chat' AND `CONSTRAINT_NAME` = 'FK__scenes'
        AND `CONSTRAINT_TYPE` = 'FOREIGN KEY'
);
PREPARE dropForeignKeyStatement FROM @dropForeignKey;
EXECUTE dropForeignKeyStatement;
DEALLOCATE PREPARE dropForeignKeyStatement;
ALTER TABLE `chat` ADD CONSTRAINT `FK__scenes` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

SET @dropForeignKey = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `players_state` DROP FOREIGN KEY `FK_player_state_rooms`')
    FROM `information_schema`.`TABLE_CONSTRAINTS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'players_state' AND `CONSTRAINT_NAME` = 'FK_player_state_rooms'
        AND `CONSTRAINT_TYPE` = 'FOREIGN KEY'
);
PREPARE dropForeignKeyStatement FROM @dropForeignKey;
EXECUTE dropForeignKeyStatement;
DEALLOCATE PREPARE dropForeignKeyStatement;
ALTER TABLE `players_state` MODIFY `room_id` INT UNSIGNED NULL DEFAULT NULL;
ALTER TABLE `players_state` ADD CONSTRAINT `FK_player_state_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE ON DELETE SET NULL;

-- The audio room FK was unlinking on room id updates too, only the delete should unlink.
SET @dropForeignKey = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `audio` DROP FOREIGN KEY `FK_audio_rooms`')
    FROM `information_schema`.`TABLE_CONSTRAINTS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'audio' AND `CONSTRAINT_NAME` = 'FK_audio_rooms'
        AND `CONSTRAINT_TYPE` = 'FOREIGN KEY'
);
PREPARE dropForeignKeyStatement FROM @dropForeignKey;
EXECUTE dropForeignKeyStatement;
DEALLOCATE PREPARE dropForeignKeyStatement;
ALTER TABLE `audio` ADD CONSTRAINT `FK_audio_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Allow objects to survive room deletion: nullable room_id with SET NULL (this FK was blocking room deletion)
SET @dropForeignKey = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `objects` DROP FOREIGN KEY `FK_objects_rooms`')
    FROM `information_schema`.`TABLE_CONSTRAINTS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'objects' AND `CONSTRAINT_NAME` = 'FK_objects_rooms'
        AND `CONSTRAINT_TYPE` = 'FOREIGN KEY'
);
PREPARE dropForeignKeyStatement FROM @dropForeignKey;
EXECUTE dropForeignKeyStatement;
DEALLOCATE PREPARE dropForeignKeyStatement;
ALTER TABLE `objects` MODIFY `room_id` INT UNSIGNED NULL DEFAULT NULL;
ALTER TABLE `objects` ADD CONSTRAINT `FK_objects_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE ON DELETE SET NULL;

-- Cascade player deletes to player-owned runtime data (these FKs were blocking player deletion)
SET @dropForeignKey = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `players_state` DROP FOREIGN KEY `FK_player_state_player_stats`')
    FROM `information_schema`.`TABLE_CONSTRAINTS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'players_state'
        AND `CONSTRAINT_NAME` = 'FK_player_state_player_stats' AND `CONSTRAINT_TYPE` = 'FOREIGN KEY'
);
PREPARE dropForeignKeyStatement FROM @dropForeignKey;
EXECUTE dropForeignKeyStatement;
DEALLOCATE PREPARE dropForeignKeyStatement;
ALTER TABLE `players_state` ADD CONSTRAINT `FK_player_state_player_stats` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON UPDATE CASCADE ON DELETE CASCADE;

SET @dropForeignKey = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `players_stats` DROP FOREIGN KEY `FK_player_current_stats_players`')
    FROM `information_schema`.`TABLE_CONSTRAINTS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'players_stats'
        AND `CONSTRAINT_NAME` = 'FK_player_current_stats_players' AND `CONSTRAINT_TYPE` = 'FOREIGN KEY'
);
PREPARE dropForeignKeyStatement FROM @dropForeignKey;
EXECUTE dropForeignKeyStatement;
DEALLOCATE PREPARE dropForeignKeyStatement;
ALTER TABLE `players_stats` ADD CONSTRAINT `FK_player_current_stats_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

SET @dropForeignKey = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `ads_played` DROP FOREIGN KEY `FK_ads_played_players`')
    FROM `information_schema`.`TABLE_CONSTRAINTS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'ads_played' AND `CONSTRAINT_NAME` = 'FK_ads_played_players'
        AND `CONSTRAINT_TYPE` = 'FOREIGN KEY'
);
PREPARE dropForeignKeyStatement FROM @dropForeignKey;
EXECUTE dropForeignKeyStatement;
DEALLOCATE PREPARE dropForeignKeyStatement;
ALTER TABLE `ads_played` ADD CONSTRAINT `FK_ads_played_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

SET @dropForeignKey = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `audio_player_config` DROP FOREIGN KEY `FK_audio_player_config_players`')
    FROM `information_schema`.`TABLE_CONSTRAINTS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'audio_player_config'
        AND `CONSTRAINT_NAME` = 'FK_audio_player_config_players' AND `CONSTRAINT_TYPE` = 'FOREIGN KEY'
);
PREPARE dropForeignKeyStatement FROM @dropForeignKey;
EXECUTE dropForeignKeyStatement;
DEALLOCATE PREPARE dropForeignKeyStatement;
ALTER TABLE `audio_player_config` ADD CONSTRAINT `FK_audio_player_config_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

SET @dropForeignKey = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `clan_members` DROP FOREIGN KEY `FK_clan_members_players`')
    FROM `information_schema`.`TABLE_CONSTRAINTS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'clan_members'
        AND `CONSTRAINT_NAME` = 'FK_clan_members_players' AND `CONSTRAINT_TYPE` = 'FOREIGN KEY'
);
PREPARE dropForeignKeyStatement FROM @dropForeignKey;
EXECUTE dropForeignKeyStatement;
DEALLOCATE PREPARE dropForeignKeyStatement;
ALTER TABLE `clan_members` ADD CONSTRAINT `FK_clan_members_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

SET @dropForeignKey = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `items_inventory` DROP FOREIGN KEY `FK_items_inventory_players`')
    FROM `information_schema`.`TABLE_CONSTRAINTS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'items_inventory'
        AND `CONSTRAINT_NAME` = 'FK_items_inventory_players' AND `CONSTRAINT_TYPE` = 'FOREIGN KEY'
);
PREPARE dropForeignKeyStatement FROM @dropForeignKey;
EXECUTE dropForeignKeyStatement;
DEALLOCATE PREPARE dropForeignKeyStatement;
SET @addIndex = (
    SELECT IF(0 = COUNT(*), 'ALTER TABLE `items_inventory` ADD INDEX `FK_items_inventory_players` (`owner_id`) USING BTREE', 'SELECT 1')
    FROM `information_schema`.`STATISTICS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'items_inventory' AND `INDEX_NAME` = 'FK_items_inventory_players'
);
PREPARE addIndexStatement FROM @addIndex;
EXECUTE addIndexStatement;
DEALLOCATE PREPARE addIndexStatement;
ALTER TABLE `items_inventory` ADD CONSTRAINT `FK_items_inventory_players` FOREIGN KEY (`owner_id`) REFERENCES `players` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE;

SET @dropForeignKey = (
    SELECT IF(
        0 = COUNT(*),
        'SELECT 1',
        'ALTER TABLE `skills_owners_class_path` DROP FOREIGN KEY `FK_skills_owners_class_path_players`'
    )
    FROM `information_schema`.`TABLE_CONSTRAINTS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'skills_owners_class_path'
        AND `CONSTRAINT_NAME` = 'FK_skills_owners_class_path_players' AND `CONSTRAINT_TYPE` = 'FOREIGN KEY'
);
PREPARE dropForeignKeyStatement FROM @dropForeignKey;
EXECUTE dropForeignKeyStatement;
DEALLOCATE PREPARE dropForeignKeyStatement;
SET @addIndex = (
    SELECT IF(
        0 = COUNT(*),
        'ALTER TABLE `skills_owners_class_path` ADD INDEX `FK_skills_owners_class_path_players` (`owner_id`) USING BTREE',
        'SELECT 1'
    )
    FROM `information_schema`.`STATISTICS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'skills_owners_class_path'
        AND `INDEX_NAME` = 'FK_skills_owners_class_path_players'
);
PREPARE addIndexStatement FROM @addIndex;
EXECUTE addIndexStatement;
DEALLOCATE PREPARE addIndexStatement;
ALTER TABLE `skills_owners_class_path` ADD CONSTRAINT `FK_skills_owners_class_path_players` FOREIGN KEY (`owner_id`) REFERENCES `players` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE;

SET @dropForeignKey = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `rewards_events_state` DROP FOREIGN KEY `FK_rewards_events_state_players`')
    FROM `information_schema`.`TABLE_CONSTRAINTS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'rewards_events_state'
        AND `CONSTRAINT_NAME` = 'FK_rewards_events_state_players' AND `CONSTRAINT_TYPE` = 'FOREIGN KEY'
);
PREPARE dropForeignKeyStatement FROM @dropForeignKey;
EXECUTE dropForeignKeyStatement;
DEALLOCATE PREPARE dropForeignKeyStatement;
ALTER TABLE `rewards_events_state` ADD CONSTRAINT `FK_rewards_events_state_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep chat history when a player is deleted: nullable author/recipient with SET NULL
ALTER TABLE `chat` MODIFY `player_id` INT UNSIGNED NULL DEFAULT NULL;
SET @dropForeignKey = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `chat` DROP FOREIGN KEY `FK__players`')
    FROM `information_schema`.`TABLE_CONSTRAINTS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'chat' AND `CONSTRAINT_NAME` = 'FK__players'
        AND `CONSTRAINT_TYPE` = 'FOREIGN KEY'
);
PREPARE dropForeignKeyStatement FROM @dropForeignKey;
EXECUTE dropForeignKeyStatement;
DEALLOCATE PREPARE dropForeignKeyStatement;
ALTER TABLE `chat` ADD CONSTRAINT `FK__players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

SET @dropForeignKey = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `chat` DROP FOREIGN KEY `FK__players_2`')
    FROM `information_schema`.`TABLE_CONSTRAINTS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'chat' AND `CONSTRAINT_NAME` = 'FK__players_2'
        AND `CONSTRAINT_TYPE` = 'FOREIGN KEY'
);
PREPARE dropForeignKeyStatement FROM @dropForeignKey;
EXECUTE dropForeignKeyStatement;
DEALLOCATE PREPARE dropForeignKeyStatement;
ALTER TABLE `chat` ADD CONSTRAINT `FK__players_2` FOREIGN KEY (`private_player_id`) REFERENCES `players` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Align the databases upgraded from older versions with the installation schema (structure only, the data is kept)
ALTER TABLE `config_types` MODIFY `label` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;
ALTER TABLE `audio_player_config` MODIFY `enabled` TINYINT UNSIGNED DEFAULT NULL;
ALTER TABLE `clan` MODIFY `name` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;
ALTER TABLE `rewards` MODIFY `is_unique` TINYINT UNSIGNED DEFAULT NULL;
ALTER TABLE `rewards` MODIFY `was_given` TINYINT UNSIGNED DEFAULT NULL;
ALTER TABLE `rewards` MODIFY `has_drop_body` TINYINT UNSIGNED DEFAULT NULL;

-- The clan members FKs use the clan_id_player_id and player_id unique keys, these duplicated indexes are not needed
SET @dropIndex = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `clan_members` DROP INDEX `FK__clan`')
    FROM `information_schema`.`STATISTICS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'clan_members' AND `INDEX_NAME` = 'FK__clan'
);
PREPARE dropIndexStatement FROM @dropIndex;
EXECUTE dropIndexStatement;
DEALLOCATE PREPARE dropIndexStatement;

SET @dropIndex = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `clan_members` DROP INDEX `FK__players`')
    FROM `information_schema`.`STATISTICS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'clan_members' AND `INDEX_NAME` = 'FK__players'
);
PREPARE dropIndexStatement FROM @dropIndex;
EXECUTE dropIndexStatement;
DEALLOCATE PREPARE dropIndexStatement;

-- Rename the FKs created with the MySQL generated names
SET @dropForeignKey = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `objects_items_inventory` DROP FOREIGN KEY `FK_objects_items_inventory_ibfk_1`')
    FROM `information_schema`.`TABLE_CONSTRAINTS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'objects_items_inventory'
        AND `CONSTRAINT_NAME` = 'FK_objects_items_inventory_ibfk_1' AND `CONSTRAINT_TYPE` = 'FOREIGN KEY'
);
PREPARE dropForeignKeyStatement FROM @dropForeignKey;
EXECUTE dropForeignKeyStatement;
DEALLOCATE PREPARE dropForeignKeyStatement;
SET @dropForeignKey = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `objects_items_inventory` DROP FOREIGN KEY `FK_objects_items_inventory_item`')
    FROM `information_schema`.`TABLE_CONSTRAINTS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'objects_items_inventory'
        AND `CONSTRAINT_NAME` = 'FK_objects_items_inventory_item' AND `CONSTRAINT_TYPE` = 'FOREIGN KEY'
);
PREPARE dropForeignKeyStatement FROM @dropForeignKey;
EXECUTE dropForeignKeyStatement;
DEALLOCATE PREPARE dropForeignKeyStatement;
ALTER TABLE `objects_items_inventory` ADD CONSTRAINT `FK_objects_items_inventory_item` FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`) ON UPDATE CASCADE;

SET @dropForeignKey = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `objects_items_rewards` DROP FOREIGN KEY `objects_items_rewards_ibfk_1`')
    FROM `information_schema`.`TABLE_CONSTRAINTS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'objects_items_rewards'
        AND `CONSTRAINT_NAME` = 'objects_items_rewards_ibfk_1' AND `CONSTRAINT_TYPE` = 'FOREIGN KEY'
);
PREPARE dropForeignKeyStatement FROM @dropForeignKey;
EXECUTE dropForeignKeyStatement;
DEALLOCATE PREPARE dropForeignKeyStatement;
SET @dropForeignKey = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `objects_items_rewards` DROP FOREIGN KEY `FK_objects_items_rewards_object`')
    FROM `information_schema`.`TABLE_CONSTRAINTS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'objects_items_rewards'
        AND `CONSTRAINT_NAME` = 'FK_objects_items_rewards_object' AND `CONSTRAINT_TYPE` = 'FOREIGN KEY'
);
PREPARE dropForeignKeyStatement FROM @dropForeignKey;
EXECUTE dropForeignKeyStatement;
DEALLOCATE PREPARE dropForeignKeyStatement;
ALTER TABLE `objects_items_rewards` ADD CONSTRAINT `FK_objects_items_rewards_object` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Cascade player deletes to the scores detail too, the FK was missing in the databases upgraded from older versions
SET @dropForeignKey = (
    SELECT IF(0 = COUNT(*), 'SELECT 1', 'ALTER TABLE `scores_detail` DROP FOREIGN KEY `FK_scores_detail_players`')
    FROM `information_schema`.`TABLE_CONSTRAINTS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'scores_detail'
        AND `CONSTRAINT_NAME` = 'FK_scores_detail_players' AND `CONSTRAINT_TYPE` = 'FOREIGN KEY'
);
PREPARE dropForeignKeyStatement FROM @dropForeignKey;
EXECUTE dropForeignKeyStatement;
DEALLOCATE PREPARE dropForeignKeyStatement;
ALTER TABLE `scores_detail` ADD CONSTRAINT `FK_scores_detail_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON UPDATE CASCADE ON DELETE CASCADE;

-- Server health: the system memory and CPU used percent and the event loop delay limits that reject the new game
-- logins, the players arriving from other servers and the new scene rooms while the server is overloaded, a limit of
-- 0 is disabled, and with health/blockingEnabled set to 0 nothing is rejected and the health is only a monitor. The
-- administration panel shows the usage of every server in the dashboard and in the control panel, copy the
-- theme/admin files from the reldens package before starting the server ("reldens copyAdmin" and then
-- "reldens copyAdminFiles"), the admin templates now include server-usage.html
INSERT IGNORE INTO `config` (`scope`, `path`, `value`, `type`) VALUES
	('server', 'health/blockingEnabled', '1', 3),
	('server', 'health/checkIntervalMs', '5000', 2),
	('server', 'health/maxCpuPercent', '90', 2),
	('server', 'health/maxEventLoopDelayMs', '1000', 2),
	('server', 'health/maxMemoryPercent', '90', 2),
	('server', 'health/remoteStatusTimeoutMs', '3000', 2);

-- Allow the default administration role to send global chat messages (only when the default value was not changed)
UPDATE `config` SET `value` = '1,99,9000' WHERE `scope` = 'server' AND `path` = 'chat/messages/global_allowed_roles' AND `value` = '1,9000';

-- Name the levels sets without key and label after the class path that uses them (shown in the admin selectors)
UPDATE `skills_levels_set` AS `levels_set` INNER JOIN `skills_class_path` AS `class_path` ON `class_path`.`levels_set_id` = `levels_set`.`id` SET `levels_set`.`key` = `class_path`.`key`, `levels_set`.`label` = `class_path`.`label` WHERE `levels_set`.`key` IS NULL AND `levels_set`.`label` IS NULL;

-- Prefix the footstep markers with the animation start event, the sprite audio lookups always include the event prefix
UPDATE `audio_markers` SET `marker_key` = CONCAT('i_', `marker_key`) WHERE `marker_key` IN ('journeyman_right', 'journeyman_left', 'journeyman_up', 'journeyman_down', 'sorcerer_right', 'sorcerer_left', 'sorcerer_up', 'sorcerer_down', 'warlock_right', 'warlock_left', 'warlock_up', 'warlock_down', 'swordsman_right', 'swordsman_left', 'swordsman_up', 'swordsman_down', 'warrior_right', 'warrior_left', 'warrior_up', 'warrior_down');

-- Remove the unused rewards config rows, the drops read server/objects/drops and server/objects/actions
DELETE FROM `config` WHERE `scope` = 'server' AND `path` IN ('rewards/actions/disappearTime', 'rewards/actions/interactionsDistance', 'rewards/loginReward/enabled', 'rewards/playedTimeReward/enabled', 'rewards/playedTimeReward/time');

-- Inventory item instance custom data, the theme item growth keeps the level and experience of each item in it
SET @addItemsInventoryCustomData = (
    SELECT IF(
        0 = COUNT(*),
        'ALTER TABLE `items_inventory` ADD COLUMN `customData` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci AFTER `is_active`',
        'SELECT 1'
    )
    FROM `information_schema`.`COLUMNS`
    WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = 'items_inventory' AND `COLUMN_NAME` = 'customData'
);
PREPARE addItemsInventoryCustomDataStatement FROM @addItemsInventoryCustomData;
EXECUTE addItemsInventoryCustomDataStatement;
DEALLOCATE PREPARE addItemsInventoryCustomDataStatement;

-- Every feature enabled in the basic config is created or enabled, the quests feature was never added by an update
INSERT INTO `features` (`code`, `title`, `is_enabled`) VALUES
	('chat', 'Chat', 1),
	('objects', 'Objects', 1),
	('respawn', 'Respawn', 1),
	('inventory', 'Inventory', 1),
	('firebase', 'Firebase', 1),
	('actions', 'Actions', 1),
	('users', 'Users', 1),
	('audio', 'Audio', 1),
	('rooms', 'Rooms', 1),
	('admin', 'Admin', 1),
	('teams', 'Teams', 1),
	('rewards', 'Rewards', 1),
	('snippets', 'Snippets', 1),
	('ads', 'Ads', 1),
	('scores', 'Scores', 1),
	('quests', 'Quests', 1)
ON DUPLICATE KEY UPDATE `is_enabled` = VALUES(`is_enabled`);

-- Teleport object type
REPLACE INTO `objects_types` (`id`, `key`) VALUES
	(9, 'teleport');

-- Theme gameplay features configuration, every feature is disabled by default
INSERT IGNORE INTO `config` (`scope`, `path`, `value`, `type`) VALUES
	('client', 'players/skins/keys', 'warlock', 5),
	('server', 'autoRecovery/objects/enabled', '0', 3),
	('server', 'autoRecovery/objects/onlyOutOfBattle', '1', 3),
	('server', 'autoRecovery/objects/properties/hp', '1', 2),
	('server', 'autoRecovery/players/enabled', '0', 3),
	('server', 'autoRecovery/players/persistEveryTicks', '12', 2),
	('server', 'autoRecovery/players/properties/hp', '1', 2),
	('server', 'autoRecovery/tickMs', '5000', 2),
	('server', 'players/death/restorationItemKey', 'restoration_scroll', 1),
	('server', 'players/death/resurrectionAdsKey', 'resurrection-video', 1),
	('server', 'players/death/teleportToTown/enabled', '0', 3),
	('server', 'players/death/teleportToTown/roomId', '41', 2),
	('server', 'scores/obtainedScorePerPlayerLevelMultiplier', '0', 2),
	('server', 'scores/reset/checkIntervalMs', '60000', 2),
	('server', 'scores/reset/enabled', '0', 3),
	('server', 'scores/reset/lastPeriodKey', '', 1),
	('server', 'scores/reset/period', 'daily', 1),
	('server', 'scores/reset/resetDetails', '0', 3),
	('server', 'skins/adsKey', 'skin-ad-ticket', 1),
	('server', 'skins/adTicketItemKey', 'skin_ad_ticket', 1);

-- Sample items: restoration scroll, skin ticket, skin item and growing sword
REPLACE INTO `items_group` (`id`, `key`, `label`, `description`, `files_name`, `sort`, `items_limit`, `limit_per_item`) VALUES
	(7, 'skin', 'Skin', 'Changes the player look.', 'skin.png', 7, 1, 0);

REPLACE INTO `items_item` (`id`, `key`, `type`, `group_id`, `label`, `description`, `qty_limit`, `uses_limit`, `useTimeOut`, `execTimeOut`, `customData`) VALUES
	(9, 'restoration_scroll', 3, NULL, 'Restoration Scroll', 'Revives you where you died instead of in town.', 0, 1, NULL, NULL, '{"canBeDropped":false}'),
	(10, 'skin_ad_ticket', 5, NULL, 'Skin Ticket', 'Watch an ad to get a special skin.', 0, 1, NULL, NULL, '{"canBeDropped":false,"removeAfterUse":true}'),
	(11, 'skin_warlock_robe', 1, 7, 'Warlock Robe', 'Gives you the warlock look while equipped.', 0, 0, NULL, NULL, '{"canBeDropped":false,"skinKey":"warlock"}'),
	(12, 'growing_sword', 1, 1, 'Growing Sword', 'A sword that grows stronger with the experience you gain.', 0, 0, NULL, NULL, '{"canBeDropped":false,"growth":{"experienceShare":100,"modifiersIncreasePercentPerLevel":50,"requireEquipped":true,"levels":{"2":5,"3":30,"4":90,"5":200}}}');

REPLACE INTO `items_item_modifiers` (`id`, `item_id`, `key`, `property_key`, `operation`, `value`, `maxProperty`) VALUES
	(6, 12, 'atk', 'stats/atk', 1, '10', NULL);

-- Sample ads: the resurrection video on the game over and the skin ticket video
REPLACE INTO `ads` (`id`, `key`, `provider_id`, `type_id`, `width`, `height`, `position`, `top`, `bottom`, `left`, `right`, `replay`, `enabled`) VALUES
	(7, 'resurrection-video', 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 0),
	(8, 'skin-ad-ticket', 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 0);

REPLACE INTO `ads_event_video` (`id`, `ads_id`, `event_key`, `event_data`) VALUES
	(3, 7, 'reldens.gameOver', '{"rewardItemKey":"restoration_scroll","rewardItemQty":1,"replayCooldown":0}'),
	(4, 8, 'reldens.skinAdTicket', '{"rewardItemKey":"skin_warlock_robe","rewardItemQty":1,"replayCooldown":0}');

-- Sample teleport NPC in the town and the Tree kill score
REPLACE INTO `objects` (`id`, `room_id`, `layer_name`, `tile_index`, `class_type`, `object_class_key`, `client_key`, `title`, `private_params`, `client_params`, `enabled`) VALUES
	(43, 41, 'ground', 4640, 9, 'teleport_1', 'teleport_master_1', 'Portia', '{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true,"collisionType":4,"hasState":true,"destinations":{"1":{"room":"reldens-forest-level-1"},"2":{"room":"reldens-new-age-town-house-01"}}}', '{"content":"Hello traveler! Where would you like to go?","options":{"1":{"label":"Forest","value":1},"2":{"label":"House 1","value":2},"3":{"label":"Nowhere","value":3}},"ui":true,"autoStart":true,"animations":{"teleport_master_1_down":{"start":0,"end":2},"teleport_master_1_left":{"start":3,"end":5},"teleport_master_1_right":{"start":6,"end":8},"teleport_master_1_up":{"start":9,"end":11}}}', 1);

REPLACE INTO `objects_assets` (`object_asset_id`, `object_id`, `asset_type`, `asset_key`, `asset_file`, `extra_params`) VALUES
	(33, 43, 'spritesheet', 'teleport_master_1', 'people-quest-npc.png', '{"frameWidth":52,"frameHeight":71}');

UPDATE `objects` SET `private_params` = '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":170,"randomMovement":{"maxTiles":3},"killScore":8}' WHERE `id` = 6;

--

SET FOREIGN_KEY_CHECKS = 1;

--
