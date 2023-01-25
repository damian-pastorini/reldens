const { sc } = require('@reldens/utils');

class ObjectsItemsRewardsAnimations
{
    id = 0;
    rewardId = 0;
    assetType = '';
    assetKey = '';
    file = '';
    extraParams = null;

    constructor(props)
    {
        this.id = props.id;
        this.rewardId = props.rewardId;
        this.assetType = props.assetType;
        this.assetKey = props.assetKey;
        this.file = props.file;
        this.extraParams = props.extraParams;
    }

    static fromModel(model)
    {
        if (!model) {
            return null;
        }
        return new ObjectsItemsRewardsAnimations({
            'id': model.id,
            'rewardId': model.reward_id,
            'assetType': model.asset_type,
            'assetKey': model.asset_key,
            'file': model.file,
            'extraParams': sc.toJson(model.extra_params),
        });
    }
}

module.exports.ObjectsItemsRewardsAnimations = ObjectsItemsRewardsAnimations;