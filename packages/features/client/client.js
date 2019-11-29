/**
 *
 * Reldens - FeaturesClient
 *
 * This class will handle the features activation on the client side depending on the configuration received from the
 * server.
 *
 */

const { ClientCoreFeatures } = require('./config-client');
const { GameConst } = require('../../game/constants');

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
            if({}.hasOwnProperty.call(ClientCoreFeatures, featureCode)){
                this.featuresList[featureCode] = ClientCoreFeatures[featureCode];
            }
        }
        return this.featuresList;
    }

    attachOnMessageObserversToRoom(roomEvents)
    {
        Object.keys(this.featuresList)
            .filter(idx => this.featuresList[idx].joinedRoomsOnMessage)
            .forEach((featureIdx) => {
                let feature = this.featuresList[featureIdx];
                let attachIndex = false;
                if({}.hasOwnProperty.call(feature.joinedRoomsOnMessage, roomEvents.roomName)){
                    attachIndex = roomEvents.roomName;
                }
                if({}.hasOwnProperty.call(feature.joinedRoomsOnMessage, GameConst.ROOM_EVENTS)){
                    attachIndex = GameConst.ROOM_EVENTS;
                }
                if(attachIndex){
                    roomEvents.room.onMessage((message) => {
                        feature.messageObserver = new feature.joinedRoomsOnMessage[attachIndex]();
                        feature.messageObserver.observeMessage(message, roomEvents.gameManager);
                    });
                }
            });
    }

    preloadAssets(preloadScene)
    {
        Object.keys(this.featuresList)
            .filter(idx => this.featuresList[idx].preloadAssets)
            .forEach((featureIdx) => {
                let feature = this.featuresList[featureIdx];
                for(let asset of feature.preloadAssets){
                    // @TODO: replace by events! that way each feature will just load the required assets using the
                    //   load method directly.
                    if(asset.assetType === GameConst.PRELOAD_HTML){
                        preloadScene.load.html(asset.name, asset.path);
                    }
                    if(asset.assetType === GameConst.PRELOAD_IMAGE){
                        preloadScene.load.image(asset.name, asset.path);
                    }
                    if(asset.assetType === GameConst.PRELOAD_SPRITESHEET){
                        preloadScene.load.spritesheet(asset.name, asset.path, asset.data);
                    }
                }
            });
    }

    createFeaturesUi(uiScene)
    {
        Object.keys(this.featuresList)
            .filter(idx => this.featuresList[idx].uiCreate)
            .forEach((featureIdx) => {
                let feature = this.featuresList[featureIdx];
                uiScene[feature.name+'UiCreate'] = new feature.uiCreate(uiScene);
                uiScene[feature.name+'UiCreate'].createUi();
            });
    }

}

module.exports.FeaturesClient = FeaturesClient;
