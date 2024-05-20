/**
 *
 * Reldens - DropsAnimationsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

class DropsAnimationsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                isId: true
            },
            reward_id: {
                type: 'reference',
                reference: 'rewards',
                isRequired: true
            },
            asset_type: {
                isRequired: true
            },
            asset_key: {
                isRequired: true
            },
            file: {
                isRequired: true
            },
            extra_params: {}
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys = sc.removeFromArray(listPropertiesKeys, [
            'file',
            'extra_params'
        ]);
        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return Object.assign({
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties
        }, extraProps);
    }

}

module.exports.DropsAnimationsEntity = DropsAnimationsEntity;
