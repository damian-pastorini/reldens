--
-- Reldens - Version beta.39.8 - SQL Update
-- Fix FK CASCADE for room deletions
--

SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing FK constraints on rooms_change_points
ALTER TABLE `rooms_change_points`
DROP FOREIGN KEY `FK_rooms_change_points_rooms`,
DROP FOREIGN KEY `FK_rooms_change_points_rooms_2`;

-- Add FK constraints with CASCADE on DELETE for rooms_change_points
ALTER TABLE `rooms_change_points`
ADD CONSTRAINT `FK_rooms_change_points_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `FK_rooms_change_points_rooms_2` FOREIGN KEY (`next_room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop existing FK constraints on rooms_return_points
ALTER TABLE `rooms_return_points`
DROP FOREIGN KEY `FK_rooms_return_points_rooms_from_room_id`,
DROP FOREIGN KEY `FK_rooms_return_points_rooms_room_id`;

-- Add FK constraints with CASCADE on DELETE for rooms_return_points
ALTER TABLE `rooms_return_points`
ADD CONSTRAINT `FK_rooms_return_points_rooms_from_room_id` FOREIGN KEY (`from_room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `FK_rooms_return_points_rooms_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;
