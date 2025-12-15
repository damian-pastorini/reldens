/**
 *
 * Reldens - CreatePlayerClanHandler
 *
 * Handles clan membership restoration when players log in or change rooms.
 * Loads clan data, rejoins players to their clan, and broadcasts updates to clan members.
 *
 */

const { ClanFactory } = require('../clan-factory');
const { ClanUpdatesHandler } = require('../clan-updates-handler');
const { TeamsConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../../rooms/server/state').PlayerState} PlayerState
 * @typedef {import('../../../rooms/server/scene').RoomScene} RoomScene
 * @typedef {import('../plugin').TeamsPlugin} TeamsPlugin
 * @typedef {import('../../../config/server/manager').ConfigManager} ConfigManager
 * @typedef {import('@reldens/storage').BaseDriver} BaseDriver
 */
class CreatePlayerClanHandler
{

    /**
     * @param {ConfigManager} config
     * @param {TeamsPlugin} teamsPlugin
     */
    constructor(config, teamsPlugin)
    {
        /** @type {ConfigManager} */
        this.config = config;
        /** @type {Object|undefined} */
        this.sharedProperties = this.config?.get('client/ui/teams/sharedProperties');
        /** @type {BaseDriver|undefined} */
        this.clanMembersRepository = teamsPlugin?.dataServer?.getEntity('clanMembers');
    }

    /**
     * @param {Object} client
     * @param {PlayerState} playerSchema
     * @param {RoomScene} room
     * @param {TeamsPlugin} teamsPlugin
     * @returns {Promise<boolean>}
     */
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
            ['related_players']
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

    /**
     * @param {TeamsPlugin} teamsPlugin
     * @param {number|string} clanId
     * @param {PlayerState} playerSchema
     * @param {Object} client
     * @param {RoomScene} room
     * @returns {Promise<Object|boolean>}
     */
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
