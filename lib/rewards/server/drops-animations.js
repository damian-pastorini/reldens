/**
 *
 * Reldens - DropsAnimations
 *
 * Represents animation data for dropped items in the game world, including sprite sheets and asset information.
 *
 */

const { sc } = require('@reldens/utils');

/**
 * @typedef {Object} DropsAnimationsProps
 * @property {number} id
 * @property {number} itemId
 * @property {string} assetType
 * @property {string} assetKey
 * @property {string} file
 * @property {object} extraParams
 */
class DropsAnimations
{

    /**
     * @param {DropsAnimationsProps} props
     */
    constructor(props)
    {
        /** @type {number} */
        this.id = sc.get(props, 'id', 0);
        /** @type {number} */
        this.itemId = sc.get(props, 'itemId', 0);
        /** @type {string} */
        this.assetType = sc.get(props, 'assetType', 'spritesheet');
        /** @type {string} */
        this.assetKey = sc.get(props, 'assetKey', '');
        /** @type {string} */
        this.file = sc.get(props, 'file', '');
        /** @type {object} */
        this.extraParams = sc.get(props, 'extraParams', {});
    }

    /**
     * @param {Object} model
     * @returns {DropsAnimations|null}
     */
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
