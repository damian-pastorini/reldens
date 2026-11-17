/**
 *
 * Reldens - Test Ip Lists Guards
 *
 * Tests the address allow and deny lists on every entry point: the matchmake request and the socket upgrade of a denied
 * address, the admin panel and the other routes, the allow list over the deny list, the CIDR ranges, the configuration
 * lists and the permanent rows, the malformed entries, the IPv4 mapped clients, the disabled lists, the spoofed
 * forwarding headers, a session denied while playing and a login from an open page once the lists are lifted.
 *
 */

const { sc } = require('@reldens/utils');
const { Client } = require('@colyseus/sdk');
const { BaseE2eTest } = require('./base-e2e-test');
const { GameRoomJoin } = require('./helpers/game-room-join');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { Login } = require('./helpers/login');
const { MovementScenario } = require('./helpers/movement-scenario');
const { PlayerReset } = require('./helpers/player-reset');
const { SecurityApi } = require('./helpers/security-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const GameTranslations = require('../../lib/game/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestIpListsGuards
{

    static IPV6_ADDRESS = '::1';
    static IPV4_ADDRESS = '127.0.0.1';
    static FORBIDDEN_STATUS = 403;
    static LIFT_AFTER_MS = 1500;
    static SPOOFED_ADDRESS = '10.20.30.40';

    static async applyLists(gameConfig, ipLists)
    {
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/security/ip-lists', ipLists);
    }

    static async fetchStatuses(gameConfig, host, paths, headers = {})
    {
        let statuses = [];
        for(let path of paths){
            statuses.push((await fetch(SecurityApi.hostUrl(gameConfig, host)+path, {headers, redirect: 'manual'})).status);
        }
        return statuses;
    }

    static async expectHostDenied(gameConfig, host, isDenied, label)
    {
        let homeStatuses = await TestIpListsGuards.fetchStatuses(gameConfig, host, ['/']);
        expect(TestIpListsGuards.FORBIDDEN_STATUS === homeStatuses.shift(), label).toBe(isDenied);
    }

    static async postMatchmake(gameConfig, host, headers = {})
    {
        return await fetch(SecurityApi.hostUrl(gameConfig, host)+'/matchmake/joinOrCreate/'+GameConst.ROOM_GAME, {
            method: 'POST',
            headers: Object.assign({'Content-Type': 'application/json'}, headers),
            body: sc.toJsonString({username: gameConfig.e2eUsername2, password: gameConfig.e2ePassword})
        });
    }

    static async runDeniedEntryPointsTest(gameConfig)
    {
        await TestIpListsGuards.applyLists(gameConfig, {deny: [TestIpListsGuards.IPV6_ADDRESS]});
        expect((await TestIpListsGuards.postMatchmake(gameConfig, GameRoomJoin.IPV6_HOST)).status, 'Matchmake').toBe(
            TestIpListsGuards.FORBIDDEN_STATUS
        );
        let seatReservation = await (await TestIpListsGuards.postMatchmake(gameConfig, GameRoomJoin.IPV4_HOST)).json();
        let upgradedRoom = await new Client(SecurityApi.hostUrl(gameConfig, GameRoomJoin.IPV6_HOST))
            .consumeSeatReservation(seatReservation)
            .catch(() => false);
        expect(upgradedRoom, 'The upgrade guard must reject the denied socket').toBe(false);
        expect(await GameRoomJoin.login(gameConfig, gameConfig.e2eUsername2, gameConfig.e2ePassword)).toEqual(
            GameRoomJoin.ACCEPTED
        );
    }

    static async runDeniedRoutesTest(gameConfig)
    {
        let routePaths = ['/', AdminPanelSession.adminPath(gameConfig)+'/login', GameConst.ROUTE_PATHS.TERMS_AND_CONDITIONS];
        await TestIpListsGuards.applyLists(gameConfig, {deny: [TestIpListsGuards.IPV6_ADDRESS]});
        expect(await TestIpListsGuards.fetchStatuses(gameConfig, GameRoomJoin.IPV6_HOST, routePaths), 'Denied').toEqual(
            routePaths.map(() => TestIpListsGuards.FORBIDDEN_STATUS)
        );
        let allowedStatuses = await TestIpListsGuards.fetchStatuses(gameConfig, GameRoomJoin.IPV4_HOST, routePaths);
        expect(allowedStatuses.filter(status => TestIpListsGuards.FORBIDDEN_STATUS === status), 'Allowed').toEqual([]);
    }

    static async runAllowListTest(gameConfig)
    {
        await TestIpListsGuards.applyLists(gameConfig, {
            allow: [TestIpListsGuards.IPV4_ADDRESS],
            deny: [TestIpListsGuards.IPV4_ADDRESS]
        });
        await TestIpListsGuards.expectHostDenied(gameConfig, GameRoomJoin.IPV4_HOST, false, 'Allowed over the deny list');
        await TestIpListsGuards.expectHostDenied(gameConfig, GameRoomJoin.IPV6_HOST, true, 'Not in the allow list');
    }

    static async runCidrEntriesTest(gameConfig)
    {
        await TestIpListsGuards.applyLists(gameConfig, {configDeny: [TestIpListsGuards.IPV6_ADDRESS+'/128']});
        await TestIpListsGuards.expectHostDenied(gameConfig, GameRoomJoin.IPV6_HOST, true, 'Deny range');
        await TestIpListsGuards.expectHostDenied(gameConfig, GameRoomJoin.IPV4_HOST, false, 'Out of the deny range');
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/security/ip-lists/lift', {});
        await TestIpListsGuards.applyLists(gameConfig, {configAllow: ['127.0.0.0/8']});
        await TestIpListsGuards.expectHostDenied(gameConfig, GameRoomJoin.IPV4_HOST, false, 'Allow range');
        await TestIpListsGuards.expectHostDenied(gameConfig, GameRoomJoin.IPV6_HOST, true, 'Out of the allow range');
    }

    static async runConfigAndPermanentRowsTest(gameConfig)
    {
        await TestIpListsGuards.applyLists(gameConfig, {configDeny: [TestIpListsGuards.IPV6_ADDRESS]});
        await TestIpListsGuards.expectHostDenied(gameConfig, GameRoomJoin.IPV6_HOST, true, 'Configuration deny list');
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/security/ip-lists/lift', {});
        await TestIpListsGuards.applyLists(gameConfig, {allow: [TestIpListsGuards.IPV4_ADDRESS]});
        await TestIpListsGuards.expectHostDenied(gameConfig, GameRoomJoin.IPV4_HOST, false, 'Permanent allow row');
        await TestIpListsGuards.expectHostDenied(gameConfig, GameRoomJoin.IPV6_HOST, true, 'Not in the allow rows');
    }

    static async runMalformedEntriesTest(gameConfig)
    {
        let malformedEntries = [TestIpListsGuards.IPV6_ADDRESS+'/999', TestIpListsGuards.IPV6_ADDRESS+'/abc', 'not-an-address'];
        await TestIpListsGuards.applyLists(gameConfig, {configDeny: malformedEntries});
        await TestIpListsGuards.expectHostDenied(gameConfig, GameRoomJoin.IPV6_HOST, false, 'Malformed entries ignored');
    }

    static async runMappedAddressTest(page, gameConfig)
    {
        await TestIpListsGuards.applyLists(gameConfig, {
            configDeny: [TestIpListsGuards.IPV4_ADDRESS],
            liftAfterMs: TestIpListsGuards.LIFT_AFTER_MS
        });
        await TestIpListsGuards.expectHostDenied(gameConfig, GameRoomJoin.IPV4_HOST, true, 'IPv4 entry');
        await page.waitForTimeout(TestIpListsGuards.LIFT_AFTER_MS * 2);
        await TestIpListsGuards.expectHostDenied(gameConfig, GameRoomJoin.IPV4_HOST, false, 'Lifted');
    }

    static async runDisabledListsTest(gameConfig)
    {
        await TestIpListsGuards.applyLists(gameConfig, {deny: [TestIpListsGuards.IPV6_ADDRESS], enabled: false});
        await TestIpListsGuards.expectHostDenied(gameConfig, GameRoomJoin.IPV6_HOST, false, 'Disabled lists');
        expect(await GameRoomJoin.login(gameConfig, gameConfig.e2eUsername2, gameConfig.e2ePassword, GameRoomJoin.IPV6_HOST)).toEqual(
            GameRoomJoin.ACCEPTED
        );
    }

    static async runSpoofedHeadersTest(gameConfig)
    {
        let spoofedHeaders = {
            'x-forwarded-for': TestIpListsGuards.SPOOFED_ADDRESS,
            'x-real-ip': TestIpListsGuards.SPOOFED_ADDRESS,
            'x-client-ip': TestIpListsGuards.SPOOFED_ADDRESS
        };
        await TestIpListsGuards.applyLists(gameConfig, {deny: [TestIpListsGuards.IPV6_ADDRESS, TestIpListsGuards.SPOOFED_ADDRESS]});
        expect(await TestIpListsGuards.fetchStatuses(gameConfig, GameRoomJoin.IPV6_HOST, ['/'], spoofedHeaders), 'Page').toEqual([
            TestIpListsGuards.FORBIDDEN_STATUS
        ]);
        expect((await TestIpListsGuards.postMatchmake(gameConfig, GameRoomJoin.IPV6_HOST, spoofedHeaders)).status, 'Join').toBe(
            TestIpListsGuards.FORBIDDEN_STATUS
        );
        let allowedStatuses = await TestIpListsGuards.fetchStatuses(gameConfig, GameRoomJoin.IPV4_HOST, ['/'], spoofedHeaders);
        expect(allowedStatuses, 'A denied spoofed address on an allowed client').not.toEqual([TestIpListsGuards.FORBIDDEN_STATUS]);
    }

    static async openIpv6Page(page, gameConfig, longRun)
    {
        await page.goto(SecurityApi.hostUrl(gameConfig, GameRoomJoin.IPV6_HOST)+'/');
        await expect(page.locator(Selectors.login.form)).toBeVisible({
            timeout: TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun)
        });
    }

    static async runDeniedWhilePlayingTest(page, screenshots, gameConfig, longRun)
    {
        await TestIpListsGuards.openIpv6Page(page, gameConfig, longRun);
        await Login.loginOnOpenPage(page, gameConfig.e2eUsername, gameConfig.e2ePassword, gameConfig.e2ePlayerName, longRun);
        await MovementScenario.walkBelowTheForestFromReturnPoint(page, gameConfig, gameConfig.e2ePlayerName, longRun);
        await TestIpListsGuards.applyLists(gameConfig, {deny: [TestIpListsGuards.IPV6_ADDRESS]});
        expect(await page.evaluate(() => window.reldens.activeRoomEvents.room.connection.isOpen), 'Open socket kept').toBe(true);
        await MovementScenario.tryWalkIntoTheForest(page, longRun);
        await expect(page.locator(Selectors.reloadModal.message)).toHaveText(GameTranslations.game.errors.reconnectClient, {
            timeout: TimeConstants.forLongRun(TimeConstants.GAME_START, longRun)
        });
        await screenshots.capture(page, 'denied-while-playing');
    }

    static async runLoginAfterLiftTest(page, gameConfig, longRun)
    {
        await TestIpListsGuards.openIpv6Page(page, gameConfig, longRun);
        await TestIpListsGuards.applyLists(gameConfig, {deny: [TestIpListsGuards.IPV6_ADDRESS]});
        await page.locator(Selectors.login.username).fill(gameConfig.e2eUsername);
        await page.locator(Selectors.login.password).fill(gameConfig.e2ePassword);
        await page.click(Selectors.login.submit);
        await expect(page.locator(Selectors.login.error), 'Denied login').not.toBeEmpty({
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/security/ip-lists/lift', {});
        await Login.loginOnOpenPage(page, gameConfig.e2eUsername, gameConfig.e2ePassword, gameConfig.e2ePlayerName, longRun);
    }

    static run()
    {
        test.describe('Ip Lists Guards', () => {
            test.beforeEach(async ({ gameConfig, e2eGroup }) => {
                await PlayerReset.resetAll(gameConfig, e2eGroup);
            });
            test('denied address is rejected on the matchmake request and on the socket upgrade', async ({ gameConfig }) => {
                await TestIpListsGuards.runDeniedEntryPointsTest(gameConfig);
            });
            test('denied address is rejected on the admin panel and the other routes', async ({ gameConfig }) => {
                await TestIpListsGuards.runDeniedRoutesTest(gameConfig);
            });
            test('allow list accepts only its entries and ignores the deny list', async ({ gameConfig }) => {
                await TestIpListsGuards.runAllowListTest(gameConfig);
            });
            test('CIDR ranges apply on the deny and allow lists', async ({ gameConfig }) => {
                await TestIpListsGuards.runCidrEntriesTest(gameConfig);
            });
            test('configuration deny list and permanent allow rows apply', async ({ gameConfig }) => {
                await TestIpListsGuards.runConfigAndPermanentRowsTest(gameConfig);
            });
            test('malformed deny entries are ignored', async ({ gameConfig }) => {
                await TestIpListsGuards.runMalformedEntriesTest(gameConfig);
            });
            test('IPv4 deny entry rejects the client seen as an IPv4 mapped address', async ({ page, gameConfig }) => {
                await TestIpListsGuards.runMappedAddressTest(page, gameConfig);
            });
            test('disabled lists accept the page and the join with deny rows stored', async ({ gameConfig }) => {
                await TestIpListsGuards.runDisabledListsTest(gameConfig);
            });
            test('spoofed forwarding headers are ignored', async ({ gameConfig }) => {
                await TestIpListsGuards.runSpoofedHeadersTest(gameConfig);
            });
            test('address denied while playing keeps the socket and rejects the next scene change', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestIpListsGuards.runDeniedWhilePlayingTest(page, screenshots, gameConfig, longRun);
            });
            test('login from the open page works once the lists are lifted', async ({ page, gameConfig, longRun }) => {
                await TestIpListsGuards.runLoginAfterLiftTest(page, gameConfig, longRun);
            });
        });
    }

}

TestIpListsGuards.run();
