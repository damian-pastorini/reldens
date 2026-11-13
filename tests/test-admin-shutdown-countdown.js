/**
 *
 * Reldens - Test Admin Shutdown Countdown
 *
 * Tests the server shutdown from the administration panel: a shutdown time broadcasts the countdown message and the page
 * shows the cancel button with the time left, the countdown warns again at half time and on the last 5 seconds, the
 * time out broadcasts Server Offline and exits the process, a second submit cancels the shutdown, and the server
 * broadcast reaches only the scene rooms.
 *
 */

const { BaseTest } = require('./base-test');
const { ScheduledTimeouts } = require('./fixtures/scheduled-timeouts');
const { ShutdownSubscriber } = require('../lib/admin/server/subscribers/shutdown-subscriber');
const { ServerManager } = require('../lib/game/server/manager');
const { RoomScene } = require('../lib/rooms/server/scene');
const { ChatConst } = require('../lib/chat/constants');

class TestAdminShutdownCountdown extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.managementRedirect = '/reldens-admin/management?result=';
        this.labels = {shuttingDown: 'Server is shutting down in:', submitCancelLabel: 'Cancel Server Shutdown'};
    }

    createShutdownSetup()
    {
        let setup = {broadcasts: [], redirects: [], postRoutes: []};
        let adminManager = {
            events: {on: () => true},
            rootPath: '/reldens-admin',
            translations: {labels: this.labels},
            contentsBuilder: {render: async () => '', renderRoute: async () => ''},
            router: {
                isAuthenticated: (req, res, next) => next(),
                adminRouter: {get: () => true, post: (path, isAuthenticated, callback) => setup.postRoutes.push(callback)}
            }
        };
        setup.subscriber = new ShutdownSubscriber(
            adminManager,
            {getWithoutLogs: (path, defaultValue) => defaultValue},
            async (props) => setup.broadcasts.push(props.message)
        );
        setup.subscriber.setupRoutes(adminManager);
        setup.scheduledTimeouts = new ScheduledTimeouts();
        return setup;
    }

    async postShutdownTime(setup, shutdownTime)
    {
        await setup.scheduledTimeouts.capture(() => setup.postRoutes[0](
            {body: {'shutdown-time': shutdownTime}},
            {redirect: (redirectPath) => setup.redirects.push(redirectPath)}
        ));
    }

    async testTheShutdownTimeBroadcastsTheCountdown()
    {
        await this.test('a shutdown time broadcasts the countdown message and the page shows the cancel button with the time left', async () => {
            let setup = this.createShutdownSetup();
            await this.postShutdownTime(setup, '30');
            let pageData = setup.subscriber.getShuttingDownData();
            this.assert.deepStrictEqual(
                [
                    setup.broadcasts,
                    setup.redirects,
                    setup.scheduledTimeouts.scheduledTimeouts.map(timeout => timeout.delayMs),
                    setup.scheduledTimeouts.scheduledIntervals.map(interval => interval.delayMs),
                    [pageData.shuttingDownLabel, Number(pageData.shuttingDownTime), pageData.submitLabel, pageData.submitType]
                ],
                [
                    ['Server is shutting down in 30 seconds.'],
                    [this.managementRedirect+'success'],
                    [30000],
                    [1000],
                    [this.labels.shuttingDown, 30, this.labels.submitCancelLabel, 'warning']
                ]
            );
        });
    }

    async testTheCountdownWarnsAtHalfTimeAndOnTheLastSeconds()
    {
        await this.test('the countdown warns again at half time and on the last 5 seconds', async () => {
            let setup = this.createShutdownSetup();
            await this.postShutdownTime(setup, '30');
            let tick = setup.scheduledTimeouts.scheduledIntervals[0].intervalCallback;
            for(let second = 0; second < 30; second++){
                await tick();
            }
            this.assert.deepStrictEqual(
                setup.broadcasts.map(message => Number(message.replace(/\D/g, ''))),
                [30, 15, 5, 4, 3, 2, 1]
            );
        });
    }

    async testTheTimeOutBroadcastsServerOfflineAndExits()
    {
        await this.test('the shutdown time out broadcasts Server Offline and exits the process', async () => {
            let setup = this.createShutdownSetup();
            await this.postShutdownTime(setup, '30');
            let originalExit = process.exit;
            let exitCodes = [];
            process.exit = (exitCode) => exitCodes.push(exitCode);
            try {
                await setup.scheduledTimeouts.scheduledTimeouts[0].timeoutCallback();
            } catch(error) {
                process.exit = originalExit;
                throw error;
            }
            process.exit = originalExit;
            this.assert.deepStrictEqual([setup.broadcasts.pop(), exitCodes], ['Server Offline.', [0]]);
        });
    }

    async testASecondSubmitCancelsTheShutdown()
    {
        await this.test('a second submit while the countdown runs cancels the shutdown', async () => {
            let setup = this.createShutdownSetup();
            await this.postShutdownTime(setup, '30');
            await this.postShutdownTime(setup, '30');
            this.assert.deepStrictEqual(
                [setup.subscriber.shuttingDownIn, setup.redirects, setup.broadcasts.length, setup.subscriber.getShuttingDownData().submitType],
                [0, [this.managementRedirect+'success', this.managementRedirect+'success'], 1, 'danger']
            );
        });
    }

    async testTheServerBroadcastReachesOnlyTheSceneRooms()
    {
        await this.test('the server broadcast sends the error chat message only to the scene rooms', async () => {
            let roomMessages = {};
            let createdInstances = {};
            for(let [roomKey, prototype] of [['town', RoomScene.prototype], ['forest', RoomScene.prototype], ['chat', Object.prototype]]){
                createdInstances[roomKey] = Object.create(prototype);
                createdInstances[roomKey].broadcast = (channel, message) => Object.assign(roomMessages, {[roomKey]: message});
            }
            let serverManager = Object.assign(Object.create(ServerManager.prototype), {roomsManager: {createdInstances}});
            let expectedMessage = {act: ChatConst.CHAT_ACTION, [ChatConst.TYPES.KEY]: ChatConst.TYPES.ERROR, [ChatConst.MESSAGE.KEY]: 'Server Offline.'};
            this.assert.deepStrictEqual(
                [await serverManager.serverBroadcast({message: 'Server Offline.'}), roomMessages],
                [true, {town: expectedMessage, forest: expectedMessage}]
            );
        });
    }

}

module.exports.TestAdminShutdownCountdown = TestAdminShutdownCountdown;
