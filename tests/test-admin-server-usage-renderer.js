/**
 *
 * Reldens - Test Admin Server Usage Renderer
 *
 * Tests the admin server usage block renderer: the servers usage loaded from the admin path and refreshed by its
 * interval, a server with the blocking disabled over its limits shown as monitor only with the exceeded tiles marked
 * and the limits or no limit, and an unreachable server of the rooms shown as not available with its error.
 *
 */

const timersPromises = require('timers/promises');
const { BaseTest } = require('./base-test');
const { AdminBrowserScriptLoader } = require('./fixtures/admin-browser-script-loader');

class TestAdminServerUsageRenderer extends BaseTest
{

    createElement(dataset)
    {
        let element = {textContent: '', dataset, classes: [], children: {}};
        element.classList = {
            add: (className) => element.classes.push(className),
            remove: (className) => Object.assign(element, {classes: element.classes.filter(existing => existing !== className)}),
            toggle: (className, isOn) => isOn ? element.classList.add(className) : element.classList.remove(className)
        };
        element.querySelector = (selector) => element.children[selector];
        return element;
    }

    createTile(usageKey, limitKey)
    {
        let tile = this.createElement({usageKey, limitKey, unit: '%'});
        tile.children = {'.usage-value': this.createElement({}), '.usage-limit': this.createElement({})};
        return tile;
    }

    createServerItem()
    {
        let serverItem = this.createElement({});
        serverItem.tiles = [this.createTile('memoryPercent', 'maxMemoryPercent'), this.createTile('cpuPercent', 'maxCpuPercent')];
        for(let selector of ['.server-url', '.response-time', '.status-value', '.usage-tiles']){
            serverItem.children[selector] = this.createElement({});
        }
        serverItem.querySelectorAll = () => serverItem.tiles;
        return serverItem;
    }

    createRenderer(contextValues)
    {
        let renderer = new (AdminBrowserScriptLoader.loadClass(
            'admin-server-usage-renderer.js',
            'AdminServerUsageRenderer',
            Object.assign({window: {adminFunctions: {onDocumentReady: () => true}}, document: {}}, contextValues)
        ))();
        renderer.serverItemTemplate = {content: {firstElementChild: {cloneNode: () => this.createServerItem()}}};
        return renderer;
    }

    async testTheServersUsageIsLoadedAndRefreshed()
    {
        await this.test('the servers usage loads from the admin path, renders every server and refreshes by its interval', async () => {
            let requestedUrls = [];
            let intervals = [];
            let renderedItems = [];
            let container = this.createElement({usagePath: '/server-usage', refreshMs: '3000'});
            let renderer = this.createRenderer({
                window: {adminFunctions: {onDocumentReady: () => true}, location: {pathname: '/reldens-admin/management'}},
                document: {querySelector: () => container},
                setInterval: (intervalCallback, delayMs) => intervals.push({intervalCallback, delayMs}),
                fetch: async (url) => requestedUrls.push(url) && {json: async () => ({servers: [{serverUrl: 'http://localhost:8080', isSelf: true, isReachable: false}]})}
            });
            container.children = {
                '.servers-list': {replaceChildren: (...serverItems) => renderedItems.push(serverItems.length)},
                '.server-item-template': renderer.serverItemTemplate,
                '.server-usage-unavailable': this.createElement({})
            };
            renderer.bind();
            await timersPromises.setImmediate();
            intervals[0].intervalCallback();
            await timersPromises.setImmediate();
            this.assert.deepStrictEqual(
                [requestedUrls, intervals.map(interval => interval.delayMs), renderedItems, container.children['.server-usage-unavailable'].classes],
                [['/reldens-admin/server-usage', '/reldens-admin/server-usage'], [3000], [1, 1], ['hidden', 'hidden']]
            );
        });
    }

    async testAMonitorOnlyServerMarksTheExceededTiles()
    {
        await this.test('a server with the blocking disabled over its limits shows monitor only and marks the exceeded tiles', async () => {
            let serverItem = this.createRenderer({}).createServerItem({
                serverUrl: 'http://localhost:8080',
                isSelf: true,
                isReachable: true,
                usageReport: {
                    blockingEnabled: false,
                    isOverloaded: true,
                    isBlocking: false,
                    usage: {memoryPercent: 85, cpuPercent: 20},
                    limits: {maxMemoryPercent: 80, maxCpuPercent: 0},
                    exceededLimits: ['maxMemoryPercent']
                }
            });
            this.assert.deepStrictEqual(
                [
                    serverItem.children['.server-url'].textContent,
                    serverItem.children['.status-value'].textContent,
                    serverItem.children['.status-value'].classes,
                    serverItem.tiles.map(tile => [tile.classes, tile.children['.usage-value'].textContent, tile.children['.usage-limit'].textContent])
                ],
                [
                    'http://localhost:8080 (this server)',
                    'Over the limits, monitor only (blocking disabled)',
                    ['disabled'],
                    [[['exceeded'], '85 %', 'Limit: 80 %'], [[], '20 %', 'No limit']]
                ]
            );
        });
    }

    async testAnUnreachableServerIsShownNotAvailable()
    {
        await this.test('an unreachable server of the rooms shows not available with its error and hides its tiles', async () => {
            let unreachableStatus = {isSelf: false, isReachable: false, usageReport: false, latencyMs: 2500};
            let serverItem = this.createRenderer({}).createServerItem(Object.assign(unreachableStatus, {
                serverUrl: 'http://localhost:8100',
                error: 'Status request error: fetch failed'
            }));
            this.assert.deepStrictEqual(
                [
                    serverItem.children['.response-time'].textContent,
                    serverItem.children['.status-value'].textContent,
                    serverItem.children['.status-value'].classes,
                    serverItem.children['.usage-tiles'].classes
                ],
                [
                    'Response time: 2500 ms',
                    'Not available, Status request error: fetch failed',
                    ['overloaded'],
                    ['hidden']
                ]
            );
        });
    }

}

module.exports.TestAdminServerUsageRenderer = TestAdminServerUsageRenderer;
