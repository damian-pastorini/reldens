/**
 *
 * Reldens - BaseAd
 *
 */

const { Logger } = require('@reldens/utils');

class BaseAd
{

    static fromModel(adsModel)
    {
        return new this(adsModel);
    }

    constructor(adsModel)
    {
        this.setData(adsModel);
    }

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
            typeId: adsModel.ads_type,
            width: adsModel.width,
            height: adsModel.height,
            position: {
                top: adsModel.position_top,
                down: adsModel.position_down,
                left: adsModel.position_left,
                right: adsModel.position_right,
            },
            enabled: adsModel.enabled,
            provider: adsModel.parent_provider,
            type: adsModel.parent_type
        });
    }

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
            width: this.width,
            height: this.height,
            position: {
                top: this.position.top,
                down: this.position.down,
                left: this.position.left,
                right: this.position.right,
            },
            enabled: this.enabled
        };
    }

}

module.exports.BaseAd = BaseAd;
