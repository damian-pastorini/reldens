/**
 *
 * Reldens - PlayerDeathRelocator
 *
 * Resolves how a dead player is revived once the game over time passed. With the death teleport disabled and the
 * auto revive enabled the battle revive timer revives it where it died. Otherwise it replaces that timer by its own:
 * with the teleport disabled the player is revived where it died, with the teleport enabled the player carrying the
 * restoration item is revived where it died consuming one item when the item is consumed automatically or the player
 * chose to use it (the resurrection ad reward is that choice), otherwise it is revived on the town room default return
 * point. With the auto revive disabled, once the game over time passed the player is only revived when it asks for it.
 * While the resurrection ad of the death is playing the resolution waits for its reward item, up to the maximum wait
 * time; a failed ad gives no item, so it is not waited. A config that is not a ConfigProcessor instance is discarded
 * and leaves the battle revive in place.
 *
 */

const { PlayerRelocator } = require('../../rooms/server/player-relocator');
const { ConfigProcessor } = require('../../config/processor');
const { ActionsConst } = require('../constants');
const { InventoryConst } = require('../../inventory/constants');
const { RoomsConst } = require('../../rooms/constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 */
class PlayerDeathRelocator
{

    /**
     * @param {Object} props
     * @param {ConfigProcessor} props.config
     * @param {EventsManager} [props.events]
     */
    constructor(props)
    {
        /** @type {ConfigProcessor|boolean} */
        this.config = sc.get(props, 'config', false);
        if(!(this.config instanceof ConfigProcessor)){
            Logger.critical('Config is not a ConfigProcessor instance in PlayerDeathRelocator.');
            this.config = false;
        }
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    onPlayerDeath(event)
    {
        let playerSchema = event.targetSchema;
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED, false);
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_FAILED, false);
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE, '');
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_READY, false);
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_EVENT, event);
        if(
            !event.revivePlayerCallback
            || !playerSchema.isDeath()
            || (!this.isTeleportEnabled() && this.isAutoReviveEnabled())
        ){
            return false;
        }
        let gameOverTimeOut = Number(this.config.getWithoutLogs(
            ActionsConst.DEATH.CONFIG_PATHS.GAME_OVER_TIME_OUT,
            ActionsConst.DEATH.DEFAULTS.GAME_OVER_TIME_OUT
        ));
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_AT, Date.now() + gameOverTimeOut);
        return this.scheduleDeathTimer(event, gameOverTimeOut, async () => await this.onReviveTime(event));
    }

    /**
     * @returns {boolean}
     */
    isTeleportEnabled()
    {
        if(!this.config){
            return false;
        }
        return Boolean(this.config.getWithoutLogs(ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED, false));
    }

    /**
     * @returns {boolean}
     */
    isAutoReviveEnabled()
    {
        if(!this.config){
            return ActionsConst.DEATH.DEFAULTS.AUTO_REVIVE;
        }
        return Boolean(this.config.getWithoutLogs(
            ActionsConst.DEATH.CONFIG_PATHS.AUTO_REVIVE,
            ActionsConst.DEATH.DEFAULTS.AUTO_REVIVE
        ));
    }

    /**
     * @returns {boolean}
     */
    isAutoConsumeEnabled()
    {
        if(!this.config){
            return ActionsConst.DEATH.DEFAULTS.AUTO_CONSUME_RESTORATION_ITEM;
        }
        return Boolean(this.config.getWithoutLogs(
            ActionsConst.DEATH.CONFIG_PATHS.AUTO_CONSUME_RESTORATION_ITEM,
            ActionsConst.DEATH.DEFAULTS.AUTO_CONSUME_RESTORATION_ITEM
        ));
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
    async onReviveTime(event)
    {
        if(this.isAutoReviveEnabled()){
            return await this.resolveDeath(event);
        }
        return await this.markReviveReady(event);
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
        if(!this.events){
            Logger.error('EventsManager not available in PlayerDeathRelocator, the revive ready message was not sent.');
            return false;
        }
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
        playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_READY, false);
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
        if(!this.isDeathInRoom(playerSchema, room) || !this.isTeleportEnabled()){
            return false;
        }
        if(!this.isRestorationItemQuestionOpen(playerSchema) || !this.findRestorationItem(playerSchema)){
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
    acceptResurrectionAdReward(playerSchema)
    {
        playerSchema.setPrivate(
            ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE,
            ActionsConst.DEATH.RESTORATION_ITEM_CHOICES.USE
        );
        return true;
    }

    /**
     * @param {Object} playerSchema
     * @returns {boolean}
     */
    isRestorationItemUsed(playerSchema)
    {
        if(this.isAutoConsumeEnabled()){
            return true;
        }
        return ActionsConst.DEATH.RESTORATION_ITEM_CHOICES.USE === playerSchema.getPrivate(
            ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE
        );
    }

    /**
     * @param {Object} playerSchema
     * @returns {boolean}
     */
    isRestorationItemQuestionOpen(playerSchema)
    {
        if(this.isAutoConsumeEnabled()){
            return false;
        }
        return !playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE);
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
        if(!playerSchema || !playerSchema.isDeath()){
            return false;
        }
        return room === playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_EVENT)?.room;
    }

    /**
     * @param {Object} event
     * @returns {boolean}
     */
    isStillDead(event)
    {
        let playerSchema = event.targetSchema;
        if(!event.room.activePlayerBySessionId(playerSchema.sessionId, event.room.roomId)){
            return false;
        }
        return playerSchema.isDeath();
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
        let adStartedAt = Number(playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED));
        if(!adStartedAt || playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_FAILED)){
            return false;
        }
        return Date.now() - adStartedAt < ActionsConst.DEATH.DEFAULTS.RESURRECTION_AD_MAX_WAIT_MS;
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async reviveInTown(event)
    {
        let townRoomName = await this.fetchTownRoomName(event.room);
        let playerSchema = event.targetSchema;
        let relocator = new PlayerRelocator(event.room);
        if(townRoomName === event.room.roomName){
            await relocator.relocate(event.targetClient, playerSchema, townRoomName);
            return await event.revivePlayerCallback();
        }
        playerSchema.stats[event.affectedProperty] = playerSchema.statsBase[event.affectedProperty];
        await event.room.savePlayerStats(playerSchema, event.targetClient);
        event.targetClient.send('*', {act: GameConst.REVIVED, t: playerSchema.sessionId});
        if(await relocator.relocate(event.targetClient, playerSchema, townRoomName)){
            return true;
        }
        return await event.revivePlayerCallback();
    }

    /**
     * @param {Object} room
     * @returns {Promise<string>}
     */
    async fetchTownRoomName(room)
    {
        return await room.loginManager.playerRoomState.getRoomNameById(this.fetchTownRoomId());
    }

    /**
     * @returns {number}
     */
    fetchTownRoomId()
    {
        return Number(
            this.config.getWithoutLogs(ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ROOM_ID, 0)
            || this.config.getWithoutLogs('server/'+RoomsConst.DEFAULT_ROOM_CONFIG_PATH, 0)
        );
    }

}

module.exports.PlayerDeathRelocator = PlayerDeathRelocator;
