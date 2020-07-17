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
const { ErrorManager } = require('@reldens/utils');

class Player extends Schema
{

    constructor(data, sessionId)
    {
        super();
        try {
            // @TODO: [0] is temporal since for now we only have one player by user.
            let player = data.players[0];
            // stats for now will use the stats model.
            this.stats = player.stats;
            // player data:
            this.id = data.id; // this is the user id
            this.player_id = player.id;
            this.sessionId = sessionId;
            this.role_id = data.role_id;
            this.status = data.status;
            this.username = data.username;
            this.physicalBody = false;
            // set scene and position:
            this.state = new BodyState(player.state);
            this.canAttack = true;
        } catch (err) {
            ErrorManager.error(['Missing user data.', err]);
        }
    }

}

type('string')(Player.prototype, 'sessionId');
type('string')(Player.prototype, 'username');
type('string')(Player.prototype, 'status');
schema.defineTypes(Player, {state: BodyState});

module.exports.Player = Player;
