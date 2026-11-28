/**
 *
 * Reldens - OfflinePlayerDeaths
 *
 * Keeps the death of a player that left the game dead, so its game over time keeps running offline (with the auto
 * revive enabled the stored player is revived once it passes, on its affected stat loaded by key when the server is
 * ready), and applies that death again when the player joins a room with no life, emitting
 * "reldens.playerDeathRestored" instead of a new death.
 *
 */

const { Battle } = require('./battle');
const { ActionsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('./player-death-relocator').PlayerDeathRelocator} PlayerDeathRelocator
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
     * @param {string} props.affectedProperty
     */
    constructor(props)
    {
        /** @type {PlayerDeathRelocator} */
        this.playerDeathRelocator = props.playerDeathRelocator;
        /** @type {EventsManager} */
        this.events = props.events;
        /** @type {string} */
        this.affectedProperty = props.affectedProperty;
        /** @type {number} */
        this.affectedStatId = 0;
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
     * @returns {Promise<void>}
     */
    async loadServerManagers(serverManager)
    {
        this.usersManager = serverManager.usersManager;
        this.playerRoomState = serverManager.loginManager.playerRoomState;
        this.affectedStatId = Number(sc.get(
            await this.usersManager.statsRepository.loadOneBy('key', this.affectedProperty),
            'id',
            0
        ));
        if(0 === this.affectedStatId){
            Logger.error('Offline player deaths affected stat not found: '+this.affectedProperty);
        }
    }

    /**
     * @param {Object} event
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
    }

    /**
     * @param {Object} event
     */
    keepDeath(event)
    {
        let playerSchema = event.playerSchema;
        let deathData = sc.get(this.deathsByPlayerId, playerSchema?.player_id, false);
        if(!deathData || deathData.sessionId !== playerSchema.sessionId){
            return;
        }
        if(!playerSchema.isDeath() || 0 < Number(sc.get(playerSchema.stats, this.affectedProperty, 0))){
            this.dropDeath(playerSchema.player_id);
            return;
        }
        deathData.reviveAt = playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_AT);
        if(!this.playerDeathRelocator.autoReviveEnabled){
            return;
        }
        deathData.timer = setTimeout(
            () => this.resolveDeath(playerSchema.player_id),
            Math.max(0, deathData.reviveAt - Date.now())
        );
        deathData.timer.unref();
    }

    /**
     * @param {number|string} playerId
     * @returns {Promise<void>}
     */
    async resolveDeath(playerId)
    {
        let deathData = sc.get(this.deathsByPlayerId, playerId, false);
        if(!deathData){
            return;
        }
        delete this.deathsByPlayerId[playerId];
        try {
            await this.usersManager.updatePlayerStatByIds(playerId, this.affectedStatId, {value: deathData.baseValue});
            if(deathData.townState){
                await this.usersManager.updateUserStateByPlayerId(playerId, deathData.townState);
            }
        } catch (error) {
            Logger.error('Offline player death revive error.', playerId, error.message);
        }
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
     */
    holdDeath(playerSchema)
    {
        let deathData = sc.get(this.deathsByPlayerId, playerSchema.player_id, false);
        if(deathData){
            clearTimeout(deathData.timer);
            deathData.timer = false;
        }
        if(0 < Number(sc.get(playerSchema.stats, this.affectedProperty, 0))){
            return;
        }
        playerSchema.state.inState = GameConst.STATUS.DEATH;
    }

    /**
     * @param {Object} joinedEvent
     * @returns {Promise<void>}
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
            return;
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
    }

}

module.exports.OfflinePlayerDeaths = OfflinePlayerDeaths;
