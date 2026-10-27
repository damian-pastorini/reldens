/**
 *
 * Reldens - Theme - Server Plugin
 *
 */

const { Healer } = require('./objects/server/healer');
const { QuestNpc } = require('./objects/server/quest-npc');
const { WeaponsMaster } = require('./objects/server/weapons-master');
const { RockObject } = require('./objects/server/rock-object');
const { TreasureChest } = require('./objects/server/treasure-chest');
const { RoomAutoRecovery } = require('./recovery/server/room-auto-recovery');
const { PlayerDeathRelocator } = require('./death/server/player-death-relocator');
const { ResurrectionAdGate } = require('./death/server/resurrection-ad-gate');
const { ItemsGrowthApplier } = require('./items/server/items-growth-applier');
const { ScoresPeriodReset } = require('./scores/server/scores-period-reset');
const { SkinAdTicketGate } = require('./skins/server/skin-ad-ticket-gate');
const { PlayerSkinApplier } = require('./skins/server/player-skin-applier');
const { PluginInterface } = require('reldens/lib/features/plugin-interface');

class ServerPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = props.events;
        this.events.on('reldens.beforeInitializeManagers', (props) => {
            this.defineCustomClasses(props);
            this.createGameplayFeatures(props.serverManager);
        });
        this.events.on('reldens.serverReady', (props) => {
            this.startScoresPeriodReset(props.serverManager);
        });
    }

    defineCustomClasses(props)
    {
        let customClasses = props.serverManager.configManager.configList.server.customClasses;
        if(!customClasses['objects']){
            customClasses.objects = {};
        }
        if(!customClasses['roomsClass']){
            customClasses.roomsClass = {};
        }
        // @TODO - BETA - Clean up all the custom classes, by default these can be all default objects with all the
        //   data coming from the storage. Leave just a custom class as sample like the "Npc1" on the client-plugin.
        customClasses.objects['npc_2'] = Healer;
        customClasses.objects['npc_4'] = WeaponsMaster;
        customClasses.objects['npc_5'] = QuestNpc;
        customClasses.objects['rock_forest_1'] = RockObject;
        customClasses.objects['chest_forest_1'] = TreasureChest;
    }

    createGameplayFeatures(serverManager)
    {
        let config = serverManager.configManager;
        this.roomAutoRecovery = new RoomAutoRecovery({events: this.events});
        this.playerDeathRelocator = new PlayerDeathRelocator({config});
        this.resurrectionAdGate = new ResurrectionAdGate({config});
        this.itemsGrowthApplier = new ItemsGrowthApplier({dataServer: serverManager.dataServer});
        this.skinAdTicketGate = new SkinAdTicketGate({config});
        this.playerSkinApplier = new PlayerSkinApplier();
        this.events.on('reldens.sceneRoomOnCreate', (room) => {
            this.roomAutoRecovery.startRoomTicks(room);
        });
        this.events.on('reldens.onRoomDispose', (event) => {
            this.roomAutoRecovery.stopRoomTicks(event.roomId);
        });
        this.events.on('reldens.playerDeath', (event) => {
            this.playerDeathRelocator.onPlayerDeath(event);
        });
        this.events.on('reldens.beforeSceneExecuteMessages', async (event) => {
            this.resurrectionAdGate.onBeforeSceneExecuteMessages(event);
            await this.skinAdTicketGate.onBeforeSceneExecuteMessages(event);
        });
        this.events.on('reldens.beforeGiveAdRewardItem', async (event) => {
            await this.skinAdTicketGate.onBeforeGiveAdRewardItem(event);
        });
        this.events.on('reldens.createPlayerInventoryAfter', async (event) => {
            await this.itemsGrowthApplier.onCreatePlayerInventoryAfter(event);
            this.playerSkinApplier.onCreatePlayerInventoryAfter(event);
        });
    }

    startScoresPeriodReset(serverManager)
    {
        this.scoresPeriodReset = new ScoresPeriodReset({
            config: serverManager.configManager,
            dataServer: serverManager.dataServer,
            roomsManager: serverManager.roomsManager
        });
        this.scoresPeriodReset.start();
    }

}

module.exports.ServerPlugin = ServerPlugin;
