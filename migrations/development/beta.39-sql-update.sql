--

SET FOREIGN_KEY_CHECKS = 0;

--

-- Config:
INSERT INTO `config` (`scope`, `path`, `value`, `type`)
VALUES
    ('client', 'gameEngine/banner', '0', 3),
    ('client', 'gameEngine/dom/createContainer', '1', 3),
    ('client', 'gameEngine/height', '1280', 2),
    ('client', 'gameEngine/parent', 'reldens', 1),
    ('client', 'gameEngine/physics/arcade/debug', 'false', 3),
    ('client', 'gameEngine/physics/arcade/gravity/x', '0', 2),
    ('client', 'gameEngine/physics/arcade/gravity/y', '0', 2),
    ('client', 'gameEngine/physics/default', 'arcade', 1),
    ('client', 'gameEngine/scale/autoCenter', '1', 2),
    ('client', 'gameEngine/scale/max/height', '1280', 2),
    ('client', 'gameEngine/scale/max/width', '1280', 2),
    ('client', 'gameEngine/scale/min/height', '360', 2),
    ('client', 'gameEngine/scale/min/width', '360', 2),
    ('client', 'gameEngine/scale/mode', '5', 2),
    ('client', 'gameEngine/scale/parent', 'reldens', 1),
    ('client', 'gameEngine/scale/zoom', '1', 2),
    ('client', 'gameEngine/type', '0', 2),
    ('client', 'gameEngine/width', '1280', 2),
    ('client', 'general/gameEngine/updateGameSizeTimeOut', '500', 2),
    ('client', 'ui/maximum/x', '1280', 2),
    ('client', 'ui/maximum/y', '1280', 2),
    ('client', 'ui/screen/responsive', '1', 3),
    ('client', 'ui/minimap/camZoom', '0.08', 2)
    AS new_config
ON DUPLICATE KEY UPDATE `value` = new_config.`value`, `type` = new_config.`type`;

INSERT INTO `config` (`scope`, `path`, `value`, `type`)
VALUES
    ('client', 'gameEngine/scale/autoRound', 0, 3),
    ('client', 'general/users/allowGuest', '1', 3),
    ('client', 'general/users/allowRegistration', '1', 3),
    ('client', 'ui/fullScreenButton/enabled', '1', 3),
    ('client', 'ui/fullScreenButton/responsiveX', '100', 2),
    ('client', 'ui/fullScreenButton/responsiveY', '0', 2),
    ('client', 'ui/fullScreenButton/x', '380', 2),
    ('client', 'ui/fullScreenButton/y', '20', 2)
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `type` = VALUES(`type`);

-- Delete incorrect config records that should not exist:
DELETE FROM `config` WHERE `scope` = 'client' AND `path` = 'gameEngine/scale/height';
DELETE FROM `config` WHERE `scope` = 'client' AND `path` = 'gameEngine/scale/width';

-- Fix incorrect config values:
UPDATE `config` SET `value` = '32' WHERE `scope` = 'client' AND `path` = 'map/tileData/height';
UPDATE `config` SET `value` = '32' WHERE `scope` = 'client' AND `path` = 'map/tileData/width';
UPDATE `config` SET `value` = '40' WHERE `scope` = 'client' AND `path` = 'ui/minimap/responsiveX';
UPDATE `config` SET `value` = '0' WHERE `scope` = 'server' AND `path` = 'rooms/world/tryClosestPath';

UPDATE `stats` SET `key` = 'mAtk' WHERE `key` = 'mgk-atk';
UPDATE `stats` SET `key` = 'mDef' WHERE `key` = 'mgk-def';

-- Skills owners table fix:
ALTER TABLE `skills_skill_owner_conditions` DROP INDEX `key`;

-- Level set table fix:
ALTER TABLE `skills_levels_set`
    ADD COLUMN `key` VARCHAR(255) NULL DEFAULT NULL AFTER `id`,
	ADD COLUMN `label` VARCHAR(255) NULL DEFAULT NULL AFTER `key`,
	ADD UNIQUE INDEX `key` (`key`);

