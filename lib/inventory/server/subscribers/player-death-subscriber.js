/**
 *
 * Reldens - PlayerDeathSubscriber
 *
 * Handles player death events and item drops.
 * Manages drop animations, positioning, and broadcasting to clients.
 *
 */

const { DropsAnimations } = require('../../../rewards/server/drops-animations');
const { WorldWalkableNodesAroundProvider } = require('../../../world/server/world-walkable-nodes-around-provider');
const { ObjectTypes } = require('../../../objects/server/object/object-types');
const { ObjectsConst } = require('../../../objects/constants');
const { GameConst } = require('../../../game/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@colyseus/core').Client} Client
 * @typedef {import('@reldens/storage').BaseDriver} BaseDriver
 * @typedef {import('../models-manager').ModelsManager} ModelsManager
 */
class PlayerDeathSubscriber
{

    /**
     * @param {ModelsManager} modelsManager
     */
    constructor(modelsManager)
    {
        /** @type {ModelsManager} */
        this.modelsManager = modelsManager;
        /** @type {BaseDriver} */
        this.dropsAnimationsRepository = this.modelsManager.getEntity('dropsAnimations');
        /** @type {Object<string, Object>} */
        this.loadedAnimations = {};
    }

    /**
     * @param {Client} client
     * @param {Object} currentPlayer
     * @param {Object} room
     * @returns {Promise<void>}
     */
    async dropPlayerItems(client, currentPlayer, room)
    {
        let dropPercent = Number(
            currentPlayer.getPrivate('dropPercent')
            || room.config.getWithoutLogs('server/players/drop/percent', 0)
        );
        if(0 === dropPercent){
            return;
        }
        if(sc.randomInteger(1, 100) > dropPercent){
            return;
        }
        // the maximum number of items that can be dropped by the player
        let dropQuantity = Number(
            currentPlayer.getPrivate('dropQuantity')
            || room.config.getWithoutLogs('server/players/drop/quantity', 0)
        );
        if(0 === dropQuantity){
            return;
        }
        // @TODO - BETA - Move WorldWalkableNodesAroundProvider into the world so we can use it from room.roomWorld.
        let closerWalkableNodes = WorldWalkableNodesAroundProvider.generateWalkableNodesAround(
            currentPlayer.physicalBody,
            room.roomWorld.pathFinder
        );
        if(0 === closerWalkableNodes.length){
            Logger.error('No closer walkable nodes found for dropped items.');
            return;
        }
        let droppedItems = await this.extractRandomDropItems(currentPlayer, dropQuantity);
        if(0 === droppedItems.length){
            return;
        }
        let dropsObjects = [];
        let objectPosition = closerWalkableNodes.pop();
        let nextDropPosition = objectPosition;
        for(let droppedItem of droppedItems){
            if(!nextDropPosition){
                Logger.warning('No more walkable nodes available for dropped item with ID "'+droppedItem.id+'".');
            }
            let createdDropItem = await this.createDropItem(
                objectPosition,
                droppedItem,
                currentPlayer.physicalBody,
                room
            );
            if(!createdDropItem){
                continue;
            }
            dropsObjects.push(createdDropItem);
            nextDropPosition = closerWalkableNodes.pop();
            if(nextDropPosition){
                objectPosition = nextDropPosition;
            }
        }
        room.disableAutoDispose();
        let dropsMappedData = this.mapDropsData(dropsObjects, room);
        // TODO - fix, check if data was already sent and only broadcast the keys and the new ones.
        let eventResult = true;
        await room.events.emit('reldens.afterProcessPlayerDropsBeforeBroadcast', dropsMappedData, eventResult);
        if(!eventResult){
            return;
        }
        room.broadcast('*', dropsMappedData);
    }

    /**
     * @param {Array<Object>} dropsObjects
     * @returns {Object}
     */
    mapDropsData(dropsObjects)
    {
        let messageData = {
            [ObjectsConst.DROPS.KEY]: {}
        };
        for(let dropsObject of dropsObjects){
            let animationData = this.loadedAnimations[dropsObject.itemId];
            if(!animationData){
                Logger.error('Animation data not found for item "'+dropsObject.itemId+'".');
                continue;
            }
            messageData[ObjectsConst.DROPS.KEY][dropsObject.id] = {
                [ObjectsConst.DROPS.TYPE]: animationData.assetType,
                [ObjectsConst.DROPS.ASSET_KEY]: animationData.assetKey,
                [ObjectsConst.DROPS.FILE]: animationData.file,
                [ObjectsConst.DROPS.PARAMS]: animationData.extraParams,
                x: dropsObject.animationData.x,
                y: dropsObject.animationData.y
            };
        }
        return messageData;
    }

