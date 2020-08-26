/**
 *
 * Reldens - Actions Server Package
 *
 */

const { ActionsMessageActions } = require('./message-actions');
const { EventsManager } = require('@reldens/utils');
const { PackInterface } = require('../../features/server/pack-interface');
const { GameConst } = require('../../game/constants');
const { ObjectsConst } = require('../../objects/constants');
const { Pvp } = require('./pvp');

class ActionsPack extends PackInterface
{

    setupPack()
    {
        // eslint-disable-next-line no-unused-vars
        EventsManager.on('reldens.roomsMessageActionsByRoom', async (roomMessageActions, roomName) => {
            roomMessageActions.actions = ActionsMessageActions;
        });
        EventsManager.on('reldens.createPlayerAfter', (client, authResult, currentPlayer, room) => {
            currentPlayer.actions = {};
            let pvpConfig = room.config.get('server/actions/pvp');
            currentPlayer.actions['pvp'] = new Pvp(pvpConfig);
            for(let i of Object.keys(room.actionsManager.availableActions)){
                currentPlayer.actions[i] = new room.actionsManager.availableActions[i]();
                currentPlayer.actions[i].attacker = currentPlayer;
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
                await playerSchema.actions['pvp'].runBattle(playerSchema, target, 'pvp', room);
            }
            if(message.target.type === ObjectsConst.TYPE_OBJECT && {}.hasOwnProperty.call(target, 'battle')){
                target.battle.targetObject = target;
                await target.battle.runBattle(playerSchema, target, 'pve', room);
            }
        });
    }

}

module.exports.ActionsPack = ActionsPack;
