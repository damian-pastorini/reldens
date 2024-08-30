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
UPDATE `config` SET `value` = '260' WHERE `scope` = 'client' AND `path` = 'ui/minimap/camX';
UPDATE `config` SET `value` = '42' WHERE `scope` = 'client' AND `path` = 'ui/minimap/responsiveX';
UPDATE `config` SET `value` = '230' WHERE `scope` = 'client' AND `path` = 'ui/minimap/x';

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

--

SET FOREIGN_KEY_CHECKS = 1;

--
