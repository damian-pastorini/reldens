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
                isRequired: true,
                isUpload: true
            },
            extra_params: {}
        };

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...showProperties];
        listProperties = sc.removeFromArray(listProperties, ['extra_params']);
        editProperties.splice(editProperties.indexOf('id'), 1);

        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.DropsAnimationsEntity = DropsAnimationsEntity;
