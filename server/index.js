const config = require('./config/config');
const http = require('http');
const path = require('path');
const express = require('express');
const DataLink = require('./modules/datalink');
const Parcel = require('parcel-bundler');
const Colyseus = require('colyseus');
const RoomGame = require('./modules/room-game');
const RoomScene = require('./modules/room-scene');
const RoomChat = require('./modules/room-chat');
const share = require('../shared/constants');
// server:
const app = express();
const port = Number(config.app.port);
const server = http.createServer(app);
// game server:
const gameServer = new Colyseus.Server({server: server});
// main room:
gameServer.register(share.ROOM_GAME, RoomGame);
// game monitor:
if(config.app.colyseusMonitor){
    const monitor = require('@colyseus/monitor');
    // (optional) attach web monitoring panel:
    app.use('/colyseus', monitor.monitor(gameServer));
    console.log('NOTIFICATION - Attached Colyseus Monitor.');
}
// server shutdown:
gameServer.onShutdown(function(){
    console.log('NOTIFICATION - Game Server is going down.');
});
// @TODO: optimize the query.
// loading scenes data:
let queryString = `SELECT 
    s.*, 
    CONCAT('[', 
        GROUP_CONCAT(
            DISTINCT 
                '{"i":"', sc.tile_index, 
                '", "n":', (SELECT CONCAT('"', name, '"') FROM scenes WHERE id = sc.next_scene_id),
                 '}' 
            SEPARATOR ','),
    ']') as change_points,
    CONCAT('[', 
        GROUP_CONCAT(
            DISTINCT 
                '{"D":"', sr.direction, 
                '", "X":', sr.x,
                 ', "Y":', sr.y,
                 (IF (sr.is_default IS NULL, '', (CONCAT(', "De":', sr.is_default)))),
                 (IF(sr.to_scene_id IS NULL, '', (CONCAT(', "P":', (SELECT CONCAT('"', name, '"') FROM scenes WHERE id = sr.to_scene_id))))),
                 '}' 
            SEPARATOR ','),
    ']') as return_positions
FROM scenes AS s
LEFT JOIN scenes_change_points AS sc
ON s.id = sc.scene_id
LEFT JOIN scenes_return_points AS sr
ON s.id = sr.scene_id
GROUP BY s.id`;
let serverInitProm = DataLink.query(queryString);
// parsing data to register in the server:
serverInitProm.then((rows) => {
    let counter = 0;
    // @TODO: optimize and remove all the JSON.parse.
    // @NOTE: we only need to send the basic data to the client and do all the associations on the client side.
    // register room-scenes from database:
    for(let scene of rows){
        let temp = {
            sceneId: scene.id,
            sceneName: scene.name,
            sceneMap: scene.scene_map,
            sceneImages: scene.scene_images,
            changePoints: JSON.parse(scene.change_points),
            returnPositions: JSON.parse(scene.return_positions)
        };
        console.log('Registered scene: '+scene.name);
        gameServer.register(scene.name, RoomScene, {scene: temp});
        counter++;
    }
    // register global chat room:
    gameServer.register(share.CHAT_GLOBAL, RoomChat, {});
    console.log(`Loaded ${counter} scenes`);
    // start game server:
    gameServer.listen(port);
    // @TODO:
    // - modify this index file and move the scenes loading logic into a class.
    // - check on the 4th callback argument on gameServer.listen to run the logic.
    /* code example:
    gameServer.listen(port, undefined, undefined, function() {
        // server is now listening!
        // do your stuff
    })
    */
    console.log('Listening on http://localhost:'+port);
    // create bundle:
    const bundler = new Parcel(path.resolve(__dirname, '../client/index.html'));
    app.use(bundler.middleware());
}).catch((err) => {
    console.log('ERROR - Server catch error:', err);
});
