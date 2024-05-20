/**
 *
 * Reldens - DropsAnimations
 *
 */

const { sc } = require('@reldens/utils');

class DropsAnimations
{

    constructor(props)
    {
        this.id = sc.get(props, 'id', 0);
        this.itemId = sc.get(props, 'itemId', 0);
        this.assetType = sc.get(props, 'assetType', 'spritesheet');
        this.assetKey = sc.get(props, 'assetKey', '');
        this.file = sc.get(props, 'file', '');
        this.extraParams = sc.get(props, 'extraParams', {});
    }

    static fromModel(model)
    {
        if(!model){
            return null;
        }
        return new DropsAnimations({
            id: model.id,
            itemId: model.item_id,
            assetType: model.asset_type || 'spritesheet',
            assetKey: model.asset_key,
            file: model.file,
            extraParams: sc.toJson(model.extra_params, {}),
        });
    }

}

module.exports.DropsAnimations = DropsAnimations;
