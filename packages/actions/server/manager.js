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
const { Logger } = require('../../game/logger');

class ActionsManager
{

    constructor(config)
    {
        this.config = config;
        EventsManager.on('reldens.onMessageRunAction', async (message, player, target, scene) => {
            // @NOTE: for now we only have one action which is the short distance attack.
            if(message.target.type === GameConst.TYPE_PLAYER && target.player_id !== player.player_id){
                let interactionArea = new InteractionArea();
                let limitDistance = this.config.get('server/players/actions/interactionDistance');
                interactionArea.setupInteractionArea(limitDistance, target.state.x, target.state.y);
                if(!interactionArea.isValidInteraction(player.state.x, player.state.y)){
                    return;
                }
                AttackShort.execute(player, target);
                // save the stats:
                let updateResult = await scene.loginManager.usersManager
                    .updateUserStatsByPlayerId(target.player_id, target.stats);
                if(!updateResult){
                    Logger.error('Player stats update error: ' + target.player_id);
                }
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
                        scene.send(targetClient, {act: GameConst.GAME_OVER});
                        await scene.saveStateAndRemovePlayer(target.sessionId);
                    } else {
                        // update the target:
                        scene.send(targetClient, {act: GameConst.PLAYER_STATS, stats: target.stats});
                    }
                }
            }
            if(message.target.type === ObjectsConst.TYPE_OBJECT){
                if(target.isValidInteraction(player.state.x, player.state.y)){
                    // @TODO: run object actions.
                }
            }
        });
    }

}

module.exports.ActionsManager = ActionsManager;
