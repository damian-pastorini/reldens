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

--

SET FOREIGN_KEY_CHECKS = 1;

--
