/**
 *
 * Reldens - FeaturesClient
 *
 * This class will handle the features activation on the client side depending on the configuration received from the
 * server.
 *
 */

const { ConfiguredFeatures } = require('./config-client');
const share = require('../utils/constants');

class FeaturesClient
{

    constructor()
    {
        this.featuresCodeList = [];
        this.featuresList = {};
    }

    loadFeatures(featuresCodeList)
    {
        this.featuresCodeList = featuresCodeList;
        for(let idx in featuresCodeList){
            let featureCode = featuresCodeList[idx];
            if(ConfiguredFeatures.hasOwnProperty(featureCode)){
                this.featuresList[featureCode] = ConfiguredFeatures[featureCode];
            }
        }
        return this.featuresList;
    }

    attachOnMessageObserversToRoom(roomEvents)
    {
        for(let idx in this.featuresList){
            let feature = this.featuresList[idx];
            if(feature.hasOwnProperty('joinedRoomsOnMessage')){
                let attachIndex = false;
                if(feature.joinedRoomsOnMessage.hasOwnProperty(roomEvents.roomName)){
                    attachIndex = roomEvents.roomName;
                }
                if(feature.joinedRoomsOnMessage.hasOwnProperty(share.ROOM_EVENTS)){
                    attachIndex = share.ROOM_EVENTS;
                }
                if(attachIndex){
                    roomEvents.room.onMessage((message) => {
                        feature.messageObserver = new feature.joinedRoomsOnMessage[attachIndex]();
                        feature.messageObserver.observeMessage(message, roomEvents.gameManager);
                    });
                }
            }
        }
    }

    preloadAssets(preloadScene)
    {
        for(let idx in this.featuresList){
            let feature = this.featuresList[idx];
            if(feature.hasOwnProperty('preloadAssets')){
                for(let asset of feature.preloadAssets){
                    // @TODO: improve to load any type.
                    if(asset.type === share.PRELOAD_HTML){
                        preloadScene.load.html(asset.name, asset.path);
                    }
                    if(asset.type === share.PRELOAD_IMAGE){
                        preloadScene.load.image(asset.name, asset.path);
                    }
                    if(asset.type === share.PRELOAD_SPRITESHEET){
                        preloadScene.load.spritesheet(asset.name, asset.path, asset.data);
                    }
                }
            }
        }
    }

    createFeaturesUi(uiScene)
    {
        for(let idx in this.featuresList){
            let feature = this.featuresList[idx];
            if(feature.hasOwnProperty('uiCreate')){
                uiScene[feature.name+'UiCreate'] = new feature.uiCreate(uiScene);
                uiScene[feature.name+'UiCreate'].createUi();
            }
        }
    }

}

module.exports = FeaturesClient;
