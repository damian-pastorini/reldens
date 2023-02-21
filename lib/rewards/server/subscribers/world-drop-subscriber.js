const { sc, Logger } = require('@reldens/utils');
const { RewardsConst } = require('../../constants');


class WorldDropSubscriber
{
    static async dropRewardItem(params)
    {
        let { rewardEventData, scene } = params;
        let itemRewards = sc.get(rewardEventData, 'itemRewards', false);
        if (!itemRewards) {
            return;
        }
        let rewards = itemRewards.map((itemReward) => itemReward.reward);
        let targetObjectBody = sc.get(rewardEventData.target_object, 'objectBody', false);
        if (!targetObjectBody) {
            return;
        }
        let closerWalkableNodes = this.getWalkableNodesAround(targetObjectBody);
        let hasSpace = this.hasEnoughFreeNodesForRewards(rewards, closerWalkableNodes);

        for (let reward of rewards) {
            try {
                reward['rewardPosition'] = this.getRewardPosition(closerWalkableNodes, hasSpace);
                reward['hasSpace'] = hasSpace;
                let tileIndex = this.getTileIndex(reward.rewardPosition, targetObjectBody.worldWidth);
                reward['randomRewardId'] = `reward[${tileIndex}]-${sc.randomChars(8)}`;
                reward['objectBody'] = await this.createRewardRoomObject(scene, targetObjectBody, reward);
                if (!reward['objectBody']) {
                    Logger.error('No object body for reward ' + reward.id + ' could be created');
                    return;
                }
            } catch (e) {
                Logger.error(e);
            }
        }
        return rewards;
    }

    static getWalkableNodesAround(targetObjectBody)
    {
        let { currentCol: col, currentRow: row } = targetObjectBody;
        let pathfinder = targetObjectBody.getPathFinder();
        let nodes = [pathfinder.grid.getNodeAt(col, row)];
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                let node = pathfinder.grid.getNodeAt(col + i, row + j);
                if (node.walkable) {
                    nodes.push(node);
                }
            }
        }
        return nodes;
    }

    static hasEnoughFreeNodesForRewards(itemRewards, nodes)
    {
        return nodes.length >= itemRewards.length;
    }

    static getTileIndex(node, worldWidth)
    {
        return node.x * worldWidth + node.y;
    }

    static getRewardsInteractionDistanceConfig(scene)
    {
        // this.range = medio tile (configurable);
        // battle_rewards/node_modules/@reldens/skills/lib/skill.js
        // let interactionArea = new InteractionArea();
        // interactionArea.setupInteractionArea(this.range, targetPosition.x, targetPosition.y);
        // let interactionResult = interactionArea.isValidInteraction(ownerPosition.x, ownerPosition.y);


        // @TODO - BETA - rewards.interactionField
        return scene.config.get('server/rewards/actions/interactionsDistance') ||
            (scene.roomWorld.mapJson.tilewidth * 0.5);
    }

    static getRewardPosition(closerWalkableNodes, hasSpace)
    {
        if (hasSpace) {
            //TODO: Eliminar del array de {closerWalkableNodes} la posición del enemigo (si no fue eliminada antes).
            return closerWalkableNodes.splice(sc.randomInteger(0, closerWalkableNodes.length - 1), 1)[0];
        } else {
            // TODO: Caen todos en el lugar donde murió el enemigo.
            return { x: closerWalkableNodes[0].x, y: closerWalkableNodes[0].y };
        }
    }

    static async createRewardRoomObject(scene, targetObjectBody, reward)
    {
        let bodyMass = reward.hasSpace ? 1 : 0;
        scene.objectsManager.roomObjects[reward.randomRewardId] = {
            bodyMass: bodyMass,
            collisionResponse: true
            // hasState > TODO - BETA - Next feature, move drops.
        };
        return await scene.roomWorld.createRoomObjectBody(
            { name: reward.randomRewardId },
            '',
            targetObjectBody.worldTileWidth,
            targetObjectBody.worldTileHeight,
            reward.rewardPosition.x,
            reward.rewardPosition.y
        );
    }


    static sendRewardsDataToClient(rewards, client)
    {
        let sendData = this.prepareDataToSend(rewards);
        // @TODO - BETA - Add new event here for the sendData.
        client.send('*', sendData);
    }

    static prepareDataToSend(rewards)
    {
        let hasSpace = rewards[0].hasSpace;
        let messageData = {
            [RewardsConst.REWARDS_CONST]: {},
            ['hasSpace']: hasSpace
        }
        for (let reward of rewards) {
            let dataReward = {
                [RewardsConst.REWARDS_TYPE]: reward.objects_items_rewards_animations.asset_type,
                [RewardsConst.REWARDS_KEY]: reward.objects_items_rewards_animations.asset_key,
                [RewardsConst.REWARDS_FILE]: reward.objects_items_rewards_animations.file,
                [RewardsConst.REWARDS_PARAMS]: reward.objects_items_rewards_animations.extra_params,
            };
            if (true === hasSpace) {
                this.setPositionToDataObject(dataReward, reward);
            }
            messageData[RewardsConst.REWARDS_CONST][reward.randomRewardId] = dataReward;
        }
        if (false === hasSpace) {
            this.setPositionToDataObject(messageData, rewards[0]);
        }
        return messageData;
    }

    static setPositionToDataObject(dataObject, reward)
    {
        dataObject['x'] = reward.rewardPosition.x;
        dataObject['y'] = reward.rewardPosition.y;
    }
}

module.exports.WorldDropSubscriber = WorldDropSubscriber;