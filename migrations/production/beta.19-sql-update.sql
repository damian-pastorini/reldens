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

# Audio markers fix:

TRUNCATE audio_markers;

SET @reldens_town_audio_id = (SELECT id FROM audio WHERE `audio_key` = 'ReldensTownAudio');
SET @footstep_audio_id = (SELECT id FROM audio WHERE `audio_key` = 'footstep');

INSERT INTO `audio_markers` (`id`, `audio_id`, `marker_key`, `start`, `duration`, `config`) VALUES
    (NULL, @reldens_town_audio_id, 'ReldensTown', 0, 41, NULL),
    (NULL, @footstep_audio_id,'journeyman_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'journeyman_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'journeyman_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'journeyman_down', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_journeyman_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_journeyman_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_journeyman_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_journeyman_down', 0, 1, NULL),
    (NULL, @footstep_audio_id,'sorcerer_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'sorcerer_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'sorcerer_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'sorcerer_down', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_sorcerer_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_sorcerer_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_sorcerer_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_sorcerer_down', 0, 1, NULL),
    (NULL, @footstep_audio_id,'warlock_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'warlock_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'warlock_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'warlock_down', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_warlock_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_warlock_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_warlock_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_warlock_down', 0, 1, NULL),
    (NULL, @footstep_audio_id,'swordsman_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'swordsman_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'swordsman_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'swordsman_down', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_swordsman_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_swordsman_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_swordsman_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_swordsman_down', 0, 1, NULL),
    (NULL, @footstep_audio_id,'warrior_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'warrior_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'warrior_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'warrior_down', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_warrior_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_warrior_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_warrior_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_warrior_down', 0, 1, NULL);

## -------------------------------------------------------------------------------------------------------------------

# Chat FK fixes:

ALTER TABLE `chat`
	DROP FOREIGN KEY `FK__players`,
	DROP FOREIGN KEY `FK__players_2`,
	DROP FOREIGN KEY `FK__scenes`;

ALTER TABLE `chat`
	ADD CONSTRAINT `FK__players` FOREIGN KEY (`player_id`) REFERENCES `reldens`.`players` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
	ADD CONSTRAINT `FK__players_2` FOREIGN KEY (`private_player_id`) REFERENCES `reldens`.`players` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
	ADD CONSTRAINT `FK__scenes` FOREIGN KEY (`room_id`) REFERENCES `reldens`.`rooms` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION;

## -------------------------------------------------------------------------------------------------------------------

# Items table new fields:

ALTER TABLE `items_item`
	ADD COLUMN `type` INT(10) NOT NULL DEFAULT '0' AFTER `key`,
	ADD COLUMN `customData` TEXT NULL AFTER `execTimeOut`;

# Items group images:

ALTER TABLE `items_group` ADD COLUMN `files_name` TEXT NULL DEFAULT NULL AFTER `description`;

# New test data:

UPDATE `items_group` AS `ig` SET `ig`.`files_name` = CONCAT(`ig`.`key`, '.png');

UPDATE `items_item` AS `i` SET `i`.`type` = 3 WHERE `key` = 'coins';

UPDATE `items_item` AS `i` SET `i`.`type` = 0 WHERE `key` = 'branch';

UPDATE `items_item` AS `i` SET
    `i`.`type` = 5,
    `i`.`customData` = '{"removeAfterUse":true,"animationData":{"frameWidth":64,"frameHeight":64,"start":6,"end":11,"repeat":0,"hide":true,"destroyOnComplete":true,"usePlayerPosition":true,"closeInventoryOnUse":true,"followPlayer":true,"startsOnTarget":true}}'
    WHERE `key` = 'heal_potion_20';

UPDATE `items_item` AS `i` SET
    `i`.`type` = 5,
    `i`.`customData` = '{"removeAfterUse":true,"animationData":{"frameWidth":64,"frameHeight":64,"start":6,"end":11,"repeat":0,"hide":true,"destroyOnComplete":true,"usePlayerPosition":true,"closeInventoryOnUse":true,"followPlayer":true,"startsOnTarget":true}}'
    WHERE `key` = 'magic_potion_20';

UPDATE `items_item` AS `i` SET
    `i`.`type` = 4,
    `i`.`customData` = '{"animationData":{"frameWidth":64,"frameHeight":64,"start":6,"end":11,"repeat":0,"hide":true,"destroyOnComplete":true,"usePlayerPosition":true,"closeInventoryOnUse":true,"followPlayer":true,"startsOnTarget":true}}'
    WHERE `key` = 'axe';

UPDATE `items_item` AS `i` SET
    `i`.`type` = 4,
    `i`.`customData` = '{"animationData":{"frameWidth":64,"frameHeight":64,"start":6,"end":11,"repeat":0,"hide":true,"destroyOnComplete":true,"usePlayerPosition":true,"closeInventoryOnUse":true,"followPlayer":true,"startsOnTarget":true}}'
    WHERE `key` = 'spear';

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
