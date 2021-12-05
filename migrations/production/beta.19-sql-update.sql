#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# Admin pack:

INSERT INTO `features` (`code`, `title`, `is_enabled`) VALUES ('admin', 'Admin', '1');

## -------------------------------------------------------------------------------------------------------------------

# Audio improvement:

ALTER TABLE `audio` ADD COLUMN `enabled` INT(10) UNSIGNED NULL DEFAULT '1' AFTER `category_id`;
ALTER TABLE `audio` CHANGE COLUMN `files_name` `files_name` TEXT NOT NULL COLLATE 'utf8_unicode_ci' AFTER `audio_key`;
ALTER TABLE `audio_markers` DROP FOREIGN KEY `FK_audio_markers_audio`;
ALTER TABLE `audio_markers` ADD CONSTRAINT `FK_audio_markers_audio` FOREIGN KEY (`audio_id`) REFERENCES `reldens`.`audio` (`id`) ON UPDATE CASCADE ON DELETE CASCADE;

UPDATE `items_group` AS `ig` SET `ig`.`files_name` = CONCAT(`ig`.`key`, '.png');

# Chat FK fixes:

ALTER TABLE `chat`
	DROP FOREIGN KEY `FK__players`,
	DROP FOREIGN KEY `FK__players_2`,
	DROP FOREIGN KEY `FK__scenes`;

ALTER TABLE `chat`
	ADD CONSTRAINT `FK__players` FOREIGN KEY (`player_id`) REFERENCES `reldens`.`players` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
	ADD CONSTRAINT `FK__players_2` FOREIGN KEY (`private_player_id`) REFERENCES `reldens`.`players` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
	ADD CONSTRAINT `FK__scenes` FOREIGN KEY (`room_id`) REFERENCES `reldens`.`rooms` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION;

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
