/**
 *
 * Reldens - ClanMessageActions
 *
 */

const { TeamsConst } = require('../../constants');
const { Logger } = require('@reldens/utils');

class ClanCreate
{

    static async execute(client, data, room, playerSchema, teamsPlugin)
    {
        let characterLimit = room.config.getWithoutLogs('server/clan/settings/nameLimit', TeamsConst.NAME_LIMIT);
        let clanName = data[TeamsConst.ACTIONS.CLAN_NAME]?.toString().replace(/\\/g, '').substring(0, characterLimit);
        let repository = teamsPlugin.dataServer.getEntity('clan');
        let exists = await repository.loadOneBy('name', clanName);
        if(exists){
            Logger.info('Clan already exists with name "'+clanName+'".');
            return this.clanCreateSend(client, TeamsConst.VALIDATION.NAME_EXISTS, clanName);
        }
        let levelsRepository = teamsPlugin.dataServer.getEntity('clanLevels');
        levelsRepository.limit = 1;
        levelsRepository.sortBy = 'key';
        let firstLevel = await levelsRepository.loadOne({});
        if(!firstLevel){
            Logger.info('Clan creation invalid level "'+clanName+'".');
            return this.clanCreateSend(client, TeamsConst.VALIDATION.LEVEL_ISSUE, clanName);
        }
        levelsRepository.limit = 0;
        levelsRepository.sortBy = false;
        let createdClan = await repository.create({
            name: clanName,
            owner_id: playerSchema.player_id,
            points: room.config.getWithoutLogs('server/clan/settings/startingPoints', TeamsConst.CLAN_STARTING_POINTS),
            level: firstLevel.key
        });
        if(!createdClan){
            Logger.info('Clan creation error "'+clanName+'".', createdClan);
            return this.clanCreateSend(client, TeamsConst.VALIDATION.CREATE_ERROR, clanName);
        }
        let ownerMember = await teamsPlugin.dataServer.getEntity('clanMembers').create({
            clan_id: createdClan.id,
            player_id: playerSchema.player_id
        });
        if(!ownerMember){
            Logger.info('Clan owner creation error "'+clanName+'".', createdClan, ownerMember);
            return this.clanCreateSend(client, TeamsConst.VALIDATION.CREATE_OWNER_ERROR, clanName);
        }
        return this.clanCreateSend(client, TeamsConst.VALIDATION.SUCCESS, clanName, playerSchema.player_id);
    }

    static clanCreateSend(client, result, clanName, ownerId)
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
        client.send('*', sendData);
        return true;
    }

}

module.exports.ClanCreate = ClanCreate;
