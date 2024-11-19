/**
 *
 * Reldens - SdkHandler
 *
 */

const { Logger, sc } = require('@reldens/utils');

class SdkHandler
{

    constructor(props)
    {
        this.gameDom = sc.get(props, 'gameDom', false);
    }

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
            await this.appendSdk(provider);
            await this.activateSdkInstance(provider, gameManager);
            Logger.info('Activated Ads SDK: '+provider.key, provider);
        }
    }

    async appendSdk(provider)
    {
        let sdkUrl = sc.get(provider, 'sdkUrl', '');
        if('' === sdkUrl){
            //Logger.debug('Provider does not have an SDK URL.', provider);
            return false;
        }
        let body = this.gameDom.getElement('body');
        let sdkSource = this.gameDom.createElement('script');
        sdkSource.src = sdkUrl;
        body.append(sdkSource);
        return true;
    }

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
