#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# Config:
UPDATE `config` SET `value` = '1' WHERE `path` = 'rooms/selection/allowOnLogin';
UPDATE `config` SET `value` = '1' WHERE `path` = 'rooms/selection/allowOnRegistration';
DELETE FROM `config` WHERE `path` = 'rooms/world/gravity_enabled';

# Rooms:
ALTER TABLE `rooms`	ADD COLUMN `customData` TEXT NULL COLLATE 'utf8_unicode_ci' AFTER `room_class_key`;

# Top-Down room demo:
INSERT INTO `rooms` (`id`, `name`, `title`, `map_filename`, `scene_images`, `room_class_key`, `customData`) VALUES (NULL, 'TopDownRoom', 'Gravity World!', 'reldens-gravity', 'reldens-forest', NULL, '{"gravity":[0,625],"applyGravity":true,"allowPassWallsFromBelow":true}');

SET @reldens_top_down_demo_room_id = (SELECT `id` FROM `rooms` WHERE `name` = 'TopDownRoom');
INSERT INTO `rooms_return_points` (`id`, `room_id`, `direction`, `x`, `y`, `is_default`, `from_room_id`) VALUES (NULL, @reldens_top_down_demo_room_id, 'left', 450, 600, 0, NULL);

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
