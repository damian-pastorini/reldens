/**
 *
 * Reldens - CreatePlayerClanHandler
 *
 */

const { Clan } = require('../clan');
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
        let clanMemberModel = await teamsPlugin.dataServer.getEntity('clanMembers').loadOneBy(
            'player_id',
            playerSchema.player_id
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
            return false;
        }
        clan.join(playerSchema, client);
        playerSchema.privateData.clan = clan;
        let endEvent = {client, playerSchema, room, teamsPlugin, continueProcess: true};
        teamsPlugin.events.emit('reldens.beforeEnrichPlayerWithClanUpdate', endEvent);
        if(!endEvent.continueProcess){
            return false;
        }
        return ClanUpdatesHandler.updateClanPlayers(clan);
    }

    static async loadClan(teamsPlugin, clanId, playerSchema, client, room)
    {
        let clan = sc.get(teamsPlugin.clans, clanId, false);
        if(false === clan){
            let clanModel = await teamsPlugin.dataServer.getEntity('clan').loadByIdWithRelations(
                clanId,
                ['members.parent_player, parent_level.modifiers']
            );
            if(!clanModel){
                Logger.error('Clan not found by ID "'+clanId+'".');
                return false;
            }
            clan = Clan.fromModel({
                clanModel,
                owner: playerSchema,
                ownerClient: client,
                sharedProperties: room.config.get('client/ui/teams/sharedProperties')
            });
            teamsPlugin.clans[clan.id] = clan;
        }
        return clan;
    }
}

module.exports.CreatePlayerClanHandler = CreatePlayerClanHandler;
