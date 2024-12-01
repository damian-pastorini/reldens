--

SET FOREIGN_KEY_CHECKS = 0;

--

-- Unique Player name by user:
ALTER TABLE `players` DROP INDEX `name`, ADD UNIQUE INDEX `user_id_name` (`user_id`, `name`);

--

SET FOREIGN_KEY_CHECKS = 1;

--
