/**
 *
 * Reldens - ClanCreate
 *
 * Handles clan creation requests from players.
 * Validates clan name, creates clan and owner membership records, and initializes the clan instance. An owner
 * membership that is not stored deletes the created clan row (owner error answer), and a clan that cannot be loaded after
 * its creation deletes its owner membership and its row (create error answer), so no orphan clan stays and the client
 * always gets an answer; the player clan is set only once the clan is loaded.
 *
 */

const { ClanFactory } = require('../clan-factory');
const { TeamsConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../../rooms/server/state').PlayerState} PlayerState
 * @typedef {import('../../../rooms/server/scene').RoomScene} RoomScene
 * @typedef {import('../plugin').TeamsPlugin} TeamsPlugin
 */
class ClanCreate
{

    /**
     * @param {Object} client
     * @param {Object} data
     * @param {RoomScene} room
     * @param {PlayerState} playerSchema
     * @param {TeamsPlugin} teamsPlugin
     * @returns {Promise<boolean>}
     */
    static async execute(client, data, room, playerSchema, teamsPlugin)
    {
        let clanName = sc.cleanMessage(
            data[TeamsConst.ACTIONS.CLAN_NAME],
            room.config.getWithoutLogs('server/clan/settings/nameLimit', TeamsConst.NAME_LIMIT)
        );
        if(!clanName){
            Logger.info('The provided clan name is invalid.');
            return this.clanCreateSend(client, TeamsConst.VALIDATION.CREATE_ERROR, clanName);
        }
        let clanRepository = teamsPlugin.dataServer.getEntity('clan');
        let exists = await clanRepository.loadOneBy('name', clanName);
        if(exists){
            Logger.info('Clan name "'+clanName+'" is already taken.');
            return this.clanCreateSend(client, TeamsConst.VALIDATION.NAME_EXISTS, clanName);
        }
       let firstLevel = await this.fetchInitialLevel(teamsPlugin);
        if(!firstLevel){
            Logger.info('Clan creation invalid level "'+clanName+'".');
            return this.clanCreateSend(client, TeamsConst.VALIDATION.LEVEL_ISSUE, clanName);
        }
        let playerId = playerSchema.player_id;
        let createdClanModel = false;
        try {
            createdClanModel = await clanRepository.create({
                name: clanName,
                owner_id: playerId,
                points: room.config.getWithoutLogs(
                    'server/clan/settings/startingPoints',
                    TeamsConst.CLAN_STARTING_POINTS
                ),
                level: firstLevel.key
            });
        } catch (error) {
            Logger.warning('Clan create storage error.', error);
        }
        if(!createdClanModel){
            Logger.info('Clan creation error "'+clanName+'".', createdClanModel);
            return this.clanCreateSend(client, TeamsConst.VALIDATION.CREATE_ERROR, clanName);
        }
        let clanId = createdClanModel.id;
        let clanMembersRepository = teamsPlugin.dataServer.getEntity('clanMembers');
        let ownerMember = false;
        try {
            ownerMember = await clanMembersRepository.create({clan_id: clanId, player_id: playerId});
        } catch (error) {
            Logger.warning('Clan owner member storage error.', error);
        }
        if(!ownerMember){
            Logger.info('Clan owner creation error "'+clanName+'".', createdClanModel, ownerMember);
            await clanRepository.deleteById(clanId);
            return this.clanCreateSend(client, TeamsConst.VALIDATION.CREATE_OWNER_ERROR, clanName);
        }
        let createdClan = await ClanFactory.create(
            clanId,
            playerSchema,
            client,
            room.config.get('client/ui/clan/sharedProperties'),
            teamsPlugin
        );
        if(!createdClan){
            Logger.error('Clan "'+clanName+'" could not be loaded after its creation.');
            await clanMembersRepository.delete({player_id: Number(playerId), clan_id: clanId});
            await clanRepository.deleteById(clanId);
            return this.clanCreateSend(client, TeamsConst.VALIDATION.CREATE_ERROR, clanName);
        }
        playerSchema.setPrivate('clan', clanId);
        createdClan.join(playerSchema, client, createdClan.members[playerId]);
        await playerSchema.persistData({act: TeamsConst.ACTIONS.CLAN_CREATE});
        Logger.info('New clan created "'+clanName+'" with ID "'+clanId+'", by player ID "'+playerId+'".');
        return this.clanCreateSend(
            client,
            TeamsConst.VALIDATION.SUCCESS,
            clanName,
            playerId,
            clanId
        );
    }

    /**
     * @param {TeamsPlugin} teamsPlugin
     * @returns {Promise<Object|boolean>}
     */
    static async fetchInitialLevel(teamsPlugin)
    {
        let levelsRepository = teamsPlugin.dataServer.getEntity('clanLevels');
        levelsRepository.limit = 1;
        levelsRepository.sortBy = 'key';
        let firstLevel = await levelsRepository.loadOne({});
        levelsRepository.limit = 0;
        levelsRepository.sortBy = false;
        return firstLevel;
    }

    /**
     * @param {Object} client
     * @param {string} result
     * @param {string} clanName
     * @param {number|string} ownerId
     * @param {number|string} clanId
     * @returns {boolean}
     */
    static clanCreateSend(client, result, clanName, ownerId, clanId)
    {
        // @TODO - BETA - Include additional event before send.
        let sendData = {
            act: TeamsConst.ACTIONS.CLAN_CREATE,
            listener: TeamsConst.CLAN_KEY,
            clanName,
            result
        };
        if(ownerId){
            sendData.ownerId = ownerId;
        }
        if(clanId){
            sendData.id = clanId;
        }
        client.send('*', sendData);
        return true;
    }

}

module.exports.ClanCreate = ClanCreate;
