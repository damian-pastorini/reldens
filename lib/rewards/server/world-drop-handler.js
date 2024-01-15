/**
 *
 * Reldens - WorldDropHandler
 *
 */

const { Reward } = require('./reward');
const { RewardMessageActions } = require('./message-actions');
const { RewardsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class WorldDropHandler
{

    static async createRewardItemObjectsOnRoom(params)
    {
        let validParams = this.validateParams(params);
        if(!validParams){
            return false;
        }
        let { targetObjectBody, itemRewards, roomScene } = validParams;
        let closerWalkableNodes = this.generateWalkableNodesAround(targetObjectBody);
        let rewardPosition = {x: 0, y: 0};
        let rewards = [];
        // @TODO - BETA - Refactor, winningItem is not being used later.
        for(let itemReward of itemRewards){
            for(let i = 0; i < itemReward.reward.dropQuantity; i++){
                if(0 < closerWalkableNodes.length){
                    rewardPosition = closerWalkableNodes.pop();
                }
                if(!rewardPosition){
                    Logger.error('No closer walkable nodes found for reward ID "' + itemReward.reward.id + '".');
                    continue;
                }
                let tileIndex = targetObjectBody.world.tileIndexByRowAndColumn(rewardPosition.x, rewardPosition.y);
                let newReward = sc.deepMergeProperties({
                    rewardPosition,
                    tileIndex,
                    randomRewardId: 'reward-'+sc.randomChars(8)
                }, itemReward.reward);
                // @TODO - BETA - Check reward required properties.
                let rewardObjectBody = await this.createRewardRoomObject(roomScene, targetObjectBody, newReward);
                if(!rewardObjectBody){
                    Logger.error('No object body for reward ' + newReward.id + ' could be created.');
                    continue;
                }
                roomScene.addObjectStateSceneData(rewardObjectBody);
                // @TODO - BETA - Clear timeout (possible bug if the timeout is not cleared).
                newReward.autoDestroyTimeout = this.setRewardTimeDisappear(rewardObjectBody, roomScene);
                newReward['objectBody'] = rewardObjectBody;
                rewards.push(newReward);
            }
        }
        return rewards;
    }

    static generateWalkableNodesAround(targetObjectBody)
    {
        if(!targetObjectBody){
            Logger.critical('Undefined target object body.');
            return [];
        }
        let { currentCol, currentRow } = targetObjectBody;
        if(!currentCol || !currentRow){
            return [];
        }
        let pathfinder = targetObjectBody.getPathFinder();
        let nodes = [];
        let firstWorldPosition = this.fetchFirstWorldPosition(pathfinder, currentCol, currentRow);
        if(firstWorldPosition){
            nodes.push(firstWorldPosition);
        }
        for(let i = -1; i <= 1; i++){
            for(let j = -1; j <= 1; j++){
                let node = pathfinder.grid.getNodeAt(currentCol + i, currentRow + j);
                if(node && node.walkable){
                    nodes.push(this.worldPositionForNode(node, pathfinder.world.mapJson));
                }
            }
        }
        return nodes;
    }

    static fetchFirstWorldPosition(pathfinder, currentCol, currentRow)
    {
        let firstNode = pathfinder.grid.getNodeAt(currentCol, currentRow);
        if(!firstNode){
            return false;
        }
        return this.worldPositionForNode(firstNode, pathfinder.world.mapJson);
    }

    static worldPositionForNode(node, mapJson)
    {
        let tileW = mapJson.tilewidth,
            tileH = mapJson.tileheight,
            halfTileW = tileW / 2,
            halfTileH = tileH / 2;
        return {
            x: node.x * tileW + halfTileW,
            y: node.y * tileH + halfTileH
        };
    }

    static getRewardPosition(closerWalkableNodes)
    {
        return closerWalkableNodes.splice(sc.randomInteger(0, closerWalkableNodes.length - 1), 1)[0];
    }

    static async createRewardRoomObject(roomScene, targetObjectBody, reward)
    {
        let dropObjectData = Reward.createDropObjectData(reward, roomScene.roomId);
        await roomScene.objectsManager.generateObjectFromObjectData(dropObjectData);
        return await roomScene.roomWorld.createRoomObjectBody(
            { name: reward.randomRewardId },
            reward.tileIndex,
            targetObjectBody.worldTileWidth,
            targetObjectBody.worldTileHeight,
            reward.rewardPosition.x,
            reward.rewardPosition.y
        );
    }

    static validateParams(params)
    {
        let rewardEventData = sc.get(params, 'rewardEventData', false);
        if(!rewardEventData){
            Logger.critical('RewardEventData not found on WorldDropHandler.');
            return false;
        }
        let roomScene = sc.get(params, 'roomScene', false);
        if(!roomScene){
            Logger.critical('RoomScene not found on WorldDropHandler.');
            return false;
        }
        let targetObjectBody = sc.get(rewardEventData.targetObject, 'objectBody', false);
        if(!targetObjectBody){
            Logger.critical('Target object "objectBody" not found on WorldDropHandler.');
            return false;
        }
        let itemRewards = sc.get(rewardEventData, 'itemRewards', []);
        if(0 === itemRewards.length){
            Logger.critical('Items rewards not found on WorldDropHandler.');
            return false;
        }
        return {
            roomScene,
            itemRewards,
            targetObjectBody
        };
    }

    static setRewardTimeDisappear(dropObject, roomScene)
    {
        return setTimeout(() => {
            if(!roomScene.objectsManager.getObjectData(dropObject.objectIndex)){
                return false;
            }
            RewardMessageActions.removeDrop(roomScene, dropObject);
            roomScene.broadcast('*', {act: RewardsConst.REMOVE_DROP, id: dropObject.objectIndex});
        }, roomScene.config.get('server/rewards/actions/disappearTime'));
    }

}

module.exports.WorldDropHandler = WorldDropHandler;
