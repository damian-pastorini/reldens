/**
 *
 * Reldens - Theme - Server Plugin
 *
 */

const { PluginInterface } = require('reldens/lib/features/plugin-interface');
const { Door } = require('./objects/server/door');
const { People } = require('./objects/server/people');
const { Healer } = require('./objects/server/healer');
const { Merchant } = require('./objects/server/merchant');
const { QuestNpc } = require('./objects/server/quest-npc');
const { WeaponsMaster } = require('./objects/server/weapons-master');
const { Enemy1 } = require('./objects/server/enemy1');
const { Enemy2 } = require('./objects/server/enemy2');
const { SceneGravity } = require('./rooms/scene-gravity');
const { sc } = require('@reldens/utils');

class ServerPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = props.events;
        this.events.on('reldens.serverStartBegin', (props) => {
            this.defineCustomClasses(props);
        });
    }

    defineCustomClasses(props)
    {
        let customClasses = props.serverManager.configManager.configList.server.customClasses;
        if (!sc.hasOwn(customClasses, 'objects')) {
            customClasses.objects = {};
        }
        if (!sc.hasOwn(customClasses, 'roomsClass')) {
            customClasses.roomsClass = {};
        }
        customClasses.objects['door_1'] = Door;
        customClasses.objects['door_2'] = Door;
        customClasses.objects['npc_1'] = People;
        customClasses.objects['npc_2'] = Healer;
        customClasses.objects['npc_3'] = Merchant;
        customClasses.objects['npc_4'] = WeaponsMaster;
        customClasses.objects['npc_5'] = QuestNpc;
        customClasses.objects['enemy_1'] = Enemy1;
        customClasses.objects['enemy_2'] = Enemy2;
        customClasses.roomsClass['SceneGravity'] = SceneGravity;
    }

}

module.exports.ServerPlugin = ServerPlugin;
