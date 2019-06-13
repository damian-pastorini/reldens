# Reldens - MMORPG

## About this project
This is a really simple base MMORPG game created based on the [Colyseus samples](https://github.com/gamestdio/colyseus-examples "Colyseus Examples") and on the Phaser 3 implementation from [Jacky Rusly](https://github.com/jackyrusly/jrgame "Jacky Rusly").

As you will see I've considerable modified how the jrgame interact with Socket.io in order to make it work as how the Colyseus example was created.
Another issue with that implementation is that all the game logic is on the client side which make the game really easy to hack.
To avoid any possible client-hacks I've moved the logic to the server side using P2JS (part of Phaser 3 physics), you can see a the basic of it here: [P2JS - Tiled Map - Demo](https://github.com/damian-pastorini/p2js-tiledmap-demo "P2JS - Tiled Map - Demo").

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

## [Coming soon and news!](https://github.com/damian-pastorini/reldens/wiki/Coming-soon-&-News "Coming soon & News archive") > Last update June 13, 2019.

## [Change Log](https://github.com/damian-pastorini/dwdgame/wiki/Change-Log "Change Log")

## [Installation](https://github.com/damian-pastorini/dwdgame/wiki/Installation "Installation")

#### [By DwDeveloper](https://www.dwdeveloper.com/ "DwDeveloper")
