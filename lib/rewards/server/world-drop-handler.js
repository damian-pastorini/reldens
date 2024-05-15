/**
 *
 * Reldens - WorldDropHandler
 *
 */

const { Reward } = require('./reward');
const { WorldWalkableNodesAroundProvider } = require('../../world/server/world-walkable-nodes-around-provider');
const { Logger, sc } = require('@reldens/utils');

class WorldDropHandler
{

    static async createRewardItemObjectsOnRoom(targetObjectBody, itemRewards, roomScene)
    {
        let closerWalkableNodes = WorldWalkableNodesAroundProvider.generateWalkableNodesAround(targetObjectBody);
        let objectPosition = {x: 0, y: 0};
        let rewards = [];
        for(let itemReward of itemRewards){
            await this.createDropItems(
                itemReward,
                closerWalkableNodes,
                objectPosition,
                targetObjectBody,
                roomScene,
                rewards
            );
        }
        return rewards;
    }

    static async createDropItems(
        itemReward,
        closerWalkableNodes,
        objectPosition,
        targetObjectBody,
        roomScene,
        rewards
    ){
        for(let i = 0; i < itemReward.dropQuantity; i++){
            if(0 < closerWalkableNodes.length){
                objectPosition = closerWalkableNodes.pop();
            }
            if(!objectPosition){
                Logger.error('No closer walkable nodes found for reward ID "' + itemReward.id + '".');
                return rewards;
            }
            let newReward = await this.createDropItem(
                objectPosition,
                itemReward,
                targetObjectBody,
                roomScene,
                'drop-' + (itemReward.item?.key || 'item-key') + '-' + sc.randomChars(8)
            );
            rewards.push(newReward);
        }
        return rewards;
    }

    static async createDropItem(objectPosition, itemReward, targetObjectBody, roomScene, randomObjectId)
    {
        let tileIndex = targetObjectBody.world.tileIndexByRowAndColumn(objectPosition.x, objectPosition.y);
        let newReward = sc.deepMergeProperties({objectPosition, tileIndex, randomObjectId}, itemReward);
        let worldObjectData = {
            layerName: newReward.randomObjectId,
            tileIndex: newReward.tileIndex,
            tileWidth: targetObjectBody.worldTileWidth,
            tileHeight: targetObjectBody.worldTileHeight,
            x: newReward.objectPosition.x,
            y: newReward.objectPosition.y
        };
        let dropObjectInstance = await roomScene.createDropObjectInRoom(
            Reward.createDropObjectData(newReward, roomScene.roomId),
            worldObjectData
        );
        if(!dropObjectInstance){
            return;
        }
        newReward['dropObjectInstance'] = dropObjectInstance;
        return newReward;
    }

}

module.exports.WorldDropHandler = WorldDropHandler;