-- Skills label fix:
ALTER TABLE `skills_skill`
    ADD COLUMN `label` VARCHAR(255) NULL DEFAULT NULL AFTER `type`;

-- New fields created_at and updated_at:
ALTER TABLE `ads`
    ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) AFTER `enabled`,
	ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `audio`
    ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) AFTER `enabled`,
	ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `audio_categories`
    ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) AFTER `single_audio`,
	ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `clan`
    ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) AFTER `level`,
	ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `items_item`
    ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) AFTER `customData`,
	ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `objects`
    ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) AFTER `enabled`,
	ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `players`
    ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `respawn`
    ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) AFTER `layer`,
	ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `rewards`
    ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) AFTER `has_drop_body`,
	ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `rooms`
    ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) AFTER `customData`,
	ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `scores`
    ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) AFTER `last_npc_kill_time`,
	ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `skills_class_path`
    ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) AFTER `enabled`,
	ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `skills_levels_set`
    ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) AFTER `autoFillExperienceMultiplier`,
	ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `skills_skill`
    ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) AFTER `customData`,
	ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `snippets`
    ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) AFTER `value`,
	ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `stats`
    ADD COLUMN `created_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) AFTER `customData`,
	ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- Update root user password:
UPDATE `users` SET `password`='879abc0494b36a09f184fd8308ea18f2643d71263f145b1e40e2ec3546d42202:6a186aff4d69daadcd7940a839856b394b12f0aec64a5df745c83cf9d881dc9dcb121b03d946872571f214228684216df097305b68417a56403299b8b2388db3' WHERE `username` = 'root';

-- Fix operation types:
ALTER TABLE `operation_types` CHANGE COLUMN `label` `label` VARCHAR(50) NULL COLLATE 'utf8mb4_unicode_ci' AFTER `id`;
ALTER TABLE `skills_levels_modifiers` DROP FOREIGN KEY `FK_skills_levels_modifiers_operation_types`;
ALTER TABLE `skills_levels_modifiers` ADD CONSTRAINT `FK_skills_levels_modifiers_operation_types` FOREIGN KEY (`operation`) REFERENCES `operation_types` (`key`) ON UPDATE CASCADE ON DELETE NO ACTION;
ALTER TABLE `skills_skill_target_effects` DROP FOREIGN KEY `FK_skills_skill_target_effects_operation_types`;
ALTER TABLE `skills_skill_target_effects` ADD CONSTRAINT `FK_skills_skill_target_effects_operation_types` FOREIGN KEY (`operation`) REFERENCES `operation_types` (`key`) ON UPDATE CASCADE ON DELETE NO ACTION;
ALTER TABLE `clan_levels_modifiers` DROP FOREIGN KEY `FK_clan_levels_modifiers_operation_types`;
ALTER TABLE `clan_levels_modifiers` ADD CONSTRAINT `FK_clan_levels_modifiers_operation_types` FOREIGN KEY (`operation`) REFERENCES `operation_types` (`key`) ON UPDATE CASCADE ON DELETE NO ACTION;

-- Fix target options:
ALTER TABLE `target_options` CHANGE COLUMN `target_label` `target_label` VARCHAR(50) NULL DEFAULT NULL COLLATE 'utf8mb4_unicode_ci' AFTER `target_key`;

-- Fix scores FK:
ALTER TABLE `scores` ADD CONSTRAINT `FK_scores_players` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON UPDATE CASCADE ON DELETE CASCADE;

-- Fix drops animations KF:
ALTER TABLE `drops_animations` DROP FOREIGN KEY `FK_drops_animations_items_item`;
ALTER TABLE `drops_animations` ADD CONSTRAINT `FK_drops_animations_items_item` FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`) ON UPDATE CASCADE ON DELETE CASCADE;

