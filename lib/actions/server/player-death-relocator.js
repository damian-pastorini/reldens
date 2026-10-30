/**
 *
 * Reldens - PlayerDeathRelocator
 *
 * When the death teleport is enabled it replaces the battle revive timer of a dead player, after the same game over
 * time the player carrying the restoration item is revived where it died (one item is consumed), otherwise it is
 * revived on the town room default return point. While the resurrection ad of the death is playing the resolution
 * waits for its reward item, up to the maximum wait time; a failed ad gives no item, so it is not waited. A config that
 * is not a ConfigProcessor instance is discarded and leaves the battle revive in place.
 *
 */

const { PlayerRelocator } = require('../../rooms/server/player-relocator');
const { ConfigProcessor } = require('../../config/processor');
const { ActionsConst } = require('../constants');
const { InventoryConst } = require('../../inventory/constants');
const { RoomsConst } = require('../../rooms/constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class PlayerDeathRelocator
{

    /**
     * @param {Object} props
     * @param {ConfigProcessor} props.config
     */
    constructor(props)
    {
        /** @type {ConfigProcessor|boolean} */
        this.config = sc.get(props, 'config', false);
        if(!(this.config instanceof ConfigProcessor)){
            Logger.critical('Config is not a ConfigProcessor instance in PlayerDeathRelocator.');
            this.config = false;
        }
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
        if(
            !this.config
            || !this.config.getWithoutLogs(ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED, false)
            || !event.revivePlayerCallback
            || !playerSchema.isDeath()
        ){
            return false;
        }
        return this.scheduleDeathResolution(
            event,
            Number(this.config.getWithoutLogs(
                ActionsConst.DEATH.CONFIG_PATHS.GAME_OVER_TIME_OUT,
                ActionsConst.DEATH.DEFAULTS.GAME_OVER_TIME_OUT
            ))
        );
    }

    /**
     * @param {Object} event
     * @param {number} delayMs
     * @returns {boolean}
     */
    scheduleDeathResolution(event, delayMs)
    {
        let playerSchema = event.targetSchema;
        clearTimeout(playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_TIMER));
        playerSchema.setPrivate(
            ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_TIMER,
            setTimeout(
                () => this.resolveDeath(event).catch((error) => {
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
    async resolveDeath(event)
    {
        let playerSchema = event.targetSchema;
        if(!event.room.activePlayerBySessionId(playerSchema.sessionId, event.room.roomId) || !playerSchema.isDeath()){
            return false;
        }
        let restorationItem = this.findRestorationItem(playerSchema);
        if(!restorationItem && this.isWaitingResurrectionAd(playerSchema)){
            return this.scheduleDeathResolution(event, ActionsConst.DEATH.DEFAULTS.RESURRECTION_AD_CHECK_MS);
        }
        if(restorationItem){
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
        return await room.loginManager.playerRoomState.getRoomNameById(Number(
            this.config.getWithoutLogs(ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ROOM_ID, 0)
            || this.config.getWithoutLogs('server/'+RoomsConst.DEFAULT_ROOM_CONFIG_PATH, 0)
        ));
    }

}

module.exports.PlayerDeathRelocator = PlayerDeathRelocator;
