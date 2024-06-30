/**
 *
 * Reldens - AdsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

class AdsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'key';
        let properties = {
            id: {},
            [titleProperty]: {
                isRequired: true
            },
            provider_id: {
                type: 'reference',
                reference: 'ads_providers',
                isRequired: true
            },
            ads_type: {
                type: 'reference',
                reference: 'ads_types',
                isRequired: true
            },
            width: {
                isRequired: true,
                type: 'number'
            },
            height: {
                isRequired: true,
                type: 'number'
            },
            position_top: {
                type: 'number'
            },
            position_bottom: {
                type: 'number'
            },
            position_left: {
                type: 'number'
            },
            position_right: {
                type: 'number'
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys = sc.removeFromArray(listPropertiesKeys, [
            'position_top',
            'position_bottom',
            'position_left',
            'position_right'
        ]);
        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.AdsEntity = AdsEntity;
