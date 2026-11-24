/**
 *
 * Reldens - OfflinePlayerDeaths
 *
 * Keeps the death of a player that left the game dead, so its game over time keeps running offline (with the auto
 * revive enabled the stored player is revived once it passes), and applies that death again when the player joins a
 * room with no life, emitting "reldens.playerDeathRestored" instead of a new death.
 *
 */

const { Battle } = require('./battle');
const { ActionsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('./player-death-relocator').PlayerDeathRelocator} PlayerDeathRelocator
 * @typedef {import('../../game/server/config-manager').ConfigManager} ConfigManager
 * @typedef {import('../../users/server/manager').UsersManager} UsersManager
 * @typedef {import('../../game/server/player-room-state').PlayerRoomState} PlayerRoomState
 *
 * @typedef {Object} OfflinePlayerDeath
 * @property {string} sessionId
 * @property {number} reviveAt
 * @property {number} baseValue
 * @property {Object|boolean} townState
 * @property {NodeJS.Timeout|boolean} timer
 */
class OfflinePlayerDeaths
{

    /**
     * @param {Object} props
     * @param {PlayerDeathRelocator} props.playerDeathRelocator
     * @param {EventsManager} props.events
     * @param {ConfigManager} props.config
     * @param {string} props.affectedProperty
     */
    constructor(props)
    {
        /** @type {PlayerDeathRelocator} */
        this.playerDeathRelocator = props.playerDeathRelocator;
        /** @type {EventsManager} */
        this.events = props.events;
        /** @type {ConfigManager} */
        this.config = props.config;
        /** @type {string} */
        this.affectedProperty = props.affectedProperty;
        /** @type {Battle} */
        this.deathBattle = new Battle({events: props.events});
        /** @type {UsersManager|boolean} */
        this.usersManager = false;
        /** @type {PlayerRoomState|boolean} */
        this.playerRoomState = false;
        /** @type {Object<string, OfflinePlayerDeath>} */
        this.deathsByPlayerId = {};
    }

    /**
     * @param {Object} serverManager
     * @returns {boolean}
     */
    loadServerManagers(serverManager)
    {
        this.usersManager = serverManager.usersManager;
        this.playerRoomState = serverManager.loginManager.playerRoomState;
        return true;
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    recordDeath(event)
    {
        let playerSchema = event.targetSchema;
        this.dropDeath(playerSchema.player_id);
        this.deathsByPlayerId[playerSchema.player_id] = {
            sessionId: playerSchema.sessionId,
            reviveAt: playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_AT),
            baseValue: playerSchema.statsBase[this.affectedProperty],
            townState: this.playerDeathRelocator.teleportEnabled
                ? this.playerRoomState.getStateObjectFromRoom(this.playerDeathRelocator.townRoom)
                : false,
            timer: false
        };
        return true;
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    keepDeath(event)
    {
        let playerSchema = event.playerSchema;
        let deathData = sc.get(this.deathsByPlayerId, playerSchema?.player_id, false);
        if(!deathData || deathData.sessionId !== playerSchema.sessionId){
            return false;
        }
        if(!playerSchema.isDeath() || 0 < Number(sc.get(playerSchema.stats, this.affectedProperty, 0))){
            this.dropDeath(playerSchema.player_id);
            return false;
        }
        deathData.reviveAt = playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_AT);
        if(this.playerDeathRelocator.autoReviveEnabled){
            deathData.timer = setTimeout(
                () => this.resolveDeath(playerSchema.player_id),
                Math.max(0, deathData.reviveAt - Date.now())
            );
            deathData.timer.unref();
        }
        return true;
    }

    /**
     * @param {number|string} playerId
     * @returns {Promise<boolean>}
     */
    async resolveDeath(playerId)
    {
        let deathData = sc.get(this.deathsByPlayerId, playerId, false);
        if(!deathData){
            return false;
        }
        delete this.deathsByPlayerId[playerId];
        try {
            await this.usersManager.updatePlayerStatByIds(
                playerId,
                this.config.client.players.initialStats[this.affectedProperty].id,
                {value: deathData.baseValue}
            );
            if(deathData.townState){
                await this.usersManager.updateUserStateByPlayerId(playerId, deathData.townState);
            }
            return true;
        } catch (error) {
            Logger.error('Offline player death revive error.', playerId, error.message);
        }
        return false;
    }

    /**
     * @param {number|string} playerId
     * @returns {OfflinePlayerDeath|boolean}
     */
    dropDeath(playerId)
    {
        let deathData = sc.get(this.deathsByPlayerId, playerId, false);
        if(deathData){
            clearTimeout(deathData.timer);
            delete this.deathsByPlayerId[playerId];
        }
        return deathData;
    }

    /**
     * @param {Object} playerSchema
     * @returns {boolean}
     */
    holdDeath(playerSchema)
    {
        let deathData = sc.get(this.deathsByPlayerId, playerSchema.player_id, false);
        if(deathData){
            clearTimeout(deathData.timer);
            deathData.timer = false;
        }
        if(0 < Number(sc.get(playerSchema.stats, this.affectedProperty, 0))){
            return false;
        }
        playerSchema.state.inState = GameConst.STATUS.DEATH;
        return true;
    }

    /**
     * @param {Object} joinedEvent
     * @returns {Promise<boolean>}
     */
    async restoreDeath(joinedEvent)
    {
        let playerSchema = joinedEvent.loggedPlayer;
        let room = joinedEvent.roomScene;
        let deathData = this.dropDeath(playerSchema.player_id);
        if(!playerSchema.stats || 0 < Number(sc.get(playerSchema.stats, this.affectedProperty, 0))){
            if(playerSchema.isDeath()){
                room.activatePlayer(playerSchema, GameConst.STATUS.ACTIVE);
            }
            return false;
        }
        room.clearPlayerLastStateTimer(playerSchema.player_id);
        this.events.emit('reldens.playerDeathRestored', await this.deathBattle.applyDeath({
            targetSchema: playerSchema,
            room,
            targetClient: joinedEvent.client,
            affectedProperty: this.affectedProperty,
            reviveDelayMs: deathData
                ? Math.max(0, deathData.reviveAt - Date.now())
                : this.playerDeathRelocator.gameOverTimeOut
        }));
        return true;
    }

}

module.exports.OfflinePlayerDeaths = OfflinePlayerDeaths;
