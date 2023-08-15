/**
 *
 * Reldens - Ads Server Plugin
 *
 */

const { AdsStartHandler } = require('./ads-start-handler');
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
        this.adsStartHandler = new AdsStartHandler();
        this.listenEvents();
    }

    listenEvents()
    {
        if(!this.events || !this.dataServer){
            return false;
        }
        this.events.on('reldens.serverConfigFeaturesReady', async (props) => {
            await this.adsStartHandler.initialize({
                events: this.events,
                dataServer: this.dataServer,
                configProcessor: props.configProcessor
            });
        });
    }
}

module.exports.AdsPlugin = AdsPlugin;
