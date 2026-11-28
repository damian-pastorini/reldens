/**
 *
 * Reldens - Test CrazyGames Banners Handler
 *
 * Tests the CrazyGames BannersHandler with a stubbed SDK, game DOM and events manager: a full time banner of a valid
 * size is requested in its container and placed with its styles and its configured position (absolute when none is
 * configured); a UI banner is requested only on opening its referenced UI or any UI with ANY, hidden on the UI close,
 * reused inside the refresh time and regenerated after it; a banner without banner data, UI references or a valid
 * size is not created, and a UI banner that could not be created is not stored, so its UI close and reopen keep
 * working; a responsive banner uses requestResponsiveBanner; and an SDK request error answers false without throwing.
 *
 */

const { BaseTest } = require('./base-test');
const { BannersHandler } = require('../lib/ads/client/providers/crazy-games/banners-handler');
const { LoginFormStubsBuilder } = require('./fixtures/login-form-stubs-builder');
const { sc } = require('@reldens/utils');

class TestCrazyGamesBannersHandler extends BaseTest
{

    createBannerElement(elementId)
    {
        let element = LoginFormStubsBuilder.createElement({id: elementId, removed: false, styles: {}});
        element.remove = () => element.removed = true;
        return element;
    }

    createHandler(setup)
    {
        setup.requests = [];
        setup.appended = [];
        setup.listeners = {};
        return new BannersHandler({
            gameManager: {
                gameDom: {
                    createElement: (tagName, elementId) => this.createBannerElement(elementId),
                    getElement: () => ({append: (element) => setup.appended.push(element)}),
                    setElementStyles: (element, styles) => element.styles = styles
                },
                events: {on: (eventName, callback) => setup.listeners[eventName] = callback}
            },
            metaData: {sdkBannerRefreshTime: sc.get(setup, 'refreshTime', 60000)},
            sdk: {banner: {
                requestBanner: async (options) => {
                    if(setup.failRequest){
                        throw new Error('CrazyGames banner request failed.');
                    }
                    setup.requests.push(options);
                },
                requestResponsiveBanner: async (containerId) => setup.requests.push(containerId)
            }},
            hasAdblock: async () => false,
            isEnabled: () => true
        });
    }

    async activateUiBanner(setup, uiReferenceIds, styles = {width: '300', height: '250', position: null})
    {
        let handler = this.createHandler(setup);
        let activated = await handler.activateAdBanner({id: 'banner-ui', bannerData: {uiReferenceIds}, styles});
        this.assert.strictEqual(activated, undefined);
        return handler;
    }

    async testAFullTimeBannerOfAValidSizeIsRequestedOnActivation()
    {
        await this.test('a full time banner of a valid size is requested and placed on its activation', async () => {
            let setup = {};
            let banner = await this.createHandler(setup).activateAdBanner({
                id: 'banner-full',
                bannerData: {fullTime: true},
                styles: {width: '728', height: '90', top: '10px', left: '20px', position: 'fixed'}
            });
            this.assert.deepStrictEqual(setup.requests, [{id: 'banner-container-banner-full', width: '728', height: '90'}]);
            this.assert.deepStrictEqual(setup.appended, [banner]);
            this.assert.deepStrictEqual(
                [
                    banner.classes,
                    banner.styles['z-index'],
                    banner.styles.width,
                    banner.styles.height,
                    banner.styles.top,
                    banner.styles.position
                ],
                [['ads-banner-container'], 200000000, '728', '90', '10px', 'fixed']
            );
            this.assert.strictEqual(banner.styles.left, '20px');
        });
    }

    async testAUiBannerShowsOnlyOnItsReferencedUi()
    {
        await this.test('a UI banner is requested only on opening its referenced UI, or any UI with ANY', async () => {
            let setup = {};
            await this.activateUiBanner(setup, ['inventory']);
            await setup.listeners['reldens.openUI']({openButton: {id: 'equipment'}});
            this.assert.deepStrictEqual(setup.requests, []);
            await setup.listeners['reldens.openUI']({openButton: {id: 'inventory'}});
            this.assert.deepStrictEqual(setup.requests, [{id: 'banner-container-banner-ui-inventory', width: '300', height: '250'}]);
            let anySetup = {};
            await this.activateUiBanner(anySetup, ['ANY']);
            await anySetup.listeners['reldens.openUI']({openButton: {id: 'equipment'}});
            this.assert.deepStrictEqual(anySetup.requests, [{id: 'banner-container-banner-ui-equipment', width: '300', height: '250'}]);
        });
    }

