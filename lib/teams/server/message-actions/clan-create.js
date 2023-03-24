/**
 *
 * Reldens - ClanMessageActions
 *
 */

const { ClanUpdatesHandler } = require('../clan-updates-handler');
const { Clan } = require('../clan');
const { TeamsConst } = require('../../constants');

class ClanCreate
{
    static async execute(client, data, room, playerSchema, teamsPlugin)
    {
        let characterLimit = room.config.getWithoutLogs('server/clan/settings/nameLimit', TeamsConst.NAME_LIMIT);
        let clanName = data[TeamsConst.ACTIONS.CLAN_NAME]?.toString().replace(/\\/g, '').substring(0, characterLimit);
        let repository = teamsPlugin.dataServer.getEntity('clan');
        let exists = await repository.loadOneBy('name', clanName);
        if(exists){
            client.send('*', {act: TeamsConst.ACTIONS.CLAN_CREATE, result: TeamsConst.VALIDATION.NAME_EXISTS});
            return;
        }
        let levelsRepository = teamsPlugin.dataServer.getEntity('clanLevels');
        levelsRepository.limit = 1;
        levelsRepository.sortBy = 'key';
        let firstLevel = await levelsRepository.loadOne({});
        if(!firstLevel){
            client.send('*', {act: TeamsConst.ACTIONS.CLAN_CREATE, result: TeamsConst.VALIDATION.LEVEL_ISSUE});
            return;
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
            client.send('*', {act: TeamsConst.ACTIONS.CLAN_CREATE, result: TeamsConst.VALIDATION.CREATE_ERROR});
            return;
        }
        client.send('*', {act: TeamsConst.ACTIONS.CLAN_CREATE, result: TeamsConst.VALIDATION.SUCCESS});
        /*
        let ownerMember = await teamsPlugin.dataServer.getEntity('clanMembers').create({
            clan_id: createdClan.id,
            player_id: playerSchema.player_id
        });
        ownerMember.parent_player = await teamsPlugin.dataServer.getEntity('players').loadById(playerSchema.player_id);
        createdClan.members = [ownerMember];
        let newClan = Clan.fromModel({
            clanModel: createdClan,
            owner: playerSchema,
            ownerClient: client,
            sharedProperties: room.config.get('client/ui/teams/sharedProperties')
        });
        ClanUpdatesHandler.updateClanPlayers(newClan);
        */
    }
}

module.exports.ClanCreate = ClanCreate;
