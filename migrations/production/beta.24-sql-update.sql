#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# Config:
UPDATE `config` SET `value` = '1' WHERE `path` = 'rooms/selection/allowOnLogin';
UPDATE `config` SET `value` = '1' WHERE `path` = 'rooms/selection/allowOnRegistration';
UPDATE `config` SET `path` = 'rooms/world/timeStep' WHERE `path` = 'rooms/world/timestep';
DELETE FROM `config` WHERE `path` = 'rooms/world/gravity_enabled';
INSERT INTO `config` VALUES(NULL, 'client', 'general/engine/clientInterpolation', '1', 'b');
INSERT INTO `config` VALUES(NULL, 'client', 'general/engine/interpolationSpeed', '0.4', 'i');

# Rooms:
ALTER TABLE `rooms`	ADD COLUMN `customData` TEXT NULL COLLATE 'utf8_unicode_ci' AFTER `room_class_key`;

# Top-Down room demo:
INSERT INTO `rooms` (`id`, `name`, `title`, `map_filename`, `scene_images`, `room_class_key`, `customData`) VALUES (NULL, 'TopDownRoom', 'Gravity World!', 'reldens-gravity', 'reldens-forest', NULL, '{"gravity":[0,625],"applyGravity":true,"allowPassWallsFromBelow":true,"timeStep":0.012}');

SET @reldens_top_down_demo_room_id = (SELECT `id` FROM `rooms` WHERE `name` = 'TopDownRoom');
INSERT INTO `rooms_return_points` (`id`, `room_id`, `direction`, `x`, `y`, `is_default`, `from_room_id`) VALUES (NULL, @reldens_top_down_demo_room_id, 'left', 340, 600, 0, NULL);

SET @reldens_house2_room_id = (SELECT `id` FROM `rooms` WHERE `name` = 'ReldensHouse_2');
INSERT INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES (NULL, @reldens_top_down_demo_room_id, 540, @reldens_house2_room_id);
INSERT INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES (NULL, @reldens_house2_room_id, 500, @reldens_top_down_demo_room_id);
INSERT INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES (NULL, @reldens_house2_room_id, 780, @reldens_top_down_demo_room_id);

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
