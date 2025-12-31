/**
 *
 * Reldens - DropsAnimationsModel
 *
 */

class DropsAnimationsModel
{

    constructor(id, item_id, asset_type, asset_key, file, extra_params)
    {
        this.id = id;
        this.item_id = item_id;
        this.asset_type = asset_type;
        this.asset_key = asset_key;
        this.file = file;
        this.extra_params = extra_params;
    }

    static get tableName()
    {
        return 'drops_animations';
    }
    

    static get relationTypes()
    {
        return {
            items_item: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_items_item': 'items_item'
        };
    }
}

module.exports.DropsAnimationsModel = DropsAnimationsModel;
