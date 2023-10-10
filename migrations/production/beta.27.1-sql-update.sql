#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

SET @global_id = (SELECT `id` FROM `chat_message_types` WHERE `key` = 'global');
UPDATE `chat` SET `message_type` = @global_id WHERE `message_type` = 'g';
UPDATE `chat` SET `message_type` = @global_id WHERE `message_type` = NULL;
UPDATE `chat` SET `message_type` = @global_id WHERE `message_type` IS NULL;

UPDATE `ads_providers` SET `enabled` = 0;
UPDATE `ads` SET `enabled` = 0;

UPDATE `config` SET `value` = 0 WHERE `path` = 'ads/general/providers/gameMonetize/enabled' OR `path` = 'ads/general/providers/crazyGames/enabled';

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
