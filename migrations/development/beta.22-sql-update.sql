#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# Config:
INSERT INTO `config` VALUES(NULL, 'client', 'objects/npc/invalidOptionMessage', 'I do not understand.', 't');
DELETE FROM `config` WHERE `path` = 'ui/minimap/roundMap';
INSERT INTO `config` VALUES(NULL, 'client', 'ui/minimap/roundMap', '1', 'b');

# Played Time:
ALTER TABLE `users`
	CHANGE COLUMN `email` `email` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci' AFTER `id`,
	CHANGE COLUMN `username` `username` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci' AFTER `email`,
	CHANGE COLUMN `password` `password` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci' AFTER `username`,
	CHANGE COLUMN `status` `status` VARCHAR(255) NOT NULL COLLATE 'utf8_unicode_ci' AFTER `role_id`,
	ADD COLUMN `played_time` INT(10) NOT NULL DEFAULT 0 AFTER `updated_at`;

INSERT INTO `config` VALUES(NULL, 'client', 'players/playedTime/show', '2', 'i');
INSERT INTO `config` VALUES(NULL, 'client', 'players/playedTime/label', 'Played Time:<br/>', 't');

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
