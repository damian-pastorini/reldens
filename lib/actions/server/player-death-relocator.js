/**
 *
 * Reldens - PlayerDeathRelocator
 *
 * Resolves how a dead player is revived once the game over time passed. With the death teleport disabled and the
 * auto revive enabled the battle revive timer revives it where it died. Otherwise it replaces that timer by its own:
 * with the teleport disabled the player is revived where it died, with the teleport enabled the player carrying the
 * restoration item is revived where it died consuming one item when the item is consumed automatically or the player
 * chose to use it (the resurrection ad reward is that choice), otherwise it is revived on the town room default return
 * point. The town room (the teleport room, or the players initial room when it is not set) is loaded once when the
 * server is ready and the teleport is enabled only with that room loaded. With the auto revive disabled, once the game
 * over time passed the player is only revived when it asks for it: one request runs at a time and a failed request
 * keeps the revive ready, so the player can ask again. While the resurrection ad of the death is playing (its start
 * stored by the ads system and not ended or failed yet) the resolution waits for its reward item, up to the ads videos
 * maximum duration. The config and the events manager are validated once (validate), the plugin attaches the death
 * listeners only when they are valid, otherwise the battle revive stays in place.
 *
 */

const { PlayerRelocator } = require('../../rooms/server/player-relocator');
const { ConfigProcessor } = require('../../config/processor');
const { ActionsConst } = require('../constants');
const { AdsConst } = require('../../ads/constants');
const { InventoryConst } = require('../../inventory/constants');
const { RoomsConst } = require('../../rooms/constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../rooms/server/manager').RoomsManager} RoomsManager
 */
class PlayerDeathRelocator
{

    /**
     * @param {Object} props
     * @param {ConfigProcessor} props.config
     * @param {EventsManager} props.events
     */
    constructor(props)
    {
        /** @type {ConfigProcessor|boolean} */
        this.config = sc.get(props, 'config', false);
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        /** @type {Object|boolean} */
        this.townRoom = false;
    }

    /**
     * @returns {boolean}
     */
    validate()
    {
        if(!(this.config instanceof ConfigProcessor)){
            Logger.error('Config is not a ConfigProcessor instance in PlayerDeathRelocator.');
            return false;
        }
        if(!this.events){
            Logger.error('Missing EventsManager in PlayerDeathRelocator.');
            return false;
        }
        return true;
    }

