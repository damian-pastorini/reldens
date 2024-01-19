/**
 *
 * Reldens - Player
 *
 */

const { Schema, type, defineTypes } = require('@colyseus/schema');
const { BodyState } = require('../../world/server/body-state');
const { GameConst } = require('../../game/constants');

class Player extends Schema
{

    constructor(data, sessionId)
    {
        super();
        let player = data.player;
        // @TODO - BETA - Replace "id" to be "player_id" and set the ID from the model as userId.
        this.userId = data.id.toString(); // this is the user_id from the storage
        // @TODO - BETA - Use camelCase on player_id and role_id.
        this.player_id = player.id.toString(); // this is the player_id from the storage
        this.sessionId = sessionId;
        this.broadcastKey = sessionId;
        this.role_id = data.role_id;
        this.status = data.status;
        this.username = data.username;
        this.playerName = player.name;
        this.physicalBody = false;
        this.eventsPrefix = 'p'+player.id+'.'+this.sessionId;
        // body state contains the scene and position data:
        this.state = new BodyState(player.state);
        // @NOTE: stats can't be a schema because is private data manually handled.
        this.stats = player.stats; // this is the current value
        this.statsBase = player.statsBase; // this is the base or max value
        this.avatarKey = GameConst.IMAGE_PLAYER;
        this.inState = GameConst.STATUS.ACTIVE;
        this.playedTime = data.played_time;
        // @TODO - BETA - Look for references where we assign data on the player using dynamic properties and move
        //   the data inside this privateData property. For example: playerSchema.currentAction, actions, inventory,
        //   skillsServer, physicalBody, etc. should become playerSchema.privateData.currentAction.
        this.privateData = {};
        this.customData = {};
    }

    // @TODO - BETA - Enclose a single entity that would contain the model, the schema, the client, the extra data, etc.
    getPrivate(key)
    {
        return this.privateData[key] || null;
    }

    setPrivate(key, data)
    {
        return this.privateData[key] = data;
    }

    getCustom(key)
    {
        return this.customData[key] || null;
    }

    setCustom(key, data)
    {
        return this.customData[key] = data;
    }

    eventUniqueKey()
    {
        return this.eventsPrefix+'.'+(new Date()).getTime();
    }

    getPosition()
    {
        return {
            x: this.state.x,
            y: this.state.y
        };
    }

    syncPlayer(playerSchema)
    {
        this.role_id = playerSchema.role_id;
        this.status = playerSchema.status;
        this.username = playerSchema.username;
        this.playerName = playerSchema.playerName;
        this.state.sync(playerSchema.state);
        this.stats = playerSchema.stats;
        this.statsBase = playerSchema.statsBase;
        this.avatarKey = playerSchema.avatarKey;
        this.inState = playerSchema.inState;
        this.playedTime = playerSchema.playedTime;
        this.privateData = playerSchema.privateData;
        this.customData = playerSchema.customData;
        return this;
    }

}

type('string')(Player.prototype, 'sessionId');
type('string')(Player.prototype, 'player_id');
type('string')(Player.prototype, 'username');
type('string')(Player.prototype, 'playerName');
type('number')(Player.prototype, 'playedTime');
type('string')(Player.prototype, 'status');
type('string')(Player.prototype, 'avatarKey');
type('string')(Player.prototype, 'broadcastKey');
defineTypes(Player, {state: BodyState});

module.exports.Player = Player;
