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
const { SceneWeatherEffectsCreator } = require('./effects/client/scene-weather-effects-creator');
const { SkinsSpritesPreloader } = require('./skins/client/skins-sprites-preloader');
const { SkinAdMessagesListener } = require('./skins/client/skin-ad-messages-listener');
const { PlayersSkinSwitcher } = require('./skins/client/players-skin-switcher');

class ClientPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = props.events;
        this.sceneWeatherEffectsCreator = new SceneWeatherEffectsCreator();
        this.skinsSpritesPreloader = new SkinsSpritesPreloader({gameManager: props.gameManager});
        this.skinAdMessagesListener = new SkinAdMessagesListener({events: props.events});
        this.playersSkinSwitcher = new PlayersSkinSwitcher({gameManager: props.gameManager});
        this.events.on('reldens.beforeJoinGame', (props) => {
            this.defineCustomClasses(props);
        });
        this.events.on('reldens.beforePreload', (scenePreloader) => {
            this.sceneWeatherEffectsCreator.cloudsEffect.preloadTexture(scenePreloader);
        });
        this.events.on('reldens.afterSceneDynamicCreate', (sceneDynamic) => {
            this.sceneWeatherEffectsCreator.createForScene(sceneDynamic);
        });
        this.events.on('reldens.createdMinimap', (minimap) => {
            this.sceneWeatherEffectsCreator.hideFromMinimap(minimap);
        });
        this.listenSkinsEvents();
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

    listenSkinsEvents()
    {
        this.events.on('reldens.preloadUiScene', (uiScene) => {
            this.skinsSpritesPreloader.preloadSkins(uiScene);
        });
        this.events.on('reldens.createPreload', (preloadScene) => {
            this.skinsSpritesPreloader.createSkinsAnimations(preloadScene);
        });
        this.events.on('reldens.joinedRoom', (room) => {
            this.skinAdMessagesListener.listenRoomMessages(room);
        });
        this.events.on('reldens.playersOnAdd', (player, playerKey, previousScene, roomEvents) => {
            this.playersSkinSwitcher.listenPlayerSkin(player, playerKey, roomEvents);
        });
        this.events.on('reldens.playerEngineAddPlayer', (playerEngine, playerKey) => {
            this.playersSkinSwitcher.syncAddedPlayer(playerEngine, playerKey);
        });
    }

}

module.exports.ClientPlugin = ClientPlugin;
