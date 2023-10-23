#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# Fix chat message types:
SET @global_id = (SELECT `id` FROM `chat_message_types` WHERE `key` = 'global');
UPDATE `chat` SET `message_type` = @global_id WHERE `message_type` = 'g';
UPDATE `chat` SET `message_type` = @global_id WHERE `message_type` = NULL;
UPDATE `chat` SET `message_type` = @global_id WHERE `message_type` IS NULL;

# Disable ads by default:
UPDATE `ads_providers` SET `enabled` = 0;
UPDATE `ads` SET `enabled` = 0;

UPDATE `config` SET `value` = 0 WHERE `path` = 'ads/general/providers/gameMonetize/enabled' OR `path` = 'ads/general/providers/crazyGames/enabled';
UPDATE `config` SET `value` = 250 WHERE `path` = 'ui/minimap/x' OR `path` = 'ui/minimap/circleX';

# Group walls config:
SET @boolean_id = (SELECT `id` FROM `config_types` WHERE `label` = 'boolean');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'rooms/world/groupWallsHorizontally', '1', @boolean_id);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'rooms/world/groupWallsVertically', '0', @boolean_id);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'world/debug/enabled', '0', @boolean_id);

# Features:
INSERT INTO `features` VALUES (NULL, 'world', 'World', 1);

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
