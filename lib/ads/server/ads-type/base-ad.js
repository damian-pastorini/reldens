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
            typeId: adsModel.type_id,
            width: adsModel.width,
            height: adsModel.height,
            position: adsModel.position,
            top: adsModel.top,
            bottom: adsModel.bottom,
            left: adsModel.left,
            right: adsModel.right,
            enabled: adsModel.enabled,
            provider: adsModel?.parent_provider || null,
            type: adsModel?.parent_type || null
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
            styles: {
                width: this.width,
                height: this.height,
                position: this.position,
                top: this.top,
                bottom: this.bottom,
                left: this.left,
                right: this.right,
            },
            enabled: this.enabled
        };
    }

}

module.exports.BaseAd = BaseAd;
