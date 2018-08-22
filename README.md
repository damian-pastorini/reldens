# Quest World - Epic Adventure
#### MMORPG

Colyseus + MySQL + Phaser Implementation

## Database

### Users Entity

```mysql
CREATE TABLE `users` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`email` VARCHAR(255) NOT NULL,
	`username` VARCHAR(255) NOT NULL,
	`password` VARCHAR(255) NOT NULL,
	`role_id` INT(10) UNSIGNED NOT NULL,
	`status` INT(10) UNSIGNED NOT NULL,
	`state` TEXT NOT NULL,
	PRIMARY KEY (`id`),
	UNIQUE INDEX `email` (`email`),
	UNIQUE INDEX `username` (`username`)
)
ENGINE=InnoDB;
```
