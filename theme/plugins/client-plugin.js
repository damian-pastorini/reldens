/**
 *
 * Reldens - Theme - Client Plugin
 *
 */

const { PluginInterface } = require('reldens/lib/features/plugin-interface');
const { Npc1 } = require('./objects/client/npc1');
const { Rock } = require('./objects/client/rock');
const { FishSpawn } = require('./objects/client/fish-spawn');
const { TreasureChestClient } = require('./objects/client/treasure-chest');

class ClientPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = props.events;
        this.events.on('reldens.beforeJoinGame', (props) => {
            this.defineCustomClasses(props);
        });
    }

    defineCustomClasses(props)
    {
        // example on how to define a custom class with a plugin:
        let customClasses = props.gameManager.config.client.customClasses;
        if(!customClasses['objects']){
            customClasses.objects = {};
        }
        customClasses.objects['people_town_1'] = Npc1;
        customClasses.objects['rock_forest_1'] = Rock;
        customClasses.objects['fish_spawn_forest_1'] = FishSpawn;
        customClasses.objects['chest_forest_1'] = TreasureChestClient;
    }

}

module.exports.ClientPlugin = ClientPlugin;
