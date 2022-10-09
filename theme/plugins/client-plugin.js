/**
 *
 * Reldens - Theme - Client Plugin
 *
 */

const { PluginInterface } = require('reldens/lib/features/plugin-interface');
const { Npc1 } = require('./objects/client/npc1');
const { sc } = require('@reldens/utils');
const { PhaserDriver } = require('reldens/lib/game/client/engine/phaser-driver')

class ClientPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = props.events;
        this.events.on('reldens.beforeJoinGame', (props) => {
            this.defineCustomClasses(props);
        });
        this.events.on('reldens.beforeCreateEngine', (props) => {
            this.defineEngineDriver(props);
        })
    }

    defineCustomClasses(props)
    {
        let customClasses = props.gameManager.config.client.customClasses;
        if (!sc.hasOwn(customClasses, 'objects')) {
            customClasses.objects = {};
        }
        customClasses.objects['people_town_1'] = Npc1;
    }

    defineEngineDriver(props)
    {
        if ('phaser' === props.gameConfig.engine) {
            props.gameConfig.client['engineDriver'] = new PhaserDriver();
        }
    }
}

module.exports.ClientPlugin = ClientPlugin;
