/**
 *
 * Reldens - Test Ads Required SDK
 *
 * Tests the ads SDK loaded with the page and the required SDK setting (client/ads/general/sdkRequired) through the
 * initial client config of the page, with the CrazyGames provider enabled on the e2e SDK mock: required, the login
 * forms stay hidden while the SDK loads and are shown once it loaded; required and failing (the mock request aborted),
 * the forms stay hidden and the ads SDK error is shown; not required and failing, the login works.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { AdMessagesPlayer } = require('./helpers/ad-messages-player');
const { InitialClientConfig } = require('./helpers/initial-client-config');
const { E2eAssetsEndpoints } = require('./helpers/e2e-assets-endpoints');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdsRequiredSdk
{

    static ADS_GENERAL_PATH = 'client/ads/general';
    static SDK_ROUTE = '**'+E2eAssetsEndpoints.ASSETS_PATH+E2eAssetsEndpoints.SDK_MOCK_FILE;

    static async loadSdkWithPage(page, sdkRequired)
    {
        await InitialClientConfig.merge(page, TestAdsRequiredSdk.ADS_GENERAL_PATH, {
            sdkRequired,
            providers: {
                [AdMessagesPlayer.MOCKED_PROVIDER_KEY]: {
                    enabled: 1,
                    sdkUrl: E2eAssetsEndpoints.ASSETS_PATH+E2eAssetsEndpoints.SDK_MOCK_FILE
                }
            }
        });
    }

    static async expectLoginState(page, isLoginVisible, isErrorVisible, longRun)
    {
        let timeout = TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun);
        await expect(page.locator(Selectors.login.formsContainer), 'The login forms').toBeVisible({
            visible: isLoginVisible,
            timeout
        });
        await expect(page.locator(Selectors.login.adsSdkError), 'The ads SDK error').toBeVisible({
            visible: isErrorVisible,
            timeout
        });
    }

    static async runRequiredSdkLoadedTest(page, screenshots, gameConfig, longRun)
    {
        await TestAdsRequiredSdk.loadSdkWithPage(page, true);
        let heldRoutes = [];
        await page.route(TestAdsRequiredSdk.SDK_ROUTE, (route) => heldRoutes.push(route));
        await page.goto('/', {waitUntil: 'domcontentloaded'});
        await expect.poll(() => heldRoutes.length, {message: 'The SDK request is held'}).toBe(1);
        await TestAdsRequiredSdk.expectLoginState(page, false, false, longRun);
        await screenshots.capture(page, 'required-sdk-loading-hides-login');
        await heldRoutes.shift().continue();
        await page.unroute(TestAdsRequiredSdk.SDK_ROUTE);
        await TestAdsRequiredSdk.expectLoginState(page, true, false, longRun);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await screenshots.capture(page, 'required-sdk-loaded-game-started');
    }

    static async runRequiredSdkFailedTest(page, screenshots, longRun)
    {
        await TestAdsRequiredSdk.loadSdkWithPage(page, true);
        await page.route(TestAdsRequiredSdk.SDK_ROUTE, (route) => route.abort());
        await page.goto('/');
        await TestAdsRequiredSdk.expectLoginState(page, false, true, longRun);
        await screenshots.capture(page, 'required-sdk-failed-blocks-login');
    }

    static async runSdkNotRequiredFailedTest(page, screenshots, gameConfig, longRun)
    {
        await TestAdsRequiredSdk.loadSdkWithPage(page, false);
        await page.route(TestAdsRequiredSdk.SDK_ROUTE, (route) => route.abort());
        await page.goto('/');
        await TestAdsRequiredSdk.expectLoginState(page, true, false, longRun);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await screenshots.capture(page, 'sdk-not-required-failed-game-started');
    }

    static run()
    {
        test.describe('Ads Required SDK', () => {
            test(
                'required ads SDK hides the login until it loads and then the game starts',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestAdsRequiredSdk.runRequiredSdkLoadedTest(page, screenshots, gameConfig, longRun);
                }
            );
            test(
                'required ads SDK that fails to load keeps the login hidden and shows the SDK error',
                async ({ page, screenshots, longRun }) => {
                    await TestAdsRequiredSdk.runRequiredSdkFailedTest(page, screenshots, longRun);
                }
            );
            test(
                'ads SDK not required that fails to load keeps the login and the game starts',
                async ({ page, screenshots, gameConfig, longRun }) => {
                    await TestAdsRequiredSdk.runSdkNotRequiredFailedTest(page, screenshots, gameConfig, longRun);
                }
            );
        });
    }

}

TestAdsRequiredSdk.run();
