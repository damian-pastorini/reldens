--

SET FOREIGN_KEY_CHECKS = 0;

--

-- Config:
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'scores/obtainedScorePerPlayer', '10', 2);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'scores/obtainedScorePerNpc', '5', 2);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'scores/useNpcCustomScore', '1', 3);

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

--

SET FOREIGN_KEY_CHECKS = 1;

--
