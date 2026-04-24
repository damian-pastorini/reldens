/**
 *
 * Reldens - Test Teams
 *
 * Tests the teams panel and multi-player team invitation flow.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Phaser } = require('./helpers/phaser');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTeams
{
    static getPlayerIdFromState(page)
    {
        return page.evaluate(() => {
            let room = window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
            if(!room || !room.state || !room.state.players) {
                return null;
            }
            let player = window.reldens.activeRoomEvents.playerBySessionIdFromState(room, room.sessionId);
            if(!player){
                return null;
            }
            return player.player_id;
        });
    }

    static async loginRoot2Player(page, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername2 || 'root2';
        let password = gameConfig.e2ePassword2 || 'root';
        let playerName = gameConfig.e2ePlayerName2 || 'ImRoot2';
        await Login.loginAndStartGame(page, username, password, playerName, longRun);
    }

    static async loginBothPlayers(page, secondPage, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername2 || 'root2';
        let password = gameConfig.e2ePassword2 || 'root';
        let playerName = gameConfig.e2ePlayerName2 || 'ImRoot2';
        let username2 = gameConfig.e2eUsername3 || 'root3';
        let password2 = gameConfig.e2ePassword3 || 'root';
        let playerName2 = gameConfig.e2ePlayerName3 || 'ImRoot3';
        await Login.loginAndStartGame(page, username, password, playerName, longRun);
        await Login.loginAndStartGame(secondPage, username2, password2, playerName2, longRun);
    }

    static run()
    {
        test.describe('Teams', () => {
            test('teams panel opens and shows content', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestTeams.loginRoot2Player(page, gameConfig, longRun);
                let pauseMs = TimeConstants.pauseMs(longRun);
                await page.click(Selectors.hud.teamsOpen);
                await page.waitForTimeout(pauseMs);
                await expect(page.locator(Selectors.teams.dialog)).toBeVisible(
                    { timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun) }
                );
                await expect(page.locator(Selectors.teams.dialogContent)).toBeVisible();
                await screenshots.capture(page, 'teams-panel-open');
            });
            test('player can invite another player to a team', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestTeams.loginBothPlayers(page, secondPage, gameConfig, longRun);
                await screenshots.capture(page, 'p1-in-game');
                await screenshots.capture(secondPage, 'p2-in-game');
                let pauseMs = TimeConstants.pauseMs(longRun);
                let sceneTimeout = TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun);
                await secondPage.waitForFunction(() => {
                    let room = window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
                    return !!(room && room.sessionId);
                }, { timeout: sceneTimeout });
                let playerBSessionId = await secondPage.evaluate(() => {
                    let room = window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
                    return room ? room.sessionId : null;
                });
                expect(playerBSessionId, 'Player B session ID must be available').not.toBeNull();
                let playerBId = await TestTeams.getPlayerIdFromState(secondPage);
                expect(playerBId, 'Player B player_id must be available').not.toBeNull();
                await Phaser.waitForPlayerBySessionId(page, playerBSessionId, sceneTimeout);
                let playerBCoords = await Phaser.getOtherPlayerScreenCoords(page, playerBSessionId);
                expect(playerBCoords, 'Player B must be visible in player A scene').not.toBeNull();
                await Phaser.clickPlayerBySessionId(page, playerBSessionId);
                await page.waitForTimeout(pauseMs);
                let teamInviteButton = page.locator(Selectors.teams.invite(playerBId));
                await expect(teamInviteButton).toBeVisible(
                    { timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun) }
                );
                await screenshots.capture(page, 'p1-team-invite-button-visible');
                await teamInviteButton.click();
                await page.waitForTimeout(1000 + pauseMs);
                let acceptButton = secondPage.locator(Selectors.teams.acceptOption).first();
                await expect(acceptButton).toBeVisible(
                    { timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun) }
                );
                await screenshots.capture(secondPage, 'p2-team-invite-modal-visible');
                await acceptButton.click();
                await page.waitForTimeout(1000 + pauseMs);
                await expect(page.locator(Selectors.teams.container)).toBeVisible(
                    { timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun) }
                );
                await expect(secondPage.locator(Selectors.teams.container)).toBeVisible(
                    { timeout: TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun) }
                );
                await screenshots.capture(page, 'p1-team-container-visible');
                await screenshots.capture(secondPage, 'p2-team-container-visible');
            });
        });
    }
}

TestTeams.run();
