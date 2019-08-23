-- Dumping structure for table reldens.users_stats
CREATE TABLE `users_stats` (
    `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT(10) UNSIGNED NOT NULL,
    `hp` INT(10) UNSIGNED NOT NULL,
    `mp` INT(10) UNSIGNED NOT NULL,
    `stamina` INT(10) UNSIGNED NOT NULL,
    `atk` INT(10) UNSIGNED NOT NULL,
    `def` INT(10) UNSIGNED NOT NULL,
    `dodge` INT(10) UNSIGNED NOT NULL,
    `speed` INT(10) UNSIGNED NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `user_id` (`user_id`),
    CONSTRAINT `FK__users_users_stats` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB AUTO_INCREMENT=1;

-- Set default values for every user:
INSERT INTO `users_stats` (`user_id`, `hp`, `mp`, `stamina`, `atk`, `def`, `dodge`, `speed`) SELECT users.id, 100, 100, 100, 100, 100, 100, 100 FROM users;
