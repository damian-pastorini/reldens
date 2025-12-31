/**
 *
 * Reldens - BaseAd
 *
 * Base class for all ad types containing common properties and client data generation.
 *
 */

const { Logger } = require('@reldens/utils');

class BaseAd
{

    /**
     * @param {Object} adsModel
     * @returns {BaseAd}
     */
    static fromModel(adsModel)
    {
        return new this(adsModel);
    }

    /**
     * @param {Object} adsModel
     */
    constructor(adsModel)
    {
        this.setData(adsModel);
    }

    /**
     * @param {Object} adsModel
     * @returns {boolean}
     */
    setData(adsModel)
    {
        if(!adsModel){
            Logger.warning('AdsModel not provided on BaseAd.');
            return false;
        }
        Object.assign(this, {
            id: adsModel.id,
            key: adsModel.key,
            providerId: adsModel.provider_id,
            typeId: adsModel.type_id,
            width: adsModel.width,
            height: adsModel.height,
            position: adsModel.position,
            top: adsModel.top,
            bottom: adsModel.bottom,
            left: adsModel.left,
            right: adsModel.right,
            enabled: adsModel.enabled,
            replay: Boolean(adsModel.replay),
            provider: adsModel?.related_ads_providers || null,
            type: adsModel?.related_ads_types || null
        });
    }

    /**
     * @returns {Object}
     */
    clientData()
    {
        return {
            id: this.id,
            key: this.key,
            type: {
                id: this.typeId,
                key: this.type?.key
            },
            provider: {
                id: this.providerId,
                key: this.provider?.key
            },
            styles: {
                width: this.width,
                height: this.height,
                position: this.position,
                top: this.top,
                bottom: this.bottom,
                left: this.left,
                right: this.right,
            },
            enabled: this.enabled,
            replay: this.replay
        };
    }

}

module.exports.BaseAd = BaseAd;
