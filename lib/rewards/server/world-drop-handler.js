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
        if(!itemRewards){
            return false;
        }
        let closerWalkableNodes = this.generateWalkableNodesAround(targetObjectBody);
        let rewards = [];
        // @TODO - BETA - Replace { reward }.
        for(let { reward } of itemRewards){
            for(let i = 0; i < reward.dropQuantity; i++){
                let newReward = sc.deepMergeProperties({}, reward);
                // @TODO - BETA - Check reward required properties.
                newReward['rewardPosition'] = this.getRewardPosition(closerWalkableNodes);
                newReward['tileIndex'] = this.getTileIndex(newReward.rewardPosition, targetObjectBody.worldWidth);
                // @TODO - BETA - Replace "reward[]" by "reward-".
                newReward['randomRewardId'] = `reward[${sc.randomChars(8)}]`;
                newReward['objectBody'] = await this.createRewardRoomObject(roomScene, targetObjectBody, newReward);
                roomScene.addObjectStateSceneData(newReward['objectBody']);
                if(!newReward['objectBody']){
                    Logger.error('No object body for reward ' + newReward.id + ' could be created');
                    continue;
                }
                this.setRewardTimeDisappear(newReward['objectBody'], roomScene);
                rewards.push(newReward);
            }
        }
        return rewards;
    }

    static generateWalkableNodesAround(targetObjectBody)
    {
        let { currentCol: col, currentRow: row } = targetObjectBody;
        let pathfinder = targetObjectBody.getPathFinder();
        let firstNode = pathfinder.grid.getNodeAt(col, row);
        let firstWorldPos = this.calculateWorldPosFromNode(firstNode, pathfinder.world.mapJson);
        let nodes = [firstWorldPos];
        for(let i = -1; i <= 1; i++){
            for(let j = -1; j <= 1; j++){
                let node = pathfinder.grid.getNodeAt(col + i, row + j);
                if(node.walkable){
                    nodes.push(this.calculateWorldPosFromNode(node, pathfinder.world.mapJson));
                }
            }
        }
        return nodes;
    }

    static calculateWorldPosFromNode(node, mapJson)
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

    static hasEnoughFreeNodesForRewards(itemRewards, nodes)
    {
        // @TODO - BETA - Unused method.
        return nodes.length >= itemRewards.length;
    }

    static getTileIndex(node, worldWidth)
    {
        return node.x * worldWidth + node.y;
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
            Logger.critical('RewardEventData not found on WorldDropSubscriber');
            return false;
        }
        let roomScene = sc.get(params, 'roomScene', false);
        if(!roomScene){
            Logger.critical('RoomScene not found on WorldDropSubscriber');
            return false;
        }
        let itemRewards = sc.get(rewardEventData, 'itemRewards', false);

        let targetObjectBody = sc.get(rewardEventData.targetObject, 'objectBody', false);
        if(!targetObjectBody){
            Logger.critical('target_object objectBody not found on WorldDropSubscriber');
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
        setTimeout(() => {
            if(!roomScene.objectsManager.getObjectData(dropObject.objectIndex)){
                return false;
            }
            let rewardMessageActions = new RewardMessageActions();
            rewardMessageActions.removeDrop(roomScene, dropObject);
            roomScene.broadcast('*', {act: RewardsConst.REMOVE_DROP, id: dropObject.objectIndex});
        }, roomScene.config.get('server/rewards/actions/disappearTime'));
    }

}

module.exports.WorldDropHandler = WorldDropHandler;
