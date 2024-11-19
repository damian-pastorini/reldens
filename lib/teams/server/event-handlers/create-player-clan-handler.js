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

    constructor(config, teamsPlugin)
    {
        this.config = config;
        this.sharedProperties = this.config?.get('client/ui/teams/sharedProperties');
        this.clanMembersRepository = teamsPlugin?.dataServer?.getEntity('clanMembers');
    }

    async enrichPlayerWithClan(client, playerSchema, room, teamsPlugin)
    {
        let startEvent = {client, playerSchema, room, teamsPlugin, continueProcess: true};
        teamsPlugin.events.emit('reldens.beforeEnrichPlayerWithClan', startEvent);
        if(!startEvent.continueProcess){
            return false;
        }
        // @TODO - BETA - Improve login performance, avoid query by getting config from existent player schema.
        let clanMemberModel = await this.clanMembersRepository.loadOneByWithRelations(
            'player_id',
            playerSchema.player_id,
            ['parent_player']
        );
        if(!clanMemberModel){
            client.send('*', {act: TeamsConst.ACTIONS.CLAN_INITIALIZE, listener: TeamsConst.CLAN_KEY});
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
        return ClanUpdatesHandler.updateClanPlayers(clan);
    }

    async loadClan(teamsPlugin, clanId, playerSchema, client, room)
    {
        let clan = sc.get(teamsPlugin.clans, clanId, false);
        if(clan){
            //Logger.debug('Loading clan from plugin with ID "'+clanId+'".');
            return clan;
        }
        //Logger.debug('Clan with ID "'+clanId+'" not loaded, creating it.');
        return await ClanFactory.create(clanId, playerSchema, client, this.sharedProperties, teamsPlugin);
    }
}

module.exports.CreatePlayerClanHandler = CreatePlayerClanHandler;
