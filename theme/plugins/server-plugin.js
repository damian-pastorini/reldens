/**
 *
 * Reldens - Theme - Server Plugin
 *
 */

const { Healer } = require('./objects/server/healer');
const { QuestNpc } = require('./objects/server/quest-npc');
const { WeaponsMaster } = require('./objects/server/weapons-master');
const { PluginInterface } = require('reldens/lib/features/plugin-interface');
const { sc } = require('@reldens/utils');

class ServerPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = props.events;
        this.events.on('reldens.createAppServer', (props) => {
            this.defineCustomClasses(props);
        });
    }

    defineCustomClasses(props)
    {
        let customClasses = props.serverManager.configManager.configList.server.customClasses;
        if(!sc.hasOwn(customClasses, 'objects')){
            customClasses.objects = {};
        }
        if(!sc.hasOwn(customClasses, 'roomsClass')){
            customClasses.roomsClass = {};
        }
        // @TODO - BETA - Clean up all the custom classes, by default these can be all default objects with all the
        //   data coming from the storage. Leave just a custom class as sample like the "Npc1" on the client-plugin.
        customClasses.objects['npc_2'] = Healer;
        customClasses.objects['npc_4'] = WeaponsMaster;
        customClasses.objects['npc_5'] = QuestNpc;
    }

}

module.exports.ServerPlugin = ServerPlugin;
