# Quest World - Epic Adventure
#### MMORPG

## Built with
+ Node.js (Express.js)
+ Parcel
+ Colyseus
+ MySQL
+ Phaser 3

## Installation
- Change the configuration file as you need: ./server/config:
```json
{
    "port": "8080"
}
```
- Then run the following commands:
```
$ git clone git@bitbucket.org:dwdeveloper/questworld.git
$ cd questworld
$ npm install
$ npm start
```

The project runs on localhost or any domain that points to the server and the proper port.

## Database

Server configuration samples:

/server/config/database.json
```json
{
    "host": "localhost",
    "user": "root",
    "password": "root",
    "database": "database_name"
}
```

/server/config/database_pool.json
```json
{
    "host": "localhost",
    "user": "root",
    "password": "root",
    "database": "database_name",
    "connectionLimit": 10
}
```

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
