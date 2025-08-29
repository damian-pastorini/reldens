--

SET FOREIGN_KEY_CHECKS = 0;

--

-- Config:
INSERT INTO `config` (`scope`, `path`, `value`, `type`)
VALUES
    ('client', 'gameEngine/banner', '0', 3),
    ('client', 'gameEngine/dom/createContainer', '1', 3),
    ('client', 'gameEngine/height', '800', 2),
    ('client', 'gameEngine/parent', 'reldens', 1),
    ('client', 'gameEngine/physics/arcade/debug', 'false', 3),
    ('client', 'gameEngine/physics/arcade/gravity/x', '0', 2),
    ('client', 'gameEngine/physics/arcade/gravity/y', '0', 2),
    ('client', 'gameEngine/physics/default', 'arcade', 1),
    ('client', 'gameEngine/scale/autoCenter', '1', 2),
    ('client', 'gameEngine/scale/max/height', '800', 2),
    ('client', 'gameEngine/scale/max/width', '800', 2),
    ('client', 'gameEngine/scale/min/height', '360', 2),
    ('client', 'gameEngine/scale/min/width', '360', 2),
    ('client', 'gameEngine/scale/mode', '5', 2),
    ('client', 'gameEngine/scale/parent', 'reldens', 1),
    ('client', 'gameEngine/scale/zoom', '1', 2),
    ('client', 'gameEngine/type', '0', 2),
    ('client', 'gameEngine/width', '800', 2),
    ('client', 'general/gameEngine/updateGameSizeTimeOut', '500', 2),
    ('client', 'ui/maximum/x', '800', 2),
    ('client', 'ui/maximum/y', '800', 2),
    ('client', 'ui/screen/responsive', '1', 3),
    ('client', 'ui/minimap/camZoom', '0.08', 2)
    AS new_config
ON DUPLICATE KEY UPDATE `value` = new_config.`value`, `type` = new_config.`type`;

INSERT INTO `config` (`scope`, `path`, `value`, `type`)
VALUES
    ('client', 'gameEngine/scale/autoRound', 0, 3),
    ('client', 'ui/fullScreenButton/enabled', '1', 3),
    ('client', 'ui/fullScreenButton/responsiveX', '100', 2),
    ('client', 'ui/fullScreenButton/responsiveY', '0', 2),
    ('client', 'ui/fullScreenButton/x', '380', 2),
    ('client', 'ui/fullScreenButton/y', '20', 2);

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

--

SET FOREIGN_KEY_CHECKS = 1;

--
