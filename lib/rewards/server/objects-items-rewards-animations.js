/**
 *
 * Reldens - ObjectsItemsRewardsAnimations
 *
 */

const { sc } = require('@reldens/utils');

class ObjectsItemsRewardsAnimations
{

    constructor(props)
    {
        this.id = sc.get(props, 'id', 0);
        this.rewardId = sc.get(props, 'rewardId', 0);
        this.assetType = sc.get(props, 'assetType', '');
        this.assetKey = sc.get(props, 'assetKey', '');
        this.file = sc.get(props, 'file', '');
        this.extraParams = sc.get(props, 'extraParams', {});
    }

    static fromModel(model)
    {
        if(!model){
            return null;
        }
        return new ObjectsItemsRewardsAnimations({
            id: model.id,
            rewardId: model.reward_id,
            assetType: model.asset_type,
            assetKey: model.asset_key,
            file: model.file,
            extraParams: sc.toJson(model.extra_params, {}),
        });
    }

}

module.exports.ObjectsItemsRewardsAnimations = ObjectsItemsRewardsAnimations;
