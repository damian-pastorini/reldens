--

SET FOREIGN_KEY_CHECKS = 0;

--

-- Player stats bars configuration
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES
('client', 'players/barsProperties', '{"hp":{"enabled":true,"label":"HP","activeColor":"#d53434","inactiveColor":"#330000"},"mp":{"enabled":true,"label":"MP","activeColor":"#5959fb","inactiveColor":"#000033"}}', 4);

-- Update config
UPDATE `config` SET `value` = '0' WHERE `path` = 'gameEngine/scale/autoRound';

--

SET FOREIGN_KEY_CHECKS = 1;

--
