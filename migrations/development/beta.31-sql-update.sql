#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# Sample player fix:
REPLACE INTO `players_state` (`id`, `player_id`, `room_id`, `x`, `y`, `dir`) VALUES
	(1, 1, 5, 332, 288, 'down');

REPLACE INTO `players_stats` (`id`, `player_id`, `stat_id`, `base_value`, `value`) VALUES
	(1, 1, 1, 280, 81),
	(2, 1, 2, 280, 85),
	(3, 1, 3, 280, 400),
	(4, 1, 4, 280, 280),
	(5, 1, 5, 100, 100),
	(6, 1, 6, 100, 100),
	(7, 1, 7, 100, 100),
	(8, 1, 8, 100, 100),
	(9, 1, 9, 100, 100),
	(10, 1, 10, 100, 100);

# Config:
SET @boolean_id = (SELECT `id` FROM `config_types` WHERE `label` = 'boolean');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'players/physicsBody/usePlayerSpeedConfig', '0', @boolean_id);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'players/physicsBody/usePlayerSpeedProperty', '0', @boolean_id);

# Rooms:
UPDATE `rooms` SET `name` = 'reldens-forest' WHERE `name` = 'ReldensForest';
UPDATE `rooms` SET `name` = 'reldens-house-1' WHERE `name` = 'ReldensHouse_1';
UPDATE `rooms` SET `name` = 'reldens-house-2' WHERE `name` = 'ReldensHouse_2';
UPDATE `rooms` SET `name` = 'reldens-town' WHERE `name` = 'ReldensTown';
UPDATE `rooms` SET `name` = 'reldens-house-1-2d-floor' WHERE `name` = 'ReldensHouse_1b';
UPDATE `rooms` SET `name` = 'reldens-gravity' WHERE `name` = 'TopDownRoom';

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
