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
 * over time passed the player is only revived when it asks for it, and a failed request keeps the revive ready, so the
 * player can ask again, with the auto revive enabled a failed resolution is retried, since that player has no button
 * to ask for it. One resolution runs at a time per death (the timers and the requests share that guard), so two
 * resolutions never consume two restoration items. While the resurrection ad of the death is playing (its start
 * accepted and waiting for the ads system, or stored by it, and not ended or failed yet) the resolution waits for its
 * reward item, up to the ads videos maximum duration. The config and the events manager come from the actions plugin,
 * which validates them once before it creates this class, so they are never checked here.
 *
 */

const { PlayerRelocator } = require('../../rooms/server/player-relocator');
const { ActionsConst } = require('../constants');
const { AdsConst } = require('../../ads/constants');
const { InventoryConst } = require('../../inventory/constants');
const { RoomsConst } = require('../../rooms/constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../rooms/server/manager').RoomsManager} RoomsManager
 * @typedef {import('../../config/processor').ConfigProcessor} ConfigProcessor
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
        /** @type {boolean} */
        this.teleportEnabled = false;
        /** @type {boolean} */
        this.autoReviveEnabled = false;
        /** @type {boolean} */
        this.autoConsumeEnabled = false;
        /** @type {number} */
        this.gameOverTimeOut = 0;
        /** @type {string} */
        this.restorationItemKey = '';
        /** @type {string} */
        this.resurrectionAdsKey = '';
        /** @type {number} */
        this.adsMaximumDuration = 0;
        /** @type {Object} */
        this.adsCollection = {};
    }

    loadConfig()
    {
        let configPaths = ActionsConst.DEATH.CONFIG_PATHS;
        let defaults = ActionsConst.DEATH.DEFAULTS;
        this.teleportEnabled = false !== this.townRoom
            && this.config.getWithoutLogs(configPaths.TELEPORT_ENABLED, defaults.TELEPORT_ENABLED);
        this.autoReviveEnabled = this.config.getWithoutLogs(configPaths.AUTO_REVIVE, defaults.AUTO_REVIVE);
        this.autoConsumeEnabled = this.config.getWithoutLogs(
            configPaths.AUTO_CONSUME_RESTORATION_ITEM,
            defaults.AUTO_CONSUME_RESTORATION_ITEM
        );
        this.gameOverTimeOut = this.config.getWithoutLogs(configPaths.GAME_OVER_TIME_OUT, defaults.GAME_OVER_TIME_OUT);
        this.restorationItemKey = this.config.getWithoutLogs(configPaths.RESTORATION_ITEM_KEY, '');
        this.resurrectionAdsKey = this.config.getWithoutLogs(configPaths.RESURRECTION_ADS_KEY, '');
        this.adsMaximumDuration = this.config.getWithoutLogs(
            AdsConst.CONFIG_PATHS.VIDEOS_MAXIMUM_DURATION,
            AdsConst.VIDEOS_MAXIMUM_DURATION
        );
        this.adsCollection = this.config.getWithoutLogs(AdsConst.CONFIG_PATHS.COLLECTION, {});
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
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.DEATH_RESOLVING, false);
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_EVENT, event);
        if(
            !event.revivePlayerCallback
            || !playerSchema.isDeath()
            || (!this.teleportEnabled && this.autoReviveEnabled)
        ){
            return false;
        }
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_AT, Date.now() + this.gameOverTimeOut);
        return this.scheduleDeathTimer(
            event,
            this.gameOverTimeOut,
            async () => this.autoReviveEnabled ? await this.resolveDeath(event) : await this.markReviveReady(event)
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
        ){
            return false;
        }
        return await this.resolveDeath(playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_EVENT));
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
            || !this.teleportEnabled
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
        return this.autoConsumeEnabled || ActionsConst.DEATH.RESTORATION_ITEM_CHOICES.USE === playerSchema.getPrivate(
            ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE
        );
    }

    /**
     * @param {Object} playerSchema
     * @returns {boolean}
     */
    isRestorationItemQuestionOpen(playerSchema)
    {
        return !this.autoConsumeEnabled
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
        let playerSchema = event.targetSchema;
        if(!this.isStillDead(event) || playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.DEATH_RESOLVING)){
            return false;
        }
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.DEATH_RESOLVING, true);
        let isResolved = await this.runDeathResolution(event).catch((error) => {
            Logger.error(
                'Death resolution error, the revive can be resolved again.',
                playerSchema.player_id,
                error.message
            );
            return false;
        });
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.DEATH_RESOLVING, false);
        if(!isResolved && this.autoReviveEnabled){
            this.scheduleDeathTimer(
                event,
                ActionsConst.DEATH.DEFAULTS.REVIVE_RETRY_MS,
                async () => await this.resolveDeath(event)
            );
        }
        return isResolved;
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async runDeathResolution(event)
    {
        if(!this.teleportEnabled){
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
        let inventoryManager = playerSchema.inventory?.manager;
        if(!this.restorationItemKey || !inventoryManager){
            return false;
        }
        let restorationItem = inventoryManager.findItemByKey(this.restorationItemKey);
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
        return 0 < Number(playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_REQUESTED))
            && !playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_ENDED)
            && !playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_FAILED)
            && Date.now() - Number(
                playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED)
                || playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_REQUESTED)
            ) < this.adsMaximumDuration;
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async reviveInTown(event)
    {
        let playerSchema = event?.targetSchema;
        if(!playerSchema){
            return false;
        }
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
