# DwD - Game - MMORPG

## About this project
This is a really simple base MMORPG game created based on the Colyseus samples:

https://github.com/gamestdio/colyseus-examples

And on the Phaser 3 implementation from Jacky Rusly:

https://github.com/jackyrusly/jrgame

As you will see I've considerable modified how the jrgame interact with Socket.io in order to make it work as how the Colyseus example was created.

The game basics are login through DB, loader, scene change, players sync, nothing like chat, items, or attacks was implemented here.

Please feel free to create any tickets or pull requests for questions, fixes or improvements.

Consider this is my first implementation ever, I never used neither Node.js, much less Parcel, Colyseus or Phaser (I'm coming from PHP and Magento to give you an idea). 

## Built with
+ Node.js (Express.js)
+ Parcel
+ Colyseus
+ MySQL
+ Phaser 3

## Installation
- Change the port configuration file as you need: ./server/config:
```json
{
    "port": "8080"
}
```
- Then run the following commands:
```
$ git clone git@github.com:damian-pastorini/dwdgame.git
$ cd dwdgame
$ mkdir dist
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
