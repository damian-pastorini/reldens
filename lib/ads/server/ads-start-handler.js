/**
 *
 * Reldens - AdsStartHandler
 *
 */

const { BaseAd } = require('./ads-type/base-ad');
const { Banner } = require('./ads-type/banner');
const { EventVideo } = require('./ads-type/event-video');
const { Logger, sc } = require('@reldens/utils');

class AdsStartHandler
{

    async initialize(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in AdsStartHandler.');
        }
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in AdsStartHandler.');
        }
        this.configProcessor = sc.get(props, 'configProcessor', false);
        if(!this.configProcessor){
            Logger.error('configProcessor undefined in AdsStartHandler.');
        }
        await this.loadData();
        await this.enrichAds();
    }

    async loadData()
    {
        sc.deepMergeProperties(this.configProcessor, {
            configList: {
                client: {
                    ads: {
                        general: {
                            types: await this.mapTypes(),
                            providers: await this.mapProviders(),
                        },
                        collection: {}
                    }
                },
                server: {
                    ads: {
                        modelsCollection: await this.dataServer.getEntity('ads').loadAllWithRelations([
                            'related_ads_providers',
                            'related_ads_types',
                            'related_ads_event_video',
                            'related_ads_banner'
                        ]) || [],
                        collection: {}
                    }
                }
            }
        });
    }

    async mapProviders()
    {
        let providersModels = await this.dataServer.getEntity('adsProviders').loadAll() || [];
        if(!providersModels || 0 === providersModels.length){
            return {};
        }
        let providers = {};
        for(let provider of providersModels){
            providers[provider.key] = provider;
        }
        return providers;
    }

    async mapTypes()
    {
        let typesModels = await this.dataServer.getEntity('adsTypes').loadAll() || [];
        if(!typesModels || 0 === typesModels.length){
            return {};
        }
        let adTypes = {};
        for(let adType of typesModels){
            adTypes[adType.key] = adType;
        }
        return adTypes;
    }

    async enrichAds()
    {
        for(let ad of this.configProcessor.configList.server.ads.modelsCollection){
            let adInstance = this.instanceByType(ad);
            this.configProcessor.configList.server.ads.collection[ad.id] = adInstance;
            this.configProcessor.configList.client.ads.collection[ad.id] = adInstance.clientData();
        }
    }

    instanceByType(ad)
    {
        if(ad.related_ads_event_video){
            return EventVideo.fromModel(ad);
        }
        if(ad.related_ads_banner){
            return Banner.fromModel(ad);
        }
        return BaseAd.fromModel(ad);
    }

}

module.exports.AdsStartHandler = AdsStartHandler;
