/**
 *
 * Reldens - CreatePlayerClanHandler
 *
 */

const { Clan } = require('../clan');
const { TeamsConst } = require('../../constants');

class CreatePlayerClanHandler
{
    
    static async enrichPlayerWithClan(client, playerSchema, room, teamsPlugin)
    {
        let startEvent = {client, playerSchema, room, teamsPlugin, continueProcess: true};
        teamsPlugin.events.emit('reldens.beforeEnrichPlayerWithClan', startEvent);
        if(!startEvent.continueProcess){
            return false;
        }
        let clanModel = await teamsPlugin.dataServer.getEntity('clanMembers').loadOneByWithRelations(
            'player_id',
            playerSchema.player_id,
            ['parent_clan.parent_level.modifiers']
        );
        if(!clanModel){
            return false;
        }
        let clan = Clan.fromModel(
            clanModel.parent_clan,
            playerSchema,
            room.config.get('client/ui/teams/sharedProperties')
        );
        playerSchema.privateData.clan = clan;
        let sendData = {
            act: TeamsConst.ACTIONS.CLAN_UPDATE,
            clan: clan.forSendData(),
        };
        let endEvent = {client, playerSchema, room, teamsPlugin, sendData, continueProcess: true};
        teamsPlugin.events.emit('reldens.beforePlayerClanDataSend', endEvent);
        if(!endEvent.continueProcess){
            return false;
        }
        client.send('*', sendData);
    }

}

module.exports.CreatePlayerClanHandler = CreatePlayerClanHandler;
