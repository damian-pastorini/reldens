/**
 *
 * Reldens - Player
 *
 * Player schema, this class get the player data and keep the state in sync.
 *
 */

const schema = require('@colyseus/schema');
const { Schema, type } = schema;
const { BodyState } = require('../../world/server/body-state');
const { GameConst } = require('../../game/constants');
const { ErrorManager } = require('@reldens/utils');

class Player extends Schema
{

    constructor(data, sessionId)
    {
        super();
        try {
            let player = data.player;
            // player data:
            this.id = data.id; // this is the user id
            this.player_id = player.id;
            this.sessionId = sessionId;
            this.broadcastKey = sessionId;
            this.role_id = data.role_id;
            this.status = data.status;
            this.username = data.username;
            this.playerName = player.name;
            this.physicalBody = false;
            this.eventsPrefix = 'p'+player.id+'.'+this.sessionId;
            // set scene and position:
            this.state = new BodyState(player.state);
            // stats for now will use the stats model.
            this.stats = player.stats; // thi is the current value
            this.statsBase = player.statsBase; // this is the base or max value
            this.avatarKey = GameConst.IMAGE_PLAYER;
            this.inState = GameConst.STATUS.ACTIVE;
            this.playedTime = data.played_time;
        } catch (err) {
            ErrorManager.error(['Missing user data.', err]);
        }
    }

}

type('string')(Player.prototype, 'sessionId');
type('string')(Player.prototype, 'username');
type('string')(Player.prototype, 'playerName');
type('number')(Player.prototype, 'playedTime');
type('string')(Player.prototype, 'status');
type('string')(Player.prototype, 'avatarKey');
type('string')(Player.prototype, 'broadcastKey');
schema.defineTypes(Player, {state: BodyState});

module.exports.Player = Player;
