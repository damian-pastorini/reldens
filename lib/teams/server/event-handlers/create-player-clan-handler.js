/**
 *
 * Reldens - CreatePlayerClanHandler
 *
 */

const { ClanFactory } = require('../clan-factory');
const { ClanUpdatesHandler } = require('../clan-updates-handler');
const { TeamsConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

class CreatePlayerClanHandler
{
    
    static async enrichPlayerWithClan(client, playerSchema, room, teamsPlugin)
    {
        let startEvent = {client, playerSchema, room, teamsPlugin, continueProcess: true};
        teamsPlugin.events.emit('reldens.beforeEnrichPlayerWithClan', startEvent);
        if(!startEvent.continueProcess){
            return false;
        }
        let clanMemberModel = await teamsPlugin.dataServer.getEntity('clanMembers').loadOneByWithRelations(
            'player_id',
            playerSchema.player_id,
            ['parent_player']
        );
        if(!clanMemberModel){
            let sendData = {
                act: TeamsConst.ACTIONS.CLAN_INITIALIZE,
                listener: TeamsConst.CLAN_KEY
            };
            client.send('*', sendData);
            return true;
        }
        let clan = await this.loadClan(teamsPlugin, clanMemberModel.clan_id, playerSchema, client, room);
        if(!clan){
            Logger.error('Loading clan by ID "'+clanMemberModel.clan_id+'" not found.', clan);
            return false;
        }
        clan.join(playerSchema, client, clanMemberModel);
        playerSchema.setPrivate('clan', clanMemberModel.clan_id);
        let endEvent = {client, playerSchema, room, teamsPlugin, continueProcess: true};
        teamsPlugin.events.emit('reldens.beforeEnrichPlayerWithClanUpdate', endEvent);
        if(!endEvent.continueProcess){
            return false;
        }
        // console.log('CreatePlayerClanHandler::enrichPlayerWithClan');
        return ClanUpdatesHandler.updateClanPlayers(clan);
    }

    static async loadClan(teamsPlugin, clanId, playerSchema, client, room)
    {
        let clan = sc.get(teamsPlugin.clans, clanId, false);
        if(!clan){
            return await ClanFactory.create(
                clanId,
                playerSchema,
                client,
                room.config.get('client/ui/teams/sharedProperties'),
                teamsPlugin
            );
        }
        return clan;
    }
}

module.exports.CreatePlayerClanHandler = CreatePlayerClanHandler;
