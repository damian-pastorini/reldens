/**
 *
 * Reldens - Kill Score Subscriber Overrides
 *
 * Server side e2e endpoints for the kill score subscriber of the running server (IncreaseScoreOnKill): a method of the
 * subscriber or of its updater, provider and sender is delayed or fails its next calls (LiveObjectsOverrides, restored
 * with the spec group, its calls counted per target and method); and the subscriber runs a kill event mapped the way the
 * scores plugin listener maps it (a player death with the attacker as the victim, or a player death or a battle end
 * without the target ids), returning its result and the text messages of the errors it logged (the logged data holds the
 * room, which is not serializable), without emitting the event to the other plugins.
 *
 */

const { LiveObjectsOverrides } = require('./live-objects-overrides');
const { RoomObjectsState } = require('./room-objects-state');
const { ObjectsConst } = require('../../../lib/objects/constants');
const { GameConst } = require('../../../lib/game/constants');
const { Logger, sc } = require('@reldens/utils');

class KillScoreSubscriberOverrides
{

    static SUBSCRIBER_KEY = 'increaseScoreOnKill';
    static TARGETS_KEYS = ['scoresUpdater', 'scoresProvider', 'scoresSender'];
    static CALLS_KEY_PREFIX = 'killScore.';

    static fetchTarget(serverManager, targetKey)
    {
        let subscriber = serverManager.featuresManager.featuresList.scores.package[
            KillScoreSubscriberOverrides.SUBSCRIBER_KEY
        ];
        let target = KillScoreSubscriberOverrides.TARGETS_KEYS.includes(targetKey) ? subscriber[targetKey] : false;
        if(KillScoreSubscriberOverrides.SUBSCRIBER_KEY === targetKey){
            target = subscriber;
        }
        return target;
    }

    static mapKillEvent(serverManager, room, killData)
    {
        let attacker = RoomObjectsState.findPlayerByName(room, killData.attackerName);
        if(!attacker){
            return {error: 'Player '+killData.attackerName+' not found in room '+room.roomName+'.'};
        }
        return {
            killType: GameConst.TYPE_PLAYER === killData.killType ? GameConst.TYPE_PLAYER : ObjectsConst.TYPE_OBJECT,
            props: GameConst.TYPE_PLAYER === killData.killType
                ? serverManager.featuresManager.featuresList.scores.package.increaseScoreOnKillMapper.fromPlayerDeathEvent({
                    room,
                    attackerPlayer: attacker,
                    targetSchema: killData.withTarget ? attacker : {}
                })
                : serverManager.featuresManager.featuresList.scores.package.increaseScoreOnKillMapper.fromBattleEndedEvent({
                    room,
                    playerSchema: attacker,
                    pve: {targetObject: {}}
                })
        };
    }

    static async runKillEvent(serverManager, room, killData)
    {
        let mapped = KillScoreSubscriberOverrides.mapKillEvent(serverManager, room, killData);
        if(mapped.error){
            return mapped;
        }
        let loggedErrors = [];
        let loggerError = Logger.error;
        Logger.error = (...logArguments) => {
            loggedErrors.push(logArguments.filter(logArgument => 'string' === typeof logArgument).join(' '));
            return loggerError.apply(Logger, logArguments);
        };
        let result = await KillScoreSubscriberOverrides.fetchTarget(serverManager, KillScoreSubscriberOverrides.SUBSCRIBER_KEY)
            .execute(mapped.props, mapped.killType)
            .catch((error) => 'Rejected: '+error.message);
        Logger.error = loggerError;
        return {result, loggedErrors};
    }

    static registerEndpoints(serverManager)
    {
        let app = serverManager.app;
        app.post('/api/e2e/kill-score/method-override', (request, response) => {
            let targetKey = String(sc.get(request.body, 'targetKey', ''));
            let target = KillScoreSubscriberOverrides.fetchTarget(serverManager, targetKey);
            if(!target){
                return response.json({error: 'Kill score target '+targetKey+' not found.'});
            }
            response.json(LiveObjectsOverrides.overrideMethod(
                sc.get(request.body, 'group', ''),
                target,
                String(sc.get(request.body, 'methodKey', '')),
                {
                    callsKey: KillScoreSubscriberOverrides.CALLS_KEY_PREFIX+targetKey,
                    delayMs: Number(sc.get(request.body, 'delayMs', 0)),
                    failuresCount: Number(sc.get(request.body, 'failuresCount', 0)),
                    rejects: true === sc.get(request.body, 'rejects', false)
                }
            ));
        });
        app.post('/api/e2e/kill-score/kill-event', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => await KillScoreSubscriberOverrides.runKillEvent(serverManager, room, {
                    attackerName: String(sc.get(request.body, 'attackerName', '')),
                    killType: String(sc.get(request.body, 'killType', '')),
                    withTarget: true === sc.get(request.body, 'withTarget', false)
                })
            );
        });
        Logger.info('[kill-score-subscriber-overrides] Kill score subscriber endpoints registered.');
    }

}

module.exports.KillScoreSubscriberOverrides = KillScoreSubscriberOverrides;