    /**
     * @param {RoomsManager} roomsManager
     * @returns {Promise<boolean>}
     */
    async loadTownRoom(roomsManager)
    {
        let townRoomId = this.config.getWithoutLogs(ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ROOM_ID, 0)
            || this.config.getWithoutLogs('server/'+RoomsConst.DEFAULT_ROOM_CONFIG_PATH, 0);
        this.townRoom = await roomsManager.loadRoomById(townRoomId);
        if(!this.townRoom){
            Logger.error('Town room "'+townRoomId+'" not found, the dead players revive where they died.');
            return false;
        }
        return true;
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    onPlayerDeath(event)
    {
        let playerSchema = event.targetSchema;
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_REQUESTED, false);
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED, false);
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_ENDED, false);
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_FAILED, false);
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE, '');
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_READY, false);
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_REQUESTED, false);
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_EVENT, event);
        if(
            !event.revivePlayerCallback
            || !playerSchema.isDeath()
            || (!this.isTeleportEnabled() && this.isAutoReviveEnabled())
        ){
            return false;
        }
        let gameOverTimeOut = this.config.getWithoutLogs(
            ActionsConst.DEATH.CONFIG_PATHS.GAME_OVER_TIME_OUT,
            ActionsConst.DEATH.DEFAULTS.GAME_OVER_TIME_OUT
        );
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_AT, Date.now() + gameOverTimeOut);
        return this.scheduleDeathTimer(
            event,
            gameOverTimeOut,
            async () => this.isAutoReviveEnabled() ? await this.resolveDeath(event) : await this.markReviveReady(event)
        );
    }

    /**
     * @returns {boolean}
     */
    isTeleportEnabled()
    {
        return false !== this.townRoom && this.config.getWithoutLogs(
            ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED,
            ActionsConst.DEATH.DEFAULTS.TELEPORT_ENABLED
        );
    }

    /**
     * @returns {boolean}
     */
    isAutoReviveEnabled()
    {
        return this.config.getWithoutLogs(
            ActionsConst.DEATH.CONFIG_PATHS.AUTO_REVIVE,
            ActionsConst.DEATH.DEFAULTS.AUTO_REVIVE
        );
    }

    /**
     * @returns {boolean}
     */
    isAutoConsumeEnabled()
    {
        return this.config.getWithoutLogs(
            ActionsConst.DEATH.CONFIG_PATHS.AUTO_CONSUME_RESTORATION_ITEM,
            ActionsConst.DEATH.DEFAULTS.AUTO_CONSUME_RESTORATION_ITEM
        );
    }

    /**
     * @param {Object} event
     * @param {number} delayMs
     * @param {function(): Promise<boolean>} timerAction
     * @returns {boolean}
     */
    scheduleDeathTimer(event, delayMs, timerAction)
    {
        let playerSchema = event.targetSchema;
        clearTimeout(playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_TIMER));
        playerSchema.setPrivate(
            ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_TIMER,
            setTimeout(
                () => timerAction().catch((error) => {
                    Logger.error('Death resolution error.', playerSchema.player_id, error.message);
                    return false;
                }),
                delayMs
            )
        );
        return true;
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async markReviveReady(event)
    {
        if(!this.isStillDead(event)){
            return false;
        }
        event.targetSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_READY, true);
        await this.events.emit('reldens.playerReviveReady', event);
        return true;
    }

    /**
     * @param {Object|boolean} playerSchema
     * @param {Object} room
     * @returns {Promise<boolean>}
     */
    async requestRevive(playerSchema, room)
    {
        if(
            !this.isDeathInRoom(playerSchema, room)
            || !playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_READY)
            || playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_REQUESTED)
        ){
            return false;
        }
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_REQUESTED, true);
        let deathEvent = playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_EVENT);
        let isResolved = await this.resolveDeath(deathEvent).catch((error) => {
            Logger.error('Revive request error, the player can ask again.', playerSchema.player_id, error.message);
            return false;
        });
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_REQUESTED, false);
        return isResolved;
    }

    /**
     * @param {Object|boolean} playerSchema
     * @param {Object} room
     * @param {boolean} useRestorationItem
     * @returns {boolean}
     */
    chooseRestorationItem(playerSchema, room, useRestorationItem)
    {
        if(
            !this.isDeathInRoom(playerSchema, room)
            || !this.isTeleportEnabled()
            || !this.isRestorationItemQuestionOpen(playerSchema)
            || !this.findRestorationItem(playerSchema)
        ){
            return false;
        }
        playerSchema.setPrivate(
            ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE,
            useRestorationItem ? ActionsConst.DEATH.RESTORATION_ITEM_CHOICES.USE
                : ActionsConst.DEATH.RESTORATION_ITEM_CHOICES.KEEP
        );
        return true;
    }

    /**
     * @param {Object} playerSchema
     * @returns {boolean}
     */
    isRestorationItemUsed(playerSchema)
    {
        return this.isAutoConsumeEnabled() || ActionsConst.DEATH.RESTORATION_ITEM_CHOICES.USE === playerSchema.getPrivate(
            ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE
        );
    }

    /**
     * @param {Object} playerSchema
     * @returns {boolean}
     */
    isRestorationItemQuestionOpen(playerSchema)
    {
        return !this.isAutoConsumeEnabled()
            && !playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE);
    }

    /**
     * @param {Object} playerSchema
     * @returns {number}
     */
    fetchReviveWaitSeconds(playerSchema)
    {
        return Math.max(
            ActionsConst.DEATH.DEFAULTS.MIN_REVIVE_WAIT_SECONDS,
            Math.ceil(
                (Number(playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_AT) || 0) - Date.now())
                / ActionsConst.DEATH.DEFAULTS.SECOND_MS
            )
        );
    }

    /**
     * @param {Object|boolean} playerSchema
     * @param {Object} room
     * @returns {boolean}
     */
    isDeathInRoom(playerSchema, room)
    {
        return Boolean(playerSchema)
            && playerSchema.isDeath()
            && room === playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_EVENT)?.room;
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    isStillDead(event)
    {
        return Boolean(event.room.activePlayerBySessionId(event.targetSchema.sessionId, event.room.roomId))
            && event.targetSchema.isDeath();
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async resolveDeath(event)
    {
        if(!this.isStillDead(event)){
            return false;
        }
        if(!this.isTeleportEnabled()){
            return await event.revivePlayerCallback();
        }
        let playerSchema = event.targetSchema;
        let restorationItem = this.findRestorationItem(playerSchema);
        if(!restorationItem && this.isWaitingResurrectionAd(playerSchema)){
            return this.scheduleDeathTimer(
                event,
                ActionsConst.DEATH.DEFAULTS.RESURRECTION_AD_CHECK_MS,
                async () => await this.resolveDeath(event)
            );
        }
        if(restorationItem && this.isRestorationItemUsed(playerSchema)){
            await playerSchema.inventory.manager.decreaseItemQty(
                restorationItem.getInventoryId(),
                InventoryConst.CONSUMED_ITEM_QTY
            );
            return await event.revivePlayerCallback();
        }
        return await this.reviveInTown(event);
    }

    /**
     * @param {Object} playerSchema
     * @returns {Object|boolean}
     */
    findRestorationItem(playerSchema)
    {
        let itemKey = this.config.getWithoutLogs(ActionsConst.DEATH.CONFIG_PATHS.RESTORATION_ITEM_KEY, '');
        let inventoryManager = playerSchema.inventory?.manager;
        if(!itemKey || !inventoryManager){
            return false;
        }
        let restorationItem = inventoryManager.findItemByKey(itemKey);
        if(0 < Number(restorationItem?.qty)){
            return restorationItem;
        }
        return false;
    }

    /**
     * @param {Object} playerSchema
     * @returns {boolean}
     */
    isWaitingResurrectionAd(playerSchema)
    {
        return 0 < Number(playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED))
            && !playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_ENDED)
            && !playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_FAILED)
            && Date.now() - playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED)
            < this.config.getWithoutLogs(
                AdsConst.CONFIG_PATHS.VIDEOS_MAXIMUM_DURATION,
                AdsConst.VIDEOS_MAXIMUM_DURATION
            );
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async reviveInTown(event)
    {
        let playerSchema = event.targetSchema;
        let relocator = new PlayerRelocator(event.room);
        if(this.townRoom.roomName === event.room.roomName){
            await relocator.relocate(event.targetClient, playerSchema, this.townRoom.roomName);
            return await event.revivePlayerCallback();
        }
        playerSchema.stats[event.affectedProperty] = playerSchema.statsBase[event.affectedProperty];
        await event.room.savePlayerStats(playerSchema, event.targetClient);
        event.targetClient.send('*', {act: GameConst.REVIVED, t: playerSchema.sessionId});
        if(await relocator.relocate(event.targetClient, playerSchema, this.townRoom.roomName)){
            return true;
        }
        return await event.revivePlayerCallback();
    }

}

module.exports.PlayerDeathRelocator = PlayerDeathRelocator;