    async testAUiBannerIsHiddenOnCloseAndReusedOrRegeneratedOnReopen()
    {
        await this.test('a UI banner hides on close, is reused inside the refresh time and regenerated after it', async () => {
            let setup = {};
            let handler = await this.activateUiBanner(setup, ['inventory']);
            let openEvent = {openButton: {id: 'inventory'}};
            await setup.listeners['reldens.openUI'](openEvent);
            let firstBanner = handler.activeBanners['banner-ui-inventory'].banner;
            await setup.listeners['reldens.closeUI'](openEvent);
            this.assert.deepStrictEqual(
                [firstBanner.classes, firstBanner.styles.position],
                [['ads-banner-container', 'hidden'], 'absolute']
            );
            await setup.listeners['reldens.openUI'](openEvent);
            this.assert.deepStrictEqual([firstBanner.classes, setup.requests.length], [['ads-banner-container'], 1]);
            let refreshSetup = {refreshTime: -1};
            let refreshHandler = await this.activateUiBanner(refreshSetup, ['inventory']);
            await refreshSetup.listeners['reldens.openUI'](openEvent);
            let oldBanner = refreshHandler.activeBanners['banner-ui-inventory'].banner;
            await refreshSetup.listeners['reldens.openUI'](openEvent);
            this.assert.deepStrictEqual(
                [oldBanner.removed, refreshSetup.requests.length, refreshHandler.activeBanners['banner-ui-inventory'].banner === oldBanner],
                [true, 2, false]
            );
        });
    }

    async testBannersWithoutDataReferencesOrValidSizeAreNotCreated()
    {
        await this.test('a banner without banner data, UI references or a valid size is not created and nothing throws', async () => {
            let setup = {};
            let handler = this.createHandler(setup);
            this.assert.strictEqual(await handler.activateAdBanner({id: 'no-data'}), false);
            this.assert.strictEqual(await handler.activateAdBanner({id: 'no-ui', bannerData: {uiReferenceIds: []}}), false);
            this.assert.strictEqual(await handler.activateAdBanner({
                id: 'bad-size',
                bannerData: {fullTime: true},
                styles: {width: '100', height: '100'}
            }), false);
            this.assert.deepStrictEqual([setup.requests, setup.appended, Object.keys(setup.listeners)], [[], [], []]);
        });
    }

    async testAUiBannerNotCreatedKeepsItsUiCloseAndReopenWorking()
    {
        await this.test('a UI banner that could not be created is not stored and its UI close and reopen keep working', async () => {
            let setup = {};
            let handler = await this.activateUiBanner(setup, ['inventory'], {width: '100', height: '100'});
            let openEvent = {openButton: {id: 'inventory'}};
            await setup.listeners['reldens.openUI'](openEvent);
            let isStoredAfterOpen = sc.hasOwn(handler.activeBanners, 'banner-ui-inventory');
            await setup.listeners['reldens.closeUI'](openEvent);
            await setup.listeners['reldens.openUI'](openEvent);
            this.assert.deepStrictEqual(
                [isStoredAfterOpen, handler.activeBanners, setup.requests, setup.appended],
                [false, {}, [], []]
            );
        });
    }

    async testAResponsiveBannerIsRequestedThroughTheResponsiveRequest()
    {
        await this.test('a responsive banner is requested through requestResponsiveBanner with its container', async () => {
            let setup = {};
            let banner = await this.createHandler(setup).activateAdBanner({
                id: 'banner-responsive',
                bannerData: {fullTime: true, responsive: true},
                styles: {top: '5px'}
            });
            this.assert.deepStrictEqual(setup.requests, ['responsive-banner-container-banner-responsive']);
            this.assert.deepStrictEqual(
                [setup.appended, banner.classes, sc.hasOwn(banner.styles, 'width'), banner.styles.top, banner.styles.position],
                [[banner], ['ads-banner-container'], false, '5px', 'absolute']
            );
        });
    }

    async testAnSdkBannerRequestErrorIsCaught()
    {
        await this.test('an SDK banner request error answers false without throwing', async () => {
            let setup = {failRequest: true};
            this.assert.strictEqual(await this.createHandler(setup).activateAdBanner({
                id: 'banner-error',
                bannerData: {fullTime: true},
                styles: {width: '728', height: '90'}
            }), false);
            this.assert.deepStrictEqual(setup.requests, []);
        });
    }

}

module.exports.TestCrazyGamesBannersHandler = TestCrazyGamesBannersHandler;
