/**
 *
 * Reldens - SdkHandler
 *
 * Handles the initialization and setup of third-party advertising SDKs. The providers SDK scripts are appended with the
 * page (the ads plugin preload) and once each, so they are loaded before the game starts; a provider enabled only in
 * the login game config gets its script appended when the providers are activated.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 *
 * @typedef {Object} SdkHandlerProps
 * @property {Object} [gameDom] - The game DOM wrapper instance
 * @property {Object} [config] - Configuration object for the SDK
 */
class SdkHandler
{

    /**
     * @param {SdkHandlerProps} props
     */
    constructor(props)
    {
        /** @type {Object|false} */
        this.gameDom = sc.get(props, 'gameDom', false);
        /** @type {Array<string>} */
        this.appendedSdkUrls = [];
    }

    /**
     * @param {Object<string, Object>} providers
     * @returns {Array<HTMLScriptElement>}
     */
    appendProvidersSdk(providers)
    {
        let appendedScripts = [];
        if(!this.gameDom){
            Logger.error('Undefined GameDOM on SdkHandler.');
            return appendedScripts;
        }
        for(let providerKey of Object.keys(providers)){
            let sdkScript = this.appendSdk(providers[providerKey]);
            if(sdkScript){
                appendedScripts.push(sdkScript);
            }
        }
        return appendedScripts;
    }

    /**
     * @param {Object<string, Object>} providers
     * @param {GameManager} gameManager
     * @returns {Promise<boolean>}
     */
    async setupProvidersSdk(providers, gameManager)
    {
        if(!this.gameDom){
            Logger.error('Undefined GameDOM on SdkHandler.');
            return false;
        }
        if(!sc.isObject(providers)){
            //Logger.debug('Providers not available.');
            return false;
        }
        let keys = Object.keys(providers);
        if(0 === keys.length){
            //Logger.debug('Providers not found.');
            return false;
        }
        for(let i of keys){
            let provider = providers[i];
            this.appendSdk(provider);
            await this.activateSdkInstance(provider, gameManager);
            Logger.info('Activated Ads SDK: '+provider.key, provider);
        }
    }

    /**
     * @param {Object} provider
     * @returns {HTMLScriptElement|false}
     */
    appendSdk(provider)
    {
        let sdkUrl = sc.get(provider, 'sdkUrl', '');
        if('' === sdkUrl){
            //Logger.debug('Provider does not have an SDK URL.', provider);
            return false;
        }
        if(this.appendedSdkUrls.includes(sdkUrl)){
            return false;
        }
        this.appendedSdkUrls.push(sdkUrl);
        let body = this.gameDom.getElement('body');
        let sdkSource = this.gameDom.createElement('script');
        sdkSource.src = sdkUrl;
        body.append(sdkSource);
        return sdkSource;
    }

    /**
     * @param {Object} provider
     * @param {GameManager} gameManager
     * @returns {Promise<void>}
     */
    async activateSdkInstance(provider, gameManager)
    {
        if(provider.classDefinition){
            provider.service = new provider.classDefinition(provider, gameManager, provider.activeAds);
        }
        if(sc.isFunction(provider.service?.activate)){
            await provider.service.activate();
        }
    }

}

module.exports.SdkHandler = SdkHandler;
