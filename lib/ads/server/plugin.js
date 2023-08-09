/**
 *
 * Reldens - Ads Server Plugin
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

class AdsPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in AdsPlugin.');
        }
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in AdsPlugin.');
        }
        this.listenEvents();
    }

    listenEvents()
    {
        if(!this.events){
            return false;
        }
        this.events.on('reldens.serverConfigFeaturesReady', async (props) => {
            let providers = await this.dataServer.getEntity('adsProviders').loadAll();
            if(!providers){
                providers = {};
            }
            sc.deepMergeProperties(props.configProcessor, {configList: {client: {ads: {general: {providers}}}}});
        });
    }
}

module.exports.AdsPlugin = AdsPlugin;
