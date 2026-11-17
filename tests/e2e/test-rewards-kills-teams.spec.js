/**
 *
 * Reldens - Test Rewards Kills Teams
 *
 * Tests the rewards of an enemy killed by a team of the two group players in the forest (exclusive group, ObserverSteps:
 * the second player placed next to the first one and joined to its team; KillRewardsSteps: the configured enemy placed
 * next to the first player with one hit point and its reward changed for the group): a non droppable item reward goes
 * to exactly one member; a modifier reward is applied to every member with splitModifier ALL and to exactly one member
 * with RANDOM (the value changed on the live rewards subscriber, read from the config once on start); and a drop picked
 * up with splitItems DROP_KEEPS goes to the picker while with RANDOM it goes to exactly one member.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { KillRewardsSteps } = require('./helpers/kill-rewards-steps');
const { DeathObserverSteps } = require('./helpers/death-observer-steps');
const { ObserverSteps } = require('./helpers/observer-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { RewardsConst } = require('../../lib/rewards/constants');
const { ModifierConst } = require('@reldens/modifiers');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestRewardsKillsTeams
{

    static SUBSCRIBER_PATH = 'rewards/package/rewardsSubscriber';
    static SPLIT_ITEMS_PATH = 'client/rewards/general/splitItems';
    static MODIFIER_VALUE = 5;
    static MODIFIER_REWARD = {
        modifierId: 1,
        modifier: {key: 'e2e-team-atk', property_key: 'stats/atk', operation: ModifierConst.OPS.INC, value: 5}
    };

    static async enterTeam(context, rewardChanges, configValues = {})
    {
        for(let configPath of Object.keys(configValues)){
            await E2eSeedAndRestoreApi.overrideConfig(context.gameConfig, context.e2eGroup, configPath, configValues[configPath]);
        }
        let secondContext = await DeathObserverSteps.loginBothInForest(context);
        await ObserverSteps.joinTeam(context, await DeathObserverSteps.fetchSessionId(context.secondPage));
        await ObserverSteps.waitForTeam(context.gameConfig);
        let team = {
            membersNames: [context, secondContext].map(memberContext => memberContext.gameConfig.e2ePlayerName),
            itemKey: (await KillRewardsSteps.fetchEnemyReward(context.gameConfig)).item.key
        };
        team.placement = await KillRewardsSteps.placeEnemy(context, team.membersNames);
        await KillRewardsSteps.changeEnemyReward(context, rewardChanges);
        team.before = await TestRewardsKillsTeams.fetchMembersRewards(context, team);
        return team;
    }

    static async fetchMembersRewards(context, team)
    {
        let membersRewards = [];
        for(let memberName of team.membersNames){
            membersRewards.push({
                quantity: await E2eSeedAndRestoreApi.fetchInventoryQuantity(context.gameConfig, memberName, team.itemKey),
                atk: (await GameplayE2eStateApi.fetchPlayer(context.gameConfig, Login.FOREST_ROOM_NAME, memberName)).stats.atk
            });
        }
        return membersRewards;
    }

    static async fetchGiven(context, team, rewardKey)
    {
        await context.page.waitForTimeout(KillRewardsSteps.SETTLE_MS);
        return (await TestRewardsKillsTeams.fetchMembersRewards(context, team)).map(
            (memberRewards, index) => memberRewards[rewardKey] - team.before[index][rewardKey]
        );
    }

    static async runItemToOneMemberTest(context)
    {
        let team = await TestRewardsKillsTeams.enterTeam(context, {hasDropBody: false, dropQuantity: 1});
        await KillRewardsSteps.killPlacedEnemy(context, team.placement);
        let given = await TestRewardsKillsTeams.fetchGiven(context, team, 'quantity');
        expect(given.filter(quantity => 0 !== quantity), 'One member gets the item').toEqual([1]);
    }

    static async runModifierSplitTest(context, splitModifier, rewardedMembers)
    {
        let changed = await GameplayE2eStateApi.changeFeatureProperty(
            context.gameConfig,
            context.e2eGroup,
            TestRewardsKillsTeams.SUBSCRIBER_PATH,
            'splitModifier',
            splitModifier
        );
        expect(changed.value, 'The modifier split changes: '+changed.error).toBe(splitModifier);
        let team = await TestRewardsKillsTeams.enterTeam(context, TestRewardsKillsTeams.MODIFIER_REWARD);
        await KillRewardsSteps.killPlacedEnemy(context, team.placement);
        let given = await TestRewardsKillsTeams.fetchGiven(context, team, 'atk');
        expect(given.filter(atk => 0 !== atk), 'The rewarded members').toEqual(
            Array(rewardedMembers).fill(TestRewardsKillsTeams.MODIFIER_VALUE)
        );
    }

    static async pickTeamDrop(context, splitItems)
    {
        let team = await TestRewardsKillsTeams.enterTeam(
            context,
            {dropQuantity: 1},
            Object.assign({[TestRewardsKillsTeams.SPLIT_ITEMS_PATH]: splitItems}, KillRewardsSteps.DROPS_IN_RANGE)
        );
        let drop = [...await KillRewardsSteps.killForDrops(context, team.placement)].shift();
        expect(drop, 'The enemy drops its reward').toBeTruthy();
        await RoomMessagesRecorder.sendMessage(context.page, Object.assign({id: drop.id}, KillRewardsSteps.PICK_UP));
        return await TestRewardsKillsTeams.fetchGiven(context, team, 'quantity');
    }

    static run()
    {
        test.describe('Rewards Kills Teams', () => {
            test('non droppable item reward goes to one team member', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsKillsTeams.runItemToOneMemberTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('modifier reward split ALL is applied to every team member', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsKillsTeams.runModifierSplitTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    RewardsConst.SPLIT_MODIFIER.ALL,
                    2
                );
            });
            test('modifier reward split RANDOM is applied to one team member', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsKillsTeams.runModifierSplitTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    RewardsConst.SPLIT_MODIFIER.RANDOM,
                    1
                );
            });
            test('drop picked with splitItems DROP_KEEPS goes to the picker', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                expect(await TestRewardsKillsTeams.pickTeamDrop(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    RewardsConst.SPLIT_ITEMS.DROP_KEEPS
                ), 'The picker keeps the drop').toEqual([1, 0]);
            });
            test('drop picked with splitItems RANDOM goes to one team member', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                let given = await TestRewardsKillsTeams.pickTeamDrop(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    RewardsConst.SPLIT_ITEMS.RANDOM
                );
                expect(given.filter(quantity => 0 !== quantity), 'One member gets the drop').toEqual([1]);
            });
        });
    }

}

TestRewardsKillsTeams.run();
