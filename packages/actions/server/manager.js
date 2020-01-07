/**
 *
 * Reldens - ActionsManager
 *
 * This class will validate and run all the players and objects actions.
 *
 */

const { EventsManager } = require('../../game/events-manager');
const { InteractionArea } = require('../../world/interaction-area');
const { AttackShort } = require('./attack-short');
const { GameConst } = require('../../game/constants');
const { ObjectsConst } = require('../../objects/constants');

class ActionsManager
{

    constructor(config)
    {
        this.config = config;
        EventsManager.on('reldens.onMessageRunAction', async (message, player, target, scene) => {
            // @TODO: for now we only have one action which is the short distance attack, but here we will include a
            //   lot of other actions.
            if(message.target.type === GameConst.TYPE_PLAYER && target.player_id !== player.player_id){
                if(!player.canAttack){
                    // @NOTE: player could be running an attack already.
                    return;
                }
                player.canAttack = false;
                let interactionArea = new InteractionArea();
                let limitDistance = this.config.get('server/players/actions/interactionDistance');
                interactionArea.setupInteractionArea(limitDistance, target.state.x, target.state.y);
                if(!interactionArea.isValidInteraction(player.state.x, player.state.y)){
                    return;
                }
                await EventsManager.emit('reldens.beforeAttackShort', message, player, target, scene);
                AttackShort.execute(player, target);
                await EventsManager.emit('reldens.afterAttackShort', message, player, target, scene);
                let targetClient = scene.getClientById(target.sessionId);
                if(targetClient){
                    scene.broadcast({
                        act: GameConst.ATTACK,
                        atk: player.sessionId,
                        def: target.sessionId
                    });
                    if(target.stats.hp === 0){
                        // player is dead! reinitialize the stats:
                        Object.assign(target.stats, this.config.get('server/players/initialStats'));
                        // save the stats:
                        await scene.savePlayerStats(target);
                        await scene.saveStateAndRemovePlayer(target.sessionId);
                        scene.send(targetClient, {act: GameConst.GAME_OVER});
                    } else {
                        await scene.savePlayerStats(target);
                        // update the target:
                        scene.send(targetClient, {act: GameConst.PLAYER_STATS, stats: target.stats});
                    }
                }
                if(AttackShort.attackDelay){
                    setTimeout(()=> {
                        player.canAttack = true;
                    }, AttackShort.attackDelay);
                }
            }
            if(message.target.type === ObjectsConst.TYPE_OBJECT){
                if(target.isValidInteraction(player.state.x, player.state.y)){
                    // @TODO: run object actions.
                    await EventsManager.emit('reldens.objectInteraction', message, player, target, scene);
                }
            }
        });
    }

}

module.exports.ActionsManager = ActionsManager;
