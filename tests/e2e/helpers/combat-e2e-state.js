/**
 *
 * Reldens - Combat E2e State
 *
 * Server side e2e endpoints for the combat rules: the live stats of a player (saved and sent to its client) or of an
 * enemy body (and the enemy body state, restored with the enemies on the players reset), the properties of a player skill changed through LiveObjectsOverrides (restored with the parallel spec
 * group on the players reset), the room custom data (allActionsDisabled, disallowedActions, pvpEnabled) and the PvP
 * switch the players get on their room join (the server/actions/pvp/enabled value read on the server start) changed the
 * same way, the skill snapshot (uses, last state, activation and the owner casting flag) and the
 * applied damages and run logic end states of a player skills, recorded from its class path events since the record
 * request (a new request starts an empty record, the listeners are removed when the player leaves the room).
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { LiveObjectsOverrides } = require('./live-objects-overrides');
const { SkillsEvents } = require('@reldens/skills');
const { Logger, sc } = require('@reldens/utils');

class CombatE2eState
{

    static recordedSkills = {};

    static findPlayer(room, playerName)
    {
        let found = {playerSchema: RoomObjectsState.findPlayerByName(room, playerName)};
        if(!found.playerSchema){
            found.error = 'Player '+playerName+' not found in room '+room.roomName+'.';
        }
        return found;
    }

    static findPlayerSkill(room, playerName, skillKey)
    {
        let found = CombatE2eState.findPlayer(room, playerName);
        if(found.error){
            return found;
        }
        let skill = sc.get(found.playerSchema.skillsServer.classPath.currentSkills, skillKey, false);
        if(!skill){
            return {error: 'Skill '+skillKey+' not found on the player '+playerName+'.'};
        }
        return {playerSchema: found.playerSchema, skill};
    }

    static mapSkill(found)
    {
        if(found.error){
            return found;
        }
        return {
            key: found.skill.key,
            uses: found.skill.uses,
            usesLimit: found.skill.usesLimit,
            lastState: found.skill.lastState,
            canActivate: found.skill.canActivate,
            isCasting: found.skill.owner.isCasting,
            isReady: found.skill.canActivate && !found.skill.owner.isCasting
        };
    }

    static changePlayerSkill(room, groupKey, playerName, skillKey, properties)
    {
        let found = CombatE2eState.findPlayerSkill(room, playerName, skillKey);
        if(found.error){
            return found;
        }
        CombatE2eState.changeProperties(groupKey, found.skill, properties);
        return CombatE2eState.mapSkill(found);
    }

    static async setPlayerStats(room, playerName, stats)
    {
        let found = CombatE2eState.findPlayer(room, playerName);
        if(found.error){
            return found;
        }
        Object.assign(found.playerSchema.stats, stats);
        await room.savePlayerStats(found.playerSchema, room.getClientById(found.playerSchema.sessionId));
        return {stats: Object.assign({}, found.playerSchema.stats)};
    }

    static findEnemy(room, bodyKey)
    {
        let found = {
            enemyObject: RoomObjectsState.fetchEnemies(room).find(
                roomObject => bodyKey === roomObject.objectBody.bodyState.key
            )
        };
        if(!found.enemyObject){
            found.error = 'Enemy body '+bodyKey+' not found in room '+room.roomName+'.';
        }
        return found;
    }

    static setEnemyStats(room, bodyKey, stats, inState)
    {
        let found = CombatE2eState.findEnemy(room, bodyKey);
        if(found.error){
            return found;
        }
        Object.assign(found.enemyObject.stats, stats);
        if(0 < inState){
            found.enemyObject.objectBody.bodyState.inState = inState;
        }
        return {
            stats: Object.assign({}, found.enemyObject.stats),
            inState: found.enemyObject.objectBody.bodyState.inState
        };
    }

    static changeEnemyBattle(room, groupKey, bodyKey, properties, isBattle)
    {
        let found = CombatE2eState.findEnemy(room, bodyKey);
        if(found.error){
            return found;
        }
        return CombatE2eState.changeProperties(
            groupKey,
            isBattle ? found.enemyObject.battle : found.enemyObject,
            properties
        );
    }

    static changePlayerBody(room, groupKey, playerName, properties)
    {
        let found = CombatE2eState.findPlayer(room, playerName);
        if(found.error){
            return found;
        }
        return CombatE2eState.changeProperties(groupKey, found.playerSchema.physicalBody, properties);
    }

    static changeProperties(groupKey, target, properties)
    {
        for(let propertyKey of Object.keys(properties)){
            LiveObjectsOverrides.changeProperty(groupKey, target, propertyKey, properties[propertyKey], false);
        }
        return {changed: Object.keys(properties)};
    }

    static recordPlayerSkills(room, playerName)
    {
        let found = CombatE2eState.findPlayer(room, playerName);
        if(found.error){
            return found;
        }
        let classPath = found.playerSchema.skillsServer.classPath;
        let records = {damages: [], endStates: []};
        CombatE2eState.recordedSkills[playerName] = records;
        classPath.listenEvent(
            SkillsEvents.SKILL_ATTACK_APPLY_DAMAGE,
            async (skill, target, damage, newValue) => {
                records.damages.push({skillKey: skill.key, damage, newValue});
            },
            classPath.getOwnerUniqueEventKey('e2eRecordDamage'),
            classPath.getOwnerEventKey()
        );
        classPath.listenEvent(
            SkillsEvents.SKILL_AFTER_RUN_LOGIC,
            async (skill) => {
                records.endStates.push({skillKey: skill.key, lastState: skill.lastState});
            },
            classPath.getOwnerUniqueEventKey('e2eRecordEndState'),
            classPath.getOwnerEventKey()
        );
        return {recording: playerName};
    }

    static registerEndpoints(serverManager)
    {
        let app = serverManager.app;
        app.get('/api/e2e/combat/player-skill', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.query, 'roomName', ''),
                response,
                async (room) => CombatE2eState.mapSkill(CombatE2eState.findPlayerSkill(
                    room,
                    sc.get(request.query, 'playerName', ''),
                    sc.get(request.query, 'skillKey', '')
                ))
            );
        });
        app.post('/api/e2e/combat/player-skill', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => CombatE2eState.changePlayerSkill(
                    room,
                    sc.get(request.body, 'group', ''),
                    sc.get(request.body, 'playerName', ''),
                    sc.get(request.body, 'skillKey', ''),
                    sc.get(request.body, 'properties', {})
                )
            );
        });
        app.post('/api/e2e/combat/player-stats', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => await CombatE2eState.setPlayerStats(
                    room,
                    sc.get(request.body, 'playerName', ''),
                    sc.get(request.body, 'stats', {})
                )
            );
        });
        app.post('/api/e2e/combat/enemy-stats', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => CombatE2eState.setEnemyStats(
                    room,
                    sc.get(request.body, 'bodyKey', ''),
                    sc.get(request.body, 'stats', {}),
                    Number(sc.get(request.body, 'inState', 0))
                )
            );
        });
        app.post('/api/e2e/combat/record-skills', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => CombatE2eState.recordPlayerSkills(room, sc.get(request.body, 'playerName', ''))
            );
        });
        CombatE2eState.registerChangeEndpoints(serverManager);
        app.get('/api/e2e/combat/recorded-skills', (request, response) => {
            response.json(sc.get(
                CombatE2eState.recordedSkills,
                sc.get(request.query, 'playerName', ''),
                {damages: [], endStates: []}
            ));
        });
        Logger.info('[combat-e2e-state] Combat endpoints registered.');
    }

    static registerChangeEndpoints(serverManager)
    {
        let app = serverManager.app;
        app.post('/api/e2e/combat/room-custom-data', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => CombatE2eState.changeProperties(
                    sc.get(request.body, 'group', ''),
                    room.customData,
                    sc.get(request.body, 'customData', {})
                )
            );
        });
        app.post('/api/e2e/combat/enemy-battle', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => CombatE2eState.changeEnemyBattle(
                    room,
                    sc.get(request.body, 'group', ''),
                    sc.get(request.body, 'bodyKey', ''),
                    sc.get(request.body, 'properties', {}),
                    false !== sc.get(request.body, 'isBattle', true)
                )
            );
        });
        app.post('/api/e2e/combat/player-body', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => CombatE2eState.changePlayerBody(
                    room,
                    sc.get(request.body, 'group', ''),
                    sc.get(request.body, 'playerName', ''),
                    sc.get(request.body, 'properties', {})
                )
            );
        });
        app.post('/api/e2e/combat/pvp-enabled', (request, response) => {
            response.json(CombatE2eState.changeProperties(
                sc.get(request.body, 'group', ''),
                serverManager.featuresManager.featuresList.actions.package.playerEnricher,
                {pvpEnabled: true === sc.get(request.body, 'enabled', true)}
            ));
        });
    }

}

module.exports.CombatE2eState = CombatE2eState;
