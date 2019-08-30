// 3rd party:
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const Parcel = require('parcel-bundler');
const Colyseus = require('colyseus');
// reldens:
const share = require('../utils/constants');
const config = require('../config/config');
const DataLink = require('../driver/datalink');
const RoomGame = require('./room-game');
const RoomScene = require('./room-scene');
const RoomChat = require('../chat/room-chat');
// server:
const app = express();
app.use(cors());
app.use(express.json());
const port = Number(config.app.port);
const server = http.createServer(app);
// game server:
const gameServer = new Colyseus.Server({
    server: server,
    express: app
});
// main room:
gameServer.define(share.ROOM_GAME, RoomGame);
// game monitor:
if(config.app.colyseusMonitor){
    const monitor = require('@colyseus/monitor');
    // (optional) attach web monitoring panel:
    app.use('/colyseus', monitor.monitor(gameServer));
    console.log('NOTIFICATION - Attached Colyseus Monitor.');
}
// server shutdown:
gameServer.onShutdown(() => {
    console.log('NOTIFICATION - Game Server is going down.');
});
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
        gameServer.define(scene.name, RoomScene, {scene: temp});
        console.log('Defined scene: '+scene.name);
        counter++;
    }
    // log definied rooms:
    console.log(`Loaded ${counter} scenes`);
    // register global chat room:
    gameServer.define(share.CHAT_GLOBAL, RoomChat, {});
    console.log('Loaded chat room.');
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
    const bundler = new Parcel(path.resolve(__dirname, '../../pub/index.html'));
    app.use(bundler.middleware());
}).catch((err) => {
    console.log('ERROR - Server catch error:', err);
});
