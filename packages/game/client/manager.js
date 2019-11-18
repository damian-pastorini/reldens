/**
 *
 * Reldens - GameManager
 *
 * Like the ServerManager class, this is the main one that will handle everything on the client side.
 *
 */

const GameClient = require('./game-client');
const GameEngine = require('./game-engine');
const RoomEvents = require('./room-events');
const FeaturesClient = require('../../features/client/client');
const { ConfigProcessor } = require('../../config/processor');
const { GameConst } = require('../constants');
const gameSeverConfig = require('../server/config');

class GameManager
{

    constructor()
    {
        // server url:
        let serverUrl = this.getServerUrl();
        // setup game client:
        this.gameClient = new GameClient(serverUrl);
        // @NOTE: the game engine will be initialized after the user logged in the game that way we will get the full
        // game configuration from the server when the game starts.
        this.gameEngine = false;
        // full game config:
        this.config = ConfigProcessor;
        // features manager:
        this.features = new FeaturesClient();
        // active room is the currently connected server room:
        this.activeRoomEvents = false;
        // joined rooms:
        this.joinedRooms = {};
        // user data:
        this.userData = {};
        // player data:
        this.playerData = false;
    }

    async joinGame(formData, isNewUser = false)
    {
        // login or register:
        if(isNewUser){
            this.userData.isNewUser = true;
            this.userData.email = formData['email'];
        }
        this.userData.username = formData['username'];
        this.userData.password = formData['password'];
        // join initial game room, since we return the promise we don't need to catch the error here:
        let gameRoom = await this.gameClient.joinOrCreate(GameConst.ROOM_GAME, this.userData);
        gameRoom.onMessage((message) => {
            // only the current client will get this message:
            if(message.act === GameConst.START_GAME){
                // initialize the engine and start the game:
                // @TODO: - Seiyria - async/await
                this.initEngineAndStartGame(message).then((joinedFirstRoom) => {
                    // @NOTE we leave the game room after the game initialized because at that point the user already
                    // joined the scene room and is pointless to keep this room connected since it doesn't listen for
                    // any package.
                    gameRoom.leave();
                });
            }
        });
        // @NOTE: we return the gameRoom here to control the login result actions in the index script.
        return gameRoom;
    }

    async initEngineAndStartGame(initialGameData)
    {
        if(!initialGameData.hasOwnProperty('gameConfig')){
            throw new Error('ERROR - Missing game configuration.');
        }
        // save original player data:
        this.playerData = initialGameData.player;
        // apply the initial config to the processor:
        Object.assign(this.config, initialGameData.gameConfig);
        // initialize game engine:
        this.gameEngine = new GameEngine(initialGameData.gameConfig);
        // features list:
        let featuresList = this.features.loadFeatures(initialGameData.features);
        // since the user is now registered:
        this.userData.isNewUser = false;
        // first join the features rooms:
        // @TODO: - Seiyria - unused variables - you really should have eslint installed, and set it to very strict.
        //   It will catch errors like this. otherwise, if this function does NOT return anything, just do
        //   `await this.joinFeaturesRooms()` instead of assigning it to something unused.
        let joinExtraRooms = await this.joinFeaturesRooms();
        // create room events manager:
        let joinedFirstRoom = await this.gameClient.joinOrCreate(initialGameData.player.state.scene, this.userData);
        if(!joinedFirstRoom){
            // @NOTE: the errors while trying to join a rooms/scene will always be originated in the
            // server. For these errors we will alert the user and reload the window automatically.
            alert('ERROR - There was an error while joining the room: '+initialGameData.player.state.scene);
            window.location.reload();
        }
        // start listening the new room events:
        this.activeRoomEvents = this.createRoomEventsInstance(initialGameData.player.state.scene);
        this.activeRoomEvents.activateRoom(joinedFirstRoom);
        return joinedFirstRoom;
    }

