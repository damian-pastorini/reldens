/**
 *
 * Reldens - Kill Rewards Steps
 *
 * The steps of the specs with the rewards of a killed enemy: the stored reward of the configured forest enemy (its
 * object in the forest room) with the stored item it gives, the player entering the forest and the configured enemy
 * placed next to the first player with one hit point (the forest drops left by other tests removed first, so no drop
 * takes the tiles around the player; the inventory rows of the given players
 * preserved; optionally
 * after moving the player to the open central area with the other enemies switched off, ForestEnemyKill), the rewards of every live instance of that
 * enemy changed for the group (a reward property reached by its path, like "rewards/0/hasDropBody", restored by the
 * group reset), and the placed enemy killed (attacked until its life is not the placed one anymore, so the kills that
 * give no experience are detected too), optionally returning the drops it created in the room (DropsProbe); both group
 * players entering the forest recording their room messages, the enemy killed with the given drop quantity and the
 * stored quantities of its reward item for each player; the pick
 * up message of a drop and the drops interaction distance that keeps every drop around the enemy in range.
 *
 */

const { expect } = require('@playwright/test');
const { ForestEnemyKill } = require('./forest-enemy-kill');
const { KillScoreSteps } = require('./kill-score-steps');
const { DeathDropSteps } = require('./death-drop-steps');
const { DeathObserverSteps } = require('./death-observer-steps');
const { RoomMessagesRecorder } = require('./room-messages-recorder');
const { SecurityApi } = require('./security-api');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { Login } = require('./login');
const { TimeConstants } = require('./time-constants');
const { ObjectsConst } = require('../../../lib/objects/constants');

class KillRewardsSteps
{

    static REWARD_PATH = 'rewards/0/';
    static SETTLE_MS = 1500;
    static PICK_UP = {act: ObjectsConst.OBJECT_INTERACTION, type: ObjectsConst.DROPS.PICK_UP_ACT};
    static DROPS_IN_RANGE = {'server/objects/drops/interactionsDistance': 1000};

    static async fetchEnemyReward(gameConfig)
    {
        let objectId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'objects', {
            room_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'rooms', {name: Login.FOREST_ROOM_NAME}),
            client_key: gameConfig.e2eEnemyKey
        });
        let reward = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'rewards', {object_id: objectId})].shift();
        reward.item = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsItem', {id: reward.item_id})].shift();
        return reward;
    }

    static async enterWithPlacedEnemy(context)
    {
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        return await KillRewardsSteps.placeEnemy(context, [context.gameConfig.e2ePlayerName]);
    }

    static async placeEnemy(context, playersNames, inCentralArea = false)
    {
        let gameConfig = context.gameConfig;
        let cleared = await SecurityApi.request(gameConfig, 'POST', '/api/e2e/drops/clear', {roomName: Login.FOREST_ROOM_NAME});
        expect(cleared.error, 'The forest drops left by other tests are removed').toBeUndefined();
        for(let playerName of playersNames){
            await E2eSeedAndRestoreApi.preserveRows(gameConfig, context.e2eGroup, 'itemsInventory', {
                owner_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName})
            });
        }
        return await ForestEnemyKill.placeTargetedEnemy(
            context.page,
            gameConfig,
            gameConfig.e2eEnemyKey,
            ForestEnemyKill.ONE_HIT_LIFE,
            TimeConstants.SCENE_LOAD,
            inCentralArea
        );
    }

    static async changeEnemyReward(context, rewardChanges)
    {
        for(let rewardProperty of Object.keys(rewardChanges)){
            let changed = await GameplayE2eStateApi.changeEnemiesProperty(
                context.gameConfig,
                context.e2eGroup,
                Login.FOREST_ROOM_NAME,
                context.gameConfig.e2eEnemyKey,
                {propertyKey: KillRewardsSteps.REWARD_PATH+rewardProperty, value: rewardChanges[rewardProperty]}
            );
            expect(changed.error, 'The enemy reward '+rewardProperty+' is changed').toBeUndefined();
        }
    }

    static async killPlacedEnemy(context, placement)
    {
        await KillScoreSteps.attackUntil(
            context.page,
            async () => ForestEnemyKill.ONE_HIT_LIFE !== (await GameplayE2eStateApi.fetchEnemyLife(
                context.gameConfig,
                Login.FOREST_ROOM_NAME,
                placement.bodyKey
            )).life,
            'The placed enemy is killed'
        );
        await context.page.waitForTimeout(KillRewardsSteps.SETTLE_MS);
    }

    static async enterBothWithDrops(context, dropQuantity, configValues = {}, inCentralArea = false)
    {
        let gameConfig = context.gameConfig;
        for(let configPath of Object.keys(configValues)){
            await E2eSeedAndRestoreApi.overrideConfig(gameConfig, context.e2eGroup, configPath, configValues[configPath]);
        }
        let secondContext = await DeathObserverSteps.loginBothInForest(context);
        let players = [];
        for(let playerContext of [context, secondContext]){
            await RoomMessagesRecorder.start(playerContext.page);
            players.push({
                page: playerContext.page,
                playerName: playerContext.gameConfig.e2ePlayerName,
                sessionId: await DeathObserverSteps.fetchSessionId(playerContext.page)
            });
        }
        let placement = await KillRewardsSteps.placeEnemy(context, players.map(player => player.playerName), inCentralArea);
        await KillRewardsSteps.changeEnemyReward(context, {dropQuantity});
        return {
            players,
            placement,
            drops: await KillRewardsSteps.killForDrops(context, placement),
            itemKey: (await KillRewardsSteps.fetchEnemyReward(gameConfig)).item.key
        };
    }

    static async fetchQuantities(context, dropsKill)
    {
        let quantities = [];
        for(let player of dropsKill.players){
            quantities.push(
                await E2eSeedAndRestoreApi.fetchInventoryQuantity(context.gameConfig, player.playerName, dropsKill.itemKey)
            );
        }
        return quantities;
    }

    static async fetchDropsState(gameConfig)
    {
        return await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/drops/state?roomName='+encodeURIComponent(Login.FOREST_ROOM_NAME)
        );
    }

    static async expectDropKept(context, dropsKill, quantities, message)
    {
        await context.page.waitForTimeout(KillRewardsSteps.SETTLE_MS);
        expect(await KillRewardsSteps.fetchQuantities(context, dropsKill), message).toEqual(quantities);
        expect(
            (await DeathDropSteps.fetchRoomDrops(context.gameConfig)).map(drop => drop.id),
            'The drop stays in the room'
        ).toEqual(expect.arrayContaining(dropsKill.drops.map(drop => drop.id)));
    }

    static async killForDrops(context, placement)
    {
        let dropsBefore = (await DeathDropSteps.fetchRoomDrops(context.gameConfig)).map(drop => drop.id);
        await KillRewardsSteps.killPlacedEnemy(context, placement);
        return (await DeathDropSteps.fetchRoomDrops(context.gameConfig)).filter(drop => !dropsBefore.includes(drop.id));
    }

}

module.exports.KillRewardsSteps = KillRewardsSteps;
