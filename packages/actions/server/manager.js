/**
 *
 * Reldens - ActionsManager
 *
 * This class will validate and run all the players and objects actions.
 *
 */

const { EventsManager } = require('../../game/events-manager');
const { Pvp } = require('./pvp');
const { AttackShort } = require('./attack-short');
const { GameConst } = require('../../game/constants');
const { ObjectsConst } = require('../../objects/constants');

class ActionsManager
{

    constructor(config)
    {
        this.config = config;
        this.availableActions = {'attack-short': AttackShort};
        EventsManager.on('reldens.createPlayerAfter', (client, authResult, currentPlayer) => {
            currentPlayer.actions = {};
            let pvpConfig = this.config.get('server/actions/pvp');
            currentPlayer.actions['pvp'] = new Pvp(pvpConfig);
            for(let idx in this.availableActions){
                currentPlayer.actions[idx] = new this.availableActions[idx]();
            }
        });
        EventsManager.on('reldens.onMessageRunAction', async (message, playerSchema, target, room) => {
            if(message.target.type === GameConst.TYPE_PLAYER){
                // @TODO: for now we only have one action which is the short distance attack, because of that if the
                //   player target itself we are temporally including a return here, this will change when multiple
                //   actions were implemented.
                if(target.player_id === playerSchema.player_id){
                    return;
                }
                playerSchema.actions['pvp'].runBattle(playerSchema, target, room);
            }
            if(message.target.type === ObjectsConst.TYPE_OBJECT){
                if(target.isValidInteraction(playerSchema.state.x, playerSchema.state.y)){
                    // @TODO: temporal the only action for now is the short-attack with will trigger the pve.
                    await target.battle.runBattle(playerSchema, target, room);
                    await EventsManager.emit('reldens.objectInteraction', message, playerSchema, target, room);
                }
            }
        });
    }

}

module.exports.ActionsManager = ActionsManager;
