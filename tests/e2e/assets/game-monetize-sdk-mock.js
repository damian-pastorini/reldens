/**
 *
 * Reldens - GameMonetize SDK Mock
 *
 * Browser script the e2e server serves in place of the GameMonetize SDK (E2eAssetsEndpoints): like the real SDK it reads
 * the window.SDK_OPTIONS when its script loads, keeps them and creates the window.sdk; a spec fires the SDK events
 * through the onEvent callback of those loaded options, the same callback the real SDK calls.
 *
 */

window.sdk = {
    loadedOptions: window.SDK_OPTIONS,
    showBanner: async () => true
};
