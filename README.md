# DwD - Game - MMORPG

## About this project
This is a really simple base MMORPG game created based on the Colyseus samples:

https://github.com/gamestdio/colyseus-examples

And on the Phaser 3 implementation from Jacky Rusly:

https://github.com/jackyrusly/jrgame

As you will see I've considerable modified how the jrgame interact with Socket.io in order to make it work as how the Colyseus example was created.
Another issue with that implementation is that all the game logic is on the client side which make the game really easy to hack. 

The game basics are login through DB, loader, scene change, players sync, other features like chat, items, or attacks were not implemented yet but they will be in future releases.

Please feel free to create any tickets or pull requests for questions, fixes or improvements.

Consider this is my first implementation ever, I never used neither Node.js, much less Parcel, Colyseus or Phaser (I'm coming from PHP and Magento to give you an idea). 

## Contributions and donations
If you like to contribute or donate to support the project please feel free to contact me at damian.pastorini@gmail.com.

## Built with
+ Node.js (Express.js)
+ Parcel
+ Colyseus
+ MySQL
+ Phaser 3

## NEWS & Coming soon!
Feb 19, 2019: Preparing a Vagrant VM ready to run the project (considering I've broke my environment after update the Node version, and also because there are a lot of updates on Phaser and Colyseus).
Feb 13, 2019: I've been a bit short on time to continue with the project (considerign it's free), but for sure I'll continue with it over the next months, so keep in touch!

#### For the next release (1.2.6):
+ P2world implementation on server side.
+ Client movement and impact calculations on server side as authority for client side correction to avoid possible hacks.

## Change Log
### 1.2.5
+ Moved scenes data into room state.
+ Fixed multi-player issue with undefined scenes.
+ Included repository data.

### 1.2.4
+ Implemented DynamicScenes information from database.

### 1.2.3
+ Fixed issues with multiple Colyseus rooms and Phaser scenes change.

### 1.2.2
+ Implemented multiple Colyseus rooms (one room for each Phaser scene).
+ Fixed database entity for scenes.
+ Fixed player save state, login, registration, and encrypted passwords.

### 1.2.1
+ Players state load / save feature.
+ Database entity for scenes.
+ Dynamic Phaser scenes and Colyseus rooms modules (to be implemented).

### 1.2.0
+ Base integration between Colyseus and Phaser 3.
+ Users entity.

## Installation
- Change the port configuration file as you need: ./server/config:
```json
{
    "port": "8080",
    "colyseus_monitor": true
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

This is the basic entity for users. In future implementations this will be related to multiple players creation by user.

##### Table creation:

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

### Scenes Entity

This entity is related to scenes creation from the administration panel (future feature not implemented yet).

##### Table creation:

```mysql
CREATE TABLE `scenes` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`name` VARCHAR(255) NOT NULL,
	`scene_map` VARCHAR(255) NOT NULL COMMENT 'The map JSON file name.',
	`image` VARCHAR(255) NOT NULL,
	`collisions` VARCHAR(255) NOT NULL COMMENT 'Collisions in JSON format.',
	`layers` VARCHAR(255) NOT NULL COMMENT 'Layers data in JSON format.',
	`return_positions` VARCHAR(255) NOT NULL COMMENT 'Return positions in JSON format.',
	PRIMARY KEY (`id`),
	UNIQUE INDEX `key` (`key`)
)
ENGINE=InnoDB
;
```

##### Fields description:

In the scenes entity, the scene_map field will be the full json file for the exported map.

Collisions JSON sample:

For:
```javascript
this.layers[6].setCollisionBetween(0, 1021);
this.layers[7].setCollisionBetween(105, 110);
this.layers[2].setCollisionByExclusion([-1, 67, 68, 69]);
``` 

We will have:
```json
[
    {"L":6, "C":"btw", "A":0, "B":1021},
    {"L":7, "C":"btw", "A":105, "B":110},
    {"L":2, "C":"exc", "A":[-1, 67, 68, 69]}
]
```

Layers collider, change points configuration and titleset animations:
For example:
```javascript
    create()
    {
        super.create(share.MAP_HOUSE_1, share.IMAGE_HOUSE, true);
        this.registerTilesetAnimation(this.layers[2]);
    }
```
And then:
```javascript
        this.physics.add.collider(player, this.layers[6]);
        this.physics.add.collider(player, this.layers[8]);
        this.physics.add.collider(player, this.layers[9]);
        this.physics.add.collider(player, this.layers[7], (sprite, tile) => {
            if (tile.index === 167) {
                this.nextSceneKey = share.HOUSE_1;
                this.onChangeScene();
            } else if (tile.index === 1661 || tile.index === 1662) {
                this.nextSceneKey = share.HOUSE_2;
                this.onChangeScene();
            }
        });
``` 

Will be:
```json
{
    "animation":[2],
    "collider":[6,8,9],
    "main":7,
    "change_points":
    [
        {"i":167, "n":"other_scene_key_1"},
        {"i":1661, "n":"other_scene_key_2"},
        {"i":1662, "n":"other_scene_key_2"}
    ]
}
```

The return positions are for scenes with multiple starting points.
For example:
```javascript
if (data === share.HOUSE_1 || Object.getOwnPropertyNames(data).length === 0){
    return { x: 225, y: 280, direction: share.DOWN };
} else if(data === share.HOUSE_2){
    return { x: 655, y: 470, direction: share.DOWN };
}
```

Will be:
```json
[
    {"P":"other_scene_key_1", "X":225, "Y":280, "D":1},
    {"P":"other_scene_key_2", "X":655, "Y":470, "D":0}
]
```
Note: the D=1, is to specified the default initial position.