    /**
     * @param {Object} objectPosition
     * @param {Object} droppedItem
     * @param {Object} targetObjectBody
     * @param {Object} room
     * @returns {Promise<Object|boolean>}
     */
    async createDropItem(objectPosition, droppedItem, targetObjectBody, room)
    {
        let tileIndex = room?.roomWorld?.tileIndexByRowAndColumn(objectPosition.x, objectPosition.y);
        if(!tileIndex){
            return false;
        }
        let dropRandomId = 'drop-'+droppedItem.key+'-'+sc.randomChars(8);
        let worldObjectData = {
            layerName: dropRandomId,
            tileIndex: tileIndex,
            tileWidth: targetObjectBody?.worldTileWidth || room?.roomWorld?.mapJson?.tilewidth,
            tileHeight: targetObjectBody?.worldTileHeight || room?.mapData?.mapJson?.tileheight,
            x: objectPosition.x,
            y: objectPosition.y
        };
        let dropObjectData = this.createDropObjectData(droppedItem, dropRandomId, tileIndex, room.roomId);
        return await room.createDropObjectInRoom(dropObjectData, worldObjectData);
    }

    /**
     * @param {Object} droppedItem
     * @param {string} dropRandomId
     * @param {number} tileIndex
     * @param {string} roomId
     * @returns {Object}
     */
    createDropObjectData(droppedItem, dropRandomId, tileIndex, roomId)
    {
        let animationData = sc.get(this.loadedAnimations, droppedItem.item_id, sc.get(droppedItem, 'animationData', {}));
        let assetKey = sc.get(animationData, 'assetKey', droppedItem.key);
        let extraParams = sc.get(animationData, 'extraParams', {});
        return {
            id: dropRandomId + tileIndex,
            room_id: roomId,
            layer_name: dropRandomId,
            tile_index: tileIndex,
            class_type: ObjectTypes.DROP,
            object_class_key: ObjectsConst.TYPE_DROP,
            client_key: dropRandomId + tileIndex,
            itemInventoryId: droppedItem.id,
            itemId: droppedItem.item_id,
            asset_key: assetKey,
            client_params: sc.toJsonString({
                frameStart: sc.get(extraParams, 'start', 0),
                frameEnd: sc.get(extraParams, 'end', 0),
                repeat: sc.get(extraParams, 'repeat', -1),
                hideOnComplete: sc.get(extraParams, 'hideOnComplete', false),
                autoStart: sc.get(extraParams, 'autoStart', true),
                asset_key: assetKey,
                yoyo: sc.get(extraParams, 'yoyo', false)
            }),
            enabled: 1,
            objects_assets: [{
                object_asset_id: null,
                object_id: dropRandomId,
                asset_type: sc.get(animationData, 'assetType', 'spritesheet'),
                asset_key: assetKey,
                asset_file: sc.get(animationData, 'file', assetKey+GameConst.FILES.EXTENSIONS.PNG),
                extra_params: sc.toJsonString({
                    frameWidth: sc.get(extraParams, 'frameWidth', 64),
                    frameHeight: sc.get(extraParams, 'frameHeight', 64),
                })
            }]
        };
    }

    /**
     * @param {Object} currentPlayer
     * @param {number} dropQuantity
     * @returns {Promise<Array<Object>>}
     */
    async extractRandomDropItems(currentPlayer, dropQuantity)
    {
        let playerInventory = currentPlayer.inventory.manager;
        let droppableItems = await this.fetchDroppableItems(playerInventory.items);
        let itemsKeys = Object.keys(droppableItems);
        if(0 === itemsKeys.length){
            return [];
        }
        let maxRemovable = Math.min(dropQuantity, itemsKeys.length);
        let drops = [];
        for(let i = 0; i < maxRemovable; i++){
            let randomIndex = sc.randomInteger(0, itemsKeys.length - 1);
            let itemKey = itemsKeys[randomIndex];
            let item = playerInventory.items[itemKey];
            if(!item){
                Logger.warning('Item not found in player inventory.', {itemKey, itemsKeys});
                continue;
            }
            if(!sc.hasOwn(this.loadedAnimations, item.item_id)){
                let loadedModel = await this.dropsAnimationsRepository.loadOneBy('item_id', item.item_id);
                this.loadedAnimations[item.item_id] = DropsAnimations.fromModel(loadedModel);
            }
            drops.push(item);
            delete itemsKeys[randomIndex];
            await playerInventory.removeItem(itemKey);
        }
        return drops;
    }

    /**
     * @param {Object<string, Object>} items
     * @returns {Promise<Object<string, Object>>}
     */
    async fetchDroppableItems(items)
    {
        let droppableItems = {};
        for(let itemKey of Object.keys(items)){
            let item = items[itemKey];
            if(!sc.get(item, 'canBeDropped', false)){
                continue;
            }
            let itemDropPercent = Number(sc.get(item, 'dropPercent', 100));
            if(sc.randomInteger(1, 100) > itemDropPercent){
                continue;
            }
            // @TODO - BETA - Make configurable to not drop equipped items.
            if(item.equipped){
                await item.unequip();
            }
            // @TODO - BETA - Remove this check if not needed.
            let itemModelData = sc.get(item.manager?.itemsModelData, item.key, false);
            if(!item.item_id && itemModelData?.data?.id){
                item.item_id = itemModelData.data.id;
            }
            droppableItems[itemKey] = item;
        }
        return droppableItems;
    }

}

module.exports.PlayerDeathSubscriber = PlayerDeathSubscriber;
