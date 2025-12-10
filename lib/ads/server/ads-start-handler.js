/**
 *
 * Reldens - AdsStartHandler
 *
 * Initializes and loads ad configuration data from the database for client and server use.
 *
 */

const { BaseAd } = require('./ads-type/base-ad');
const { Banner } = require('./ads-type/banner');
const { EventVideo } = require('./ads-type/event-video');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 *
 * @typedef {Object} AdsStartHandlerProps
 * @property {EventsManager} [events] - The events manager instance
 * @property {BaseDataServer} [dataServer] - The data server instance
 * @property {Object} [configProcessor] - The configuration processor instance
 */

class AdsStartHandler
{

    /**
     * @param {AdsStartHandlerProps} props
     * @returns {Promise<void>}
     */
    async initialize(props)
    {
        /** @type {EventsManager|false} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in AdsStartHandler.');
        }
        /** @type {BaseDataServer|false} */
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in AdsStartHandler.');
        }
        /** @type {Object|false} */
        this.configProcessor = sc.get(props, 'configProcessor', false);
        if(!this.configProcessor){
            Logger.error('configProcessor undefined in AdsStartHandler.');
        }
        await this.loadData();
        await this.enrichAds();
    }

    /**
     * @returns {Promise<void>}
     */
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

    /**
     * @returns {Promise<Object<string, Object>>}
     */
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

    /**
     * @returns {Promise<Object<string, Object>>}
     */
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

    /**
     * @returns {Promise<void>}
     */
    async enrichAds()
    {
        for(let ad of this.configProcessor.configList.server.ads.modelsCollection){
            let adInstance = this.instanceByType(ad);
            this.configProcessor.configList.server.ads.collection[ad.id] = adInstance;
            this.configProcessor.configList.client.ads.collection[ad.id] = adInstance.clientData();
        }
    }

    /**
     * @param {Object} ad
     * @returns {BaseAd|Banner|EventVideo}
     */
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