-- Apply missing unique constraints:
ALTER TABLE `players_state` ADD UNIQUE INDEX `player_id` (`player_id`); -- players can describe only in one place
ALTER TABLE `skills_skill_attack` ADD UNIQUE INDEX `skill_id_unique` (`skill_id`); -- skills attack data is in a single entity
ALTER TABLE `skills_skill_group_relation` ADD UNIQUE INDEX `skill_id_unique` (`skill_id`); -- skills can only be related to one group
ALTER TABLE `skills_skill_physical_data` ADD UNIQUE INDEX `skill_id` (`skill_id`); -- skill physical data is in a single entity
ALTER TABLE `drops_animations` ADD UNIQUE INDEX `item_id_unique` (`item_id`); -- an item can only have one drop animation

-- Fix kill_time default value:
ALTER TABLE `scores_detail` MODIFY COLUMN `kill_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Fix data types: INT to TINYINT
ALTER TABLE `locale` MODIFY COLUMN `enabled` TINYINT UNSIGNED DEFAULT NULL;

ALTER TABLE `ads_providers` MODIFY COLUMN `enabled` TINYINT UNSIGNED NOT NULL DEFAULT (1);

ALTER TABLE `ads` MODIFY COLUMN `enabled` TINYINT UNSIGNED NOT NULL DEFAULT '0';

ALTER TABLE `audio_categories`
    MODIFY COLUMN `enabled` TINYINT DEFAULT NULL,
    MODIFY COLUMN `single_audio` TINYINT DEFAULT NULL;

ALTER TABLE `audio` MODIFY COLUMN `enabled` TINYINT UNSIGNED DEFAULT NULL;

ALTER TABLE `chat_message_types` MODIFY COLUMN `show_tab` TINYINT UNSIGNED DEFAULT NULL;

ALTER TABLE `features` MODIFY COLUMN `is_enabled` TINYINT UNSIGNED DEFAULT NULL;

ALTER TABLE `items_inventory` MODIFY COLUMN `is_active` TINYINT NULL DEFAULT NULL;

ALTER TABLE `objects` MODIFY COLUMN `enabled` TINYINT DEFAULT NULL;

ALTER TABLE `objects_items_inventory` MODIFY COLUMN `is_active` TINYINT DEFAULT NULL;

ALTER TABLE `objects_items_requirements` MODIFY COLUMN `auto_remove_requirement` TINYINT UNSIGNED DEFAULT NULL;

ALTER TABLE `objects_items_rewards` MODIFY COLUMN `reward_item_is_required` TINYINT UNSIGNED DEFAULT NULL;

ALTER TABLE `rooms_return_points` MODIFY COLUMN `is_default` TINYINT UNSIGNED DEFAULT NULL;

ALTER TABLE `skills_levels_set` MODIFY COLUMN `autoFillRanges` TINYINT UNSIGNED DEFAULT NULL;

ALTER TABLE `skills_skill`
    MODIFY COLUMN `autoValidation` TINYINT DEFAULT NULL,
    MODIFY COLUMN `rangeAutomaticValidation` TINYINT DEFAULT NULL,
    MODIFY COLUMN `allowSelfTarget` TINYINT DEFAULT NULL;

ALTER TABLE `skills_class_path` MODIFY COLUMN `enabled` TINYINT UNSIGNED DEFAULT NULL;

ALTER TABLE `skills_skill_attack`
    MODIFY COLUMN `allowEffectBelowZero` TINYINT UNSIGNED NULL DEFAULT NULL,
    MODIFY COLUMN `applyDirectDamage` TINYINT UNSIGNED NULL DEFAULT NULL,
    MODIFY COLUMN `dodgeFullEnabled` TINYINT NULL DEFAULT '1',
    MODIFY COLUMN `dodgeOverAimSuccess` TINYINT NULL DEFAULT '1',
    MODIFY COLUMN `damageAffected` TINYINT NULL DEFAULT NULL,
    MODIFY COLUMN `criticalAffected` TINYINT NULL DEFAULT NULL;

ALTER TABLE `skills_skill_physical_data` MODIFY COLUMN `validateTargetOnHit` TINYINT UNSIGNED NULL DEFAULT NULL;

ALTER TABLE `rewards_events` MODIFY COLUMN `enabled` TINYINT DEFAULT NULL;

--

SET FOREIGN_KEY_CHECKS = 1;

--
