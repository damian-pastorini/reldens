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
                            types: await this.dataServer.getEntity('adsTypes').loadAll() || [],
                            providers: await this.dataServer.getEntity('adsProviders').loadAll() || [],
                        },
                        collection: {}
                    }
                },
                server: {
                    ads: {
                        modelsCollection: await this.dataServer.getEntity('ads').loadAllWithRelations([
                            'parent_provider',
                            'parent_type',
                            'parent_event_video',
                            'parent_banner'
                        ]) || [],
                        collection: {}
                    }
                }
            }
        });
    }

    async enrichAds()
    {
        for(let ad of this.configProcessor.configList.server.ads.modelsCollection){
            this.configProcessor.configList.server.ads.collection[ad.id] = this.instanceByType(ad);
        }
    }

    instanceByType(ad)
    {
        if(ad.parent_event_video){
            return new EventVideo(ad);
        }
        if(ad.parent_banner){
            return new Banner(ad);
        }
        return new BaseAd(ad);
    }

}

module.exports.AdsStartHandler = AdsStartHandler;
