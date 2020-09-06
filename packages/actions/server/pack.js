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
            currentPlayer.executePhysicalSkill = (target, bulletObject) => {
                let from = {x: currentPlayer.state.x, y: currentPlayer.state.y};
                let to = {x: target.state.x, y: target.state.y};
                let bulletBody = currentPlayer.physicalBody.world.shootBullet(from, to, bulletObject);
                bulletBody.onHit = (onHitData) => {
                    bulletObject.onHit(onHitData);
                };
                return false;
            };
            // player created, setting broadcastKey:
            currentPlayer.broadcastKey = currentPlayer.sessionId;
            for(let i of Object.keys(room.actionsManager.availableActions)){
                let action = room.actionsManager.availableActions[i];
                action['props'].owner = currentPlayer;
                currentPlayer.actions[i] = new action['actClass'](action['props']);
            }
        });
        EventsManager.on('reldens.onMessageRunAction', async (message, playerSchema, target, room) => {
            if(message.target.type === GameConst.TYPE_PLAYER){
                await playerSchema.actions['pvp'].runBattle(playerSchema, target, room);
            }
            if(message.target.type === ObjectsConst.TYPE_OBJECT && {}.hasOwnProperty.call(target, 'battle')){
                await target.battle.runBattle(playerSchema, target, room);
            }
        });
    }

}

module.exports.ActionsPack = ActionsPack;
