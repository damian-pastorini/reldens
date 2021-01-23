#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################
# Config:

UPDATE `config` SET `value`=0 WHERE `path`='ui/chat/defaultOpen';
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'players/animations/collideWorldBounds', '1', 'b');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'rooms/world/bulletsStopOnPlayer', '1', 'b');

# Path new room:
INSERT INTO `rooms` (`id`, `name`, `title`, `map_filename`, `scene_images`, `room_class_key`) VALUES (6, 'ReldensHouse_1b', 'House - 1 - Floor 2', 'reldens-house-1-2d-floor', 'reldens-house-1-2d-floor', NULL);
INSERT INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES (11, 2, 623, 6);
INSERT INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES (12, 2, 663, 6);
INSERT INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES (13, 6, 624, 2);
INSERT INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES (14, 6, 664, 2);
INSERT INTO `rooms_return_points` (`id`, `room_id`, `direction`, `x`, `y`, `is_default`, `to_room_id`) VALUES (9, 6, 'right', 820, 500, 0, 2);
INSERT INTO `rooms_return_points` (`id`, `room_id`, `direction`, `x`, `y`, `is_default`, `to_room_id`) VALUES (10, 6, 'right', 820, 500, 0, 2);
INSERT INTO `rooms_return_points` (`id`, `room_id`, `direction`, `x`, `y`, `is_default`, `to_room_id`) VALUES (11, 2, 'left', 720, 540, 0, 6);

# Rename field "to_room_id" to "from_room_id":
ALTER TABLE `rooms_return_points`
	DROP FOREIGN KEY `FK_scenes_return_points_rooms_2`;
ALTER TABLE `rooms_return_points`
	CHANGE COLUMN `to_room_id` `from_room_id` INT(11) UNSIGNED NULL DEFAULT NULL AFTER `is_default`,
	DROP INDEX `FK_scenes_return_points_rooms_2`,
	ADD INDEX `FK_scenes_return_points_rooms_2` (`from_room_id`) USING BTREE;
ALTER TABLE `rooms_return_points`
	ADD CONSTRAINT `FK_rooms_return_points_rooms` FOREIGN KEY (`from_room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE;
ALTER TABLE `rooms_return_points`
	DROP FOREIGN KEY `FK_scenes_return_points_rooms`;
ALTER TABLE `rooms_return_points`
	ADD CONSTRAINT `FK_scenes_return_points_rooms` FOREIGN KEY (`room_id`) REFERENCES `reldens`.`rooms` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE `rooms_return_points`
	DROP FOREIGN KEY `FK_rooms_return_points_rooms`,
	DROP FOREIGN KEY `FK_scenes_return_points_rooms`;
ALTER TABLE `rooms_return_points`
	ADD CONSTRAINT `FK_rooms_return_points_rooms_from_room_id` FOREIGN KEY (`from_room_id`) REFERENCES `reldens`.`rooms` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
	ADD CONSTRAINT `FK_rooms_return_points_rooms_room_id` FOREIGN KEY (`room_id`) REFERENCES `reldens`.`rooms` (`id`) ON UPDATE CASCADE ON DELETE NO ACTION;


#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
