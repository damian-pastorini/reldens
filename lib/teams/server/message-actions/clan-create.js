/**
 *
 * Reldens - ClanMessageActions
 *
 */

const { TeamsConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');
const {ClanFactory} = require("../clan-factory");

class ClanCreate
{

    static async execute(client, data, room, playerSchema, teamsPlugin)
    {
        let clanName = sc.cleanMessage(
            data[TeamsConst.ACTIONS.CLAN_NAME],
            room.config.getWithoutLogs('server/clan/settings/nameLimit', TeamsConst.NAME_LIMIT)
        );
        if(!clanName){
            Logger.info('Invalida provided Clan name.');
            return this.clanCreateSend(client, TeamsConst.VALIDATION.CREATE_ERROR, clanName);
        }
        let repository = teamsPlugin.dataServer.getEntity('clan');
        let exists = await repository.loadOneBy('name', clanName);
        if(exists){
            Logger.info('Clan name "'+clanName+'" is already taken.');
            return this.clanCreateSend(client, TeamsConst.VALIDATION.NAME_EXISTS, clanName);
        }
       let firstLevel = await this.fetchInitialLevel(teamsPlugin);
        if(!firstLevel){
            Logger.info('Clan creation invalid level "'+clanName+'".');
            return this.clanCreateSend(client, TeamsConst.VALIDATION.LEVEL_ISSUE, clanName);
        }
        let createdClanModel = await repository.create({
            name: clanName,
            owner_id: playerSchema.player_id,
            points: room.config.getWithoutLogs('server/clan/settings/startingPoints', TeamsConst.CLAN_STARTING_POINTS),
            level: firstLevel.key
        });
        if(!createdClanModel){
            Logger.info('Clan creation error "'+clanName+'".', createdClanModel);
            return this.clanCreateSend(client, TeamsConst.VALIDATION.CREATE_ERROR, clanName);
        }
        let ownerMember = await teamsPlugin.dataServer.getEntity('clanMembers').create({
            clan_id: createdClanModel.id,
            player_id: playerSchema.player_id
        });
        if(!ownerMember){
            Logger.info('Clan owner creation error "'+clanName+'".', createdClanModel, ownerMember);
            return this.clanCreateSend(client, TeamsConst.VALIDATION.CREATE_OWNER_ERROR, clanName);
        }
        playerSchema.privateData.clan = createdClanModel.id;
        await ClanFactory.create(
            createdClanModel.id,
            playerSchema,
            client,
            room.config.get('client/ui/teams/sharedProperties'),
            teamsPlugin
        );
        return this.clanCreateSend(client, TeamsConst.VALIDATION.SUCCESS, clanName, playerSchema.player_id);
    }

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
            sendData.id = ownerId;
        }
        if(clanId){
            sendData.clanId = clanId;
        }
        client.send('*', sendData);
        return true;
    }

}

module.exports.ClanCreate = ClanCreate;
