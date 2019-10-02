/**
 *
 * Reldens - FeaturesClient
 * This class will handle the features activation on the client side depending on the configuration received from the
 * server.
 *
 */

const configuredFeatures = require('../../config/features-client');
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
            if(configuredFeatures.hasOwnProperty(featureCode)){
                this.featuresList[featureCode] = configuredFeatures[featureCode];
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

}

module.exports = FeaturesClient;
