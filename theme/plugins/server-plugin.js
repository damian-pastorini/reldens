/**
 *
 * Reldens - Theme - Server Plugin
 *
 */

const { PluginInterface } = require('reldens/lib/features/plugin-interface');
const { NpcObject } = require('reldens/lib/objects/server/object/type/npc-object');
const { TraderObject } = require('reldens/lib/objects/server/object/type/trader-object');
const { DropObject } = require('reldens/lib/objects/server/object/type/drop-object');
const { Door } = require('./objects/server/door');
const { Healer } = require('./objects/server/healer');
const { QuestNpc } = require('./objects/server/quest-npc');
const { WeaponsMaster } = require('./objects/server/weapons-master');
const { Enemy1 } = require('./objects/server/enemy1');
const { Enemy2 } = require('./objects/server/enemy2');
const { ObjectsConst } = require('reldens/lib/objects/constants');
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
        customClasses.objects['door_1'] = Door;
        customClasses.objects['door_2'] = Door;
        customClasses.objects['npc_1'] = NpcObject;
        customClasses.objects['npc_2'] = Healer;
        customClasses.objects['npc_3'] = TraderObject;
        customClasses.objects['npc_4'] = WeaponsMaster;
        customClasses.objects['npc_5'] = QuestNpc;
        customClasses.objects['enemy_1'] = Enemy1;
        customClasses.objects['enemy_2'] = Enemy2;
        customClasses.objects[ObjectsConst.TYPE_DROP] = DropObject;
    }

}

module.exports.ServerPlugin = ServerPlugin;
