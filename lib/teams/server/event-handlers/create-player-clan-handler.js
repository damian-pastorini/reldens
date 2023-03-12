/**
 *
 * Reldens - CreatePlayerClanHandler
 *
 */

const { Clan } = require('../clan');
const { TeamsConst } = require('../../constants');
const { sc } = require('@reldens/utils');

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
            ['parent_clan.[members.parent_player, parent_level.modifiers]']
        );
        if(!clanModel){
            return false;
        }
        let clan = this.loadClan(teamsPlugin, clanModel, playerSchema, client, room);
        clan.join(playerSchema, client);
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

    static loadClan(teamsPlugin, clanModel, playerSchema, client, room)
    {
        let clan = sc.get(teamsPlugin.clans, clanModel.id, false);
        if(false === clan){
            clan = Clan.fromModel(
                clanModel.parent_clan,
                playerSchema,
                client,
                room.config.get('client/ui/teams/sharedProperties')
            );
            teamsPlugin.clans[clan.id] = clan;
        }
        return clan;
    }
}

module.exports.CreatePlayerClanHandler = CreatePlayerClanHandler;
