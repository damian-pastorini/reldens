/**
 *
 * Reldens - ActionsManager
 *
 * This class will validate and run all the players and objects actions.
 *
 */

const { EventsManager } = require('@reldens/utils');
const { Pvp } = require('./pvp');
const { AttackShort } = require('./attack-short');
const { AttackBullet } = require('./attack-bullet');
const { GameConst } = require('../../game/constants');
const { ObjectsConst } = require('../../objects/constants');

class ActionsManager
{

    constructor(config)
    {
        this.config = config;
        // @TODO: load dynamically and clean up.
        this.availableActions = {'attack-short': AttackShort, 'attack-bullet': AttackBullet};
        // eslint-disable-next-line no-unused-vars
        EventsManager.on('reldens.createPlayerAfter', (client, authResult, currentPlayer, room) => {
            currentPlayer.actions = {};
            let pvpConfig = this.config.get('server/actions/pvp');
            currentPlayer.actions['pvp'] = new Pvp(pvpConfig);
            for(let idx in this.availableActions){
                currentPlayer.actions[idx] = new this.availableActions[idx]();
                currentPlayer.actions[idx].attacker = currentPlayer;
            }
        });
        EventsManager.on('reldens.onMessageRunAction', async (message, playerSchema, target, room) => {
            let runAction = message.type;
            if(message.type === 'action'){
                // for pvp or pve the default action will be the attack-short:
                runAction = 'attack-short';
            }
            playerSchema.currentAction = runAction;
            if(message.target.type === GameConst.TYPE_PLAYER){
                // @TODO: for now we only have one action which is the short distance attack, because of that if the
                //   player target itself we are temporally including a return here, this will change when multiple
                //   actions were implemented (player could target himself for some reason? like heal skill?).
                if(target.player_id === playerSchema.player_id){
                    return;
                }
                playerSchema.actions['pvp'].runBattle(playerSchema, target, 'pvp', room);
            }
            if(message.target.type === ObjectsConst.TYPE_OBJECT && {}.hasOwnProperty.call(target, 'battle')){
                target.battle.targetObject = target;
                await target.battle.runBattle(playerSchema, target, 'pve', room);
            }
        });
    }

}

module.exports.ActionsManager = ActionsManager;
