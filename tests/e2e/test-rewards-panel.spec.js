/**
 *
 * Reldens - Test Rewards Panel
 *
 * Tests the rewards panel of a group player (RewardsSteps: the reward events changed for the group and their cached
 * list dropped so the next login loads them again; TradeSteps: the client config overridden for the group before the
 * login): the reward description lists the reward items with the default separator and template; the configured items
 * separator and template are used and the items description can be turned off; the configured title and accepted
 * reward labels are used; the straight days label and description show the required days; a reward event shows its own
 * image and path from its event data or no image when its event data turns it off, and the provider setting turns
 * every image off; the disabled events, the ended events and the events not started are not listed and no balloon is
 * shown; an event that ends later is listed (once ended it stays listed while the server runs, ISSUE #163); closing
 * the panel clears the accepted reward
 * message (the next rewards update shows it again, ISSUE #161).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { RewardsSteps } = require('./helpers/rewards-steps');
const { TradeSteps } = require('./helpers/trade-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const RewardsTranslations = require('../../lib/rewards/client/snippets/en_US');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestRewardsPanel
{

    static LABELS_PATH = 'client/rewards/labels/';
    static DEFAULT_ITEMS_FORMAT = {separator: '', lineBreaks: 1, template: '%label (%quantity)', configValues: {}};
    static CONFIGURED_ITEMS_FORMAT = {
        separator: ' / ',
        lineBreaks: 0,
        template: '%quantity x %label',
        configValues: {
            [TestRewardsPanel.LABELS_PATH+'itemsSeparator']: ' / ',
            [TestRewardsPanel.LABELS_PATH+'itemsTemplate']: '%quantity x %label'
        }
    };
    static ITEMS_OFF_FORMAT = {
        separator: '',
        lineBreaks: 0,
        template: '',
        configValues: {[TestRewardsPanel.LABELS_PATH+'includeItemsDescription']: false}
    };
    static TITLE = 'E2E Rewards Title';
    static ACCEPTED_LABEL = 'E2E accepted reward';
    static ACCEPTED_MESSAGE = RewardsTranslations.rewards.acceptedReward.replace(
        '%rewardLabel',
        RewardsTranslations.rewards.dailyLogin
    );
    static REWARD_IMAGE = 'e2e-reward.png';
    static REWARD_IMAGE_PATH = '/assets/custom/rewards/e2e/';
    static PAST_DATE = '2000-01-01 00:00:00';
    static FUTURE_DATE = '2999-01-01 00:00:00';

    static async enter(context, configValues = {})
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 3, context.longRun));
        let player = (await TradeSteps.enterPlayers(context, 1, [], configValues)).shift();
        await expect(player.page.locator(Selectors.rewards.content), 'The rewards are listed').toHaveCount(1);
        return player;
    }

    static async expectDescription(gameConfig, player, rewardEvent, translatedDescription, itemsFormat)
    {
        let rewardItems = sc.toJson(rewardEvent.event_data, {}).items;
        let itemsKeys = Object.keys(rewardItems);
        let expectedDescription = translatedDescription;
        for(let itemKey of itemsKeys){
            let itemRow = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsItem', {key: itemKey})].shift();
            expectedDescription += itemsFormat.separator+itemsFormat.template
                .replace('%label', itemRow.label)
                .replace('%quantity', rewardItems[itemKey]);
        }
        let description = player.page.locator(Selectors.rewards.rewardDescription(rewardEvent.id));
        expect(await description.textContent(), 'The description lists the reward items').toBe(expectedDescription);
        let lineBreaks = itemsFormat.lineBreaks * itemsKeys.length;
        await expect(description.locator('br'), 'The line breaks between the items').toHaveCount(lineBreaks);
    }

    static async runItemsTextTest(context, itemsFormat)
    {
        let daily = await RewardsSteps.fetchRewardEvent(context.gameConfig, RewardsSteps.DAILY_LOGIN);
        let player = await TestRewardsPanel.enter(context, itemsFormat.configValues);
        await TestRewardsPanel.expectDescription(
            context.gameConfig,
            player,
            daily,
            RewardsTranslations.rewards.dailyDescription,
            itemsFormat
        );
    }

    static async runLabelsTest(context)
    {
        let daily = await RewardsSteps.fetchRewardEvent(context.gameConfig, RewardsSteps.DAILY_LOGIN);
        let player = await TestRewardsPanel.enter(context, {
            [TestRewardsPanel.LABELS_PATH+'title']: TestRewardsPanel.TITLE,
            [TestRewardsPanel.LABELS_PATH+'acceptedReward']: TestRewardsPanel.ACCEPTED_LABEL
        });
        let dialogTitle = player.page.locator(Selectors.rewards.dialogTitle);
        await expect(dialogTitle, 'The configured title is used').toHaveText(TestRewardsPanel.TITLE);
        await RewardsSteps.claim(player, [daily.id]);
        await expect(player.page.locator(Selectors.rewards.accepted), 'The configured accepted label').toHaveText(
            TestRewardsPanel.ACCEPTED_LABEL,
            {timeout: TimeConstants.SERVER_RESPONSE}
        );
    }

    static async runStraightDaysTextTest(context)
    {
        let straight = await RewardsSteps.fetchRewardEvent(context.gameConfig, RewardsSteps.STRAIGHT_DAYS_LOGIN);
        let days = sc.toJson(straight.event_data, {}).days;
        let player = await TestRewardsPanel.enter(context);
        await expect(player.page.locator(Selectors.rewards.rewardName(straight.id)), 'The days label').toHaveText(
            RewardsTranslations.rewards.straightDaysLogin.replace('%loginCount', days)
        );
        await TestRewardsPanel.expectDescription(
            context.gameConfig,
            player,
            straight,
            RewardsTranslations.rewards.straightDaysDescription.replace('%loginCount', days),
            TestRewardsPanel.DEFAULT_ITEMS_FORMAT
        );
    }

    static async runEventImagesTest(context)
    {
        let daily = await RewardsSteps.fetchRewardEvent(context.gameConfig, RewardsSteps.DAILY_LOGIN);
        let straight = await RewardsSteps.fetchRewardEvent(context.gameConfig, RewardsSteps.STRAIGHT_DAYS_LOGIN);
        await RewardsSteps.changeRewardEvent(context, daily.id, {}, {
            rewardImage: TestRewardsPanel.REWARD_IMAGE,
            rewardImagePath: TestRewardsPanel.REWARD_IMAGE_PATH
        });
        await RewardsSteps.changeRewardEvent(context, straight.id, {}, {showRewardImage: false});
        await RewardsSteps.dropCachedEvents(context);
        let player = await TestRewardsPanel.enter(context);
        await expect(player.page.locator(Selectors.rewards.rewardImage(daily.id)), 'The event image').toHaveAttribute(
            'src',
            TestRewardsPanel.REWARD_IMAGE_PATH+TestRewardsPanel.REWARD_IMAGE
        );
        await expect(player.page.locator(Selectors.rewards.rewardImage(straight.id)), 'No event image').toHaveCount(0);
    }

    static async runImagesOffTest(context)
    {
        await RewardsSteps.changeProvidersProperty(context, 'showRewardImage', false);
        await RewardsSteps.dropCachedEvents(context);
        let player = await TestRewardsPanel.enter(context);
        await expect(player.page.locator(Selectors.rewards.container), 'The rewards are listed').not.toHaveCount(0);
        await expect(player.page.locator(Selectors.rewards.image), 'No reward image').toHaveCount(0);
    }

    static async runNotListedTest(context)
    {
        let daily = await RewardsSteps.fetchRewardEvent(context.gameConfig, RewardsSteps.DAILY_LOGIN);
        let straight = await RewardsSteps.fetchRewardEvent(context.gameConfig, RewardsSteps.STRAIGHT_DAYS_LOGIN);
        await RewardsSteps.changeRewardEvent(context, daily.id, {enabled: 0});
        await RewardsSteps.changeRewardEvent(context, straight.id, {active_to: TestRewardsPanel.PAST_DATE});
        let futureEvent = await E2eSeedAndRestoreApi.createRow(
            context.gameConfig,
            context.e2eGroup,
            'rewardsEvents',
            Object.assign(
                sc.pickProps(daily, ['label', 'description', 'handler_key', 'event_key', 'event_data', 'position']),
                {enabled: 1, active_from: TestRewardsPanel.FUTURE_DATE}
            )
        );
        expect(futureEvent, 'The event that starts later is stored').toBeTruthy();
        await RewardsSteps.dropCachedEvents(context);
        let player = await TestRewardsPanel.enter(context);
        await expect(player.page.locator(Selectors.rewards.container), 'No event listed').toHaveCount(0);
        expect(await RewardsSteps.fetchLastUpdateIds(player), 'No event sent').toEqual([]);
        await expect(player.page.locator(Selectors.rewards.notificationBalloon), 'No reward, no balloon').toBeHidden();
    }

    static async runEndingEventTest(context)
    {
        let straight = await RewardsSteps.fetchRewardEvent(context.gameConfig, RewardsSteps.STRAIGHT_DAYS_LOGIN);
        let activeTo = sc.formatDate(new Date(Date.now() + TimeConstants.GAME_START));
        await RewardsSteps.changeRewardEvent(context, straight.id, {active_to: activeTo});
        await RewardsSteps.dropCachedEvents(context);
        let player = await TestRewardsPanel.enter(context);
        await RewardsSteps.runAndWaitForUpdate(
            player,
            () => RewardsSteps.claim(player, [RewardsSteps.UNKNOWN_REWARD_ID])
        );
        expect(await RewardsSteps.fetchLastUpdateIds(player), 'Listed before it ends').toContain(straight.id);
    }

    static async runClosePanelTest(context)
    {
        let daily = await RewardsSteps.fetchRewardEvent(context.gameConfig, RewardsSteps.DAILY_LOGIN);
        let player = await TestRewardsPanel.enter(context);
        await RewardsSteps.openPanel(player.page);
        await RewardsSteps.runAndWaitForUpdate(
            player,
            () => player.page.click(Selectors.rewards.reward(daily.id)+Selectors.rewards.active)
        );
        let accepted = player.page.locator(Selectors.rewards.accepted);
        await expect(accepted, 'The accepted reward message').toHaveText(TestRewardsPanel.ACCEPTED_MESSAGE);
        await player.page.click(Selectors.rewards.dialogClose);
        await expect(accepted, 'Closing the panel clears the accepted reward message').toBeEmpty();
    }

    static run()
    {
        test.describe('Rewards Panel', () => {
            test('reward description lists the items with the default separator and template', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsPanel.runItemsTextTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    TestRewardsPanel.DEFAULT_ITEMS_FORMAT
                );
            });
            test('configured items separator and template are used', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsPanel.runItemsTextTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    TestRewardsPanel.CONFIGURED_ITEMS_FORMAT
                );
            });
            test('items description turned off shows no items', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsPanel.runItemsTextTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    TestRewardsPanel.ITEMS_OFF_FORMAT
                );
            });
            test('configured title and accepted labels are used', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsPanel.runLabelsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('straight days label and description show the days', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsPanel.runStraightDaysTextTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('event image and path from its data, or no image when its data turns it off', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsPanel.runEventImagesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('reward images turned off show no image', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsPanel.runImagesOffTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('disabled, ended and not started events are not listed', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsPanel.runNotListedTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('event ending later is listed', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsPanel.runEndingEventTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('closing the panel clears the accepted message', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsPanel.runClosePanelTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestRewardsPanel.run();