    /**
     * Join features rooms dynamically and assign any events listeners if available.
     *
     * @returns {Promise<void>}
     */
    async joinFeaturesRooms()
    {
        for(let idx in this.features.featuresList){
            let feature = this.features.featuresList[idx];
            // @TODO: - Seiyria - in general, you don't need to do hasOwnProperty, you can just do if(feature.joinRooms)
            if(feature.hasOwnProperty('joinRooms')){
                for(let joinRoomName of feature.joinRooms){
                    let joinedRoom = await this.gameClient.joinOrCreate(joinRoomName, this.userData);
                    if(!joinedRoom){
                        // @NOTE: any join room error will always be originated in the server. For these errors we
                        // will alert the user and reload the window automatically. Here the received "data" will
                        // be the actual error message.
                        alert('ERROR - There was an error while joining the room '+joinRoomName);
                        window.location.reload();
                    }
                    // after the room was joined added to the joinedRooms list:
                    this.joinedRooms[joinRoomName] = joinedRoom;
                    // if the feature as additional message actions then we will observe the messages:
                    if(
                        feature.hasOwnProperty('joinedRoomsOnMessage')
                        && feature.joinedRoomsOnMessage.hasOwnProperty(joinRoomName)
                    ){
                        joinedRoom.onMessage((message) => {
                            feature.messageObserver = new feature.joinedRoomsOnMessage[joinRoomName]();
                            feature.messageObserver.observeMessage(message, this);
                        });
                    }
                }
            }
        }
    }

    /**
     * Reconnect custom method to change rooms and scenes.
     *
     * @param message
     * @param previousRoom
     */
    reconnectGameClient(message, previousRoom)
    {
        let newRoomEvents = this.createRoomEventsInstance(message.player.state.scene);
        this.gameClient.joinOrCreate(newRoomEvents.roomName, this.userData).then((sceneRoom) => {
            // leave old room:
            previousRoom.leave();
            this.activeRoomEvents = newRoomEvents;
            this.room = sceneRoom;
            // start listen to room events:
            newRoomEvents.activateRoom(sceneRoom, message.prev);
        }).catch((err) => {
            // @NOTE: the errors while trying to reconnect will always be originated in the server. For these errors we
            // will alert the user and reload the window automatically.
            alert(err);
            console.log('ERROR - reconnectGameClient:', err, 'message:', message, 'previousRoom:', previousRoom);
            window.location.reload();
        });
    };

    /**
     * Create RoomEvents instance.
     *
     * @param roomName
     * @returns {RoomEvents}
     */
    createRoomEventsInstance(roomName)
    {
        return new RoomEvents(roomName, this);
    }

    /**
     * Generate server URL from configuration or using the current url data.
     *
     * @returns {*}
     */
    getServerUrl()
    {
        // @TODO: - Seiyria I would rewrite functions like this to be less nested.
        /*
        if(this.clientUrl) return this.clientUrl;

        if(gameServerConfig.serverUrl) {
            this.clientUrl = gameServerConfig.serverUrl;
            return this.clientUrl;
        }

        let host = window.location.hostname;
        let wsProtocol = 'ws://';
        let wsPort = (window.location.port ? ':'+window.location.port : '');
        this.clientUrl = wsProtocol+host+wsPort;

        return this.clientUrl;

        */

        // @TODO: - Seiyria - additionally, when writing functions that have `get` in their name, consider if the
        //   operations are simple enough to just make them a getter instead of a function
        if(!this.clientUrl){
            if(gameSeverConfig.hasOwnProperty('serverUrl')){
                this.clientUrl = gameSeverConfig.serverUrl;
            } else {
                let host = window.location.hostname;
                let wsProtocol = 'ws://';
                let wsPort = (window.location.port ? ':'+window.location.port : '');
                this.clientUrl = wsProtocol+host+wsPort;
            }
        }
        return this.clientUrl;
    }

}

module.exports.GameManager = GameManager;
