/**
 *
 * Reldens - Test Teams Box
 *
 * Tests the team box of the group players in their scene (TeamSteps): the box shows the leader title, the other members, the
 * disband label for the owner and the leave label for the members, and the configured labels and shared properties
 * (changed for the group before the logins); only the owner gets the remove buttons and a remove from the box removes
 * that member; a remove from a member, with no id or of a non member changes nothing; a member disconnecting from a
 * team of two and the owner disconnecting disband the team; a
 * teammate life change updates its shared property on the other boxes; the target box hides the invite button for a
 * teammate and shows it again once it left; and a click on a member name targets that player.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TeamSteps } = require('./helpers/team-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { Navigation } = require('./helpers/navigation');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { TeamsConst } = require('../../lib/teams/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTeamsBox
{

    static SETTLE_MS = 1500;
    static NON_MEMBER_ID = 999999;
    static LABELS = {
        leaderNameTitle: 'E2E leader %leaderName',
        leaveLabel: 'E2E leave',
        disbandLabel: 'E2E disband'
    };

    static async enter(context, playersCount = 3, configValues = {})
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * (playersCount + 2), context.longRun));
        for(let configPath of Object.keys(configValues)){
            await E2eSeedAndRestoreApi.overrideConfig(context.gameConfig, context.e2eGroup, configPath, configValues[configPath]);
        }
        let players = await TeamSteps.enterPlayers(context, playersCount);
        await TeamSteps.formTeam(context.gameConfig, players[0], players.slice(1));
        return players;
    }

    static teamBox(owner)
    {
        return '#box-'+TeamsConst.KEY+owner.playerId;
    }

    static async openOwnerBox(owner)
    {
        await owner.page.locator('#box-open-'+TeamsConst.KEY+owner.playerId).click();
        await expect(owner.page.locator(TestTeamsBox.teamBox(owner)), 'The team box is open').toBeVisible();
    }

    static async runBoxContentTest(context)
    {
        let players = await TestTeamsBox.enter(context);
        for(let player of players){
            let box = player.page.locator(TestTeamsBox.teamBox(players[0]));
            await expect(box, 'The leader title').toContainText(TeamsConst.LABELS.TEAM.LEADER_NAME_TITLE.replace('%leaderName', players[0].playerName));
            for(let member of players.filter(otherPlayer => otherPlayer !== player)){
                await expect(box.locator('.team-player-'+member.playerId+' .player-name'), 'The member '+member.playerName).toHaveText(member.playerName);
            }
        }
        await expect(players[0].page.locator('.leave-'+players[0].playerId), 'The owner disband label').toHaveText(TeamsConst.LABELS.TEAM.DISBAND);
        await expect(players[1].page.locator('.leave-'+players[1].playerId), 'The member leave label').toHaveText(TeamsConst.LABELS.TEAM.LEAVE);
    }

    static async runConfiguredBoxTest(context)
    {
        let labelsPath = 'client/team/labels/';
        let players = await TestTeamsBox.enter(context, 2, {
            [labelsPath+'leaderNameTitle']: TestTeamsBox.LABELS.leaderNameTitle,
            [labelsPath+'leaveLabel']: TestTeamsBox.LABELS.leaveLabel,
            [labelsPath+'disbandLabel']: TestTeamsBox.LABELS.disbandLabel,
            'client/ui/teams/sharedProperties': {hp: {path: 'stats/hp', label: 'E2E HP'}}
        });
        let box = players[1].page.locator(TestTeamsBox.teamBox(players[0]));
        await expect(box, 'The configured title').toContainText(TestTeamsBox.LABELS.leaderNameTitle.replace('%leaderName', players[0].playerName));
        await expect(players[0].page.locator('.leave-'+players[0].playerId), 'The configured disband').toHaveText(TestTeamsBox.LABELS.disbandLabel);
        await expect(players[1].page.locator('.leave-'+players[1].playerId), 'The configured leave').toHaveText(TestTeamsBox.LABELS.leaveLabel);
        await expect(box.locator('.property-key-hp'), 'The configured property').toContainText('E2E HP');
        await expect(box.locator('.property-key-mp'), 'No other property').toHaveCount(0);
        await expect(box.locator('.property-key-hp'), 'No max without pathMax').not.toContainText('/');
    }

    static async runRemoveButtonTest(context)
    {
        let players = await TestTeamsBox.enter(context);
        await expect(players[1].page.locator('.team-remove-button'), 'No remove button for a member').toHaveCount(0);
        await TestTeamsBox.openOwnerBox(players[0]);
        await players[0].page.locator('.team-player-'+players[2].playerId+' .team-remove-button').click();
        await TeamSteps.expectTeams(context.gameConfig, [[players[0].playerId, TeamSteps.sortedIds([players[0], players[1]])]], 'The member is removed');
    }

    static async runRejectedRemovesTest(context)
    {
        let players = await TestTeamsBox.enter(context);
        await RoomMessagesRecorder.sendMessage(players[1].page, {act: TeamsConst.ACTIONS.TEAM_REMOVE, remove: String(players[2].playerId)});
        await RoomMessagesRecorder.sendMessage(players[0].page, {act: TeamsConst.ACTIONS.TEAM_REMOVE});
        await RoomMessagesRecorder.sendMessage(players[0].page, {act: TeamsConst.ACTIONS.TEAM_REMOVE, remove: TestTeamsBox.NON_MEMBER_ID});
        await players[0].page.waitForTimeout(TestTeamsBox.SETTLE_MS);
        await TeamSteps.expectTeams(context.gameConfig, [[players[0].playerId, TeamSteps.sortedIds(players)]], 'Nothing changes');
    }

    static async runDisconnectsTest(context)
    {
        let players = await TestTeamsBox.enter(context, 2);
        await players[1].page.reload();
        await TeamSteps.expectTeams(context.gameConfig, [], 'A member of two disconnects');
        await expect(players[0].page.locator(TestTeamsBox.teamBox(players[0])), 'The owner box is closed').toHaveCount(0, {
            timeout: TimeConstants.SERVER_RESPONSE
        });
    }

    static async runOwnerDisconnectTest(context)
    {
        let players = await TestTeamsBox.enter(context);
        await players[0].page.reload();
        await TeamSteps.expectTeams(context.gameConfig, [], 'The owner disconnect disbands the team');
        for(let player of players.slice(1)){
            await expect(player.page.locator(TestTeamsBox.teamBox(players[0])), 'The member box is closed').toHaveCount(0, {
                timeout: TimeConstants.SERVER_RESPONSE
            });
        }
    }

    static async runSharedPropertyTest(context)
    {
        let players = await TestTeamsBox.enter(context, 2);
        let roomName = await Navigation.getCurrentRoomName(players[1].page);
        let member = await GameplayE2eStateApi.fetchPlayer(context.gameConfig, roomName, players[1].playerName);
        await RoomMessagesRecorder.start(players[0].page);
        let lowered = await RoomObjectsApi.setPlayerAffectedProperty(context.gameConfig, roomName, players[1].playerName, member.life - 1);
        expect(lowered.value, 'The member life is lowered').toBe(member.life - 1);
        await expect.poll(async () => (await RoomMessagesRecorder.fetchMessages(players[0].page, TeamsConst.ACTIONS.TEAM_UPDATE)).map(
            update => update.players?.[String(players[1].playerId)]?.sharedProperties?.hp?.value
        ), {message: 'The owner gets the team update with the new life', timeout: TimeConstants.SERVER_RESPONSE})
            .toContain(member.life - 1);
        await expect(players[0].page.locator(Selectors.teams.playerProperty(players[1].playerId, 'hp')), 'The owner box shows it')
            .toHaveText(String(member.life - 1), {timeout: TimeConstants.SERVER_RESPONSE});
    }

    static async runTargetBoxTest(context)
    {
        let players = await TestTeamsBox.enter(context, 2);
        let targetMember = async () => await players[0].page.evaluate(
            (targetSessionId) => window.reldens.getCurrentPlayer().setTargetPlayerById(targetSessionId),
            players[1].sessionId
        );
        await targetMember();
        await players[0].page.waitForTimeout(TestTeamsBox.SETTLE_MS);
        await expect(players[0].page.locator(Selectors.teams.invite(players[1].playerId)), 'No invite for a teammate').toHaveCount(0);
        await RoomMessagesRecorder.sendMessage(players[1].page, {act: TeamsConst.ACTIONS.TEAM_LEAVE});
        await TeamSteps.expectTeams(context.gameConfig, [], 'The member left');
        await targetMember();
        await expect(players[0].page.locator(Selectors.teams.invite(players[1].playerId)), 'The invite is shown again').toBeVisible({
            timeout: TimeConstants.SERVER_RESPONSE
        });
    }

    static async runNameClickTest(context)
    {
        let players = await TestTeamsBox.enter(context, 2);
        await TestTeamsBox.openOwnerBox(players[0]);
        await players[0].page.locator(TestTeamsBox.teamBox(players[0])+' .team-player-'+players[1].playerId+' .player-name').click();
        await expect.poll(
            async () => await players[0].page.evaluate(() => window.reldens.getCurrentPlayer().currentTarget?.id || false),
            {message: 'The member is targeted', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(players[1].sessionId);
    }

    static run()
    {
        test.describe('Teams Box', () => {
            test('box shows the leader, the members and the owner and member labels', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsBox.runBoxContentTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('box uses the configured labels and shared properties', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsBox.runConfiguredBoxTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('only the owner removes a member from the box', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsBox.runRemoveButtonTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('removes from a member, with no id or of a non member change nothing', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsBox.runRejectedRemovesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('member of a team of two disconnecting disbands the team', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsBox.runDisconnectsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('owner disconnecting disbands the team', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsBox.runOwnerDisconnectTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('teammate life change updates its shared property', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsBox.runSharedPropertyTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('invite button hidden for a teammate and shown after it left', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsBox.runTargetBoxTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('member name click targets that player', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTeamsBox.runNameClickTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTeamsBox.run();
