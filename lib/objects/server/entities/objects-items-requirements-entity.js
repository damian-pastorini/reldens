/**
 *
 * Reldens - ObjectsItemsRequirementsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class ObjectsItemsRequirementsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            object_id: {
                type: 'reference',
                reference: 'objects',
                isRequired: true
            },
            item_key: {
                isRequired: true
            },
            required_item_key: {
                isRequired: true
            },
            required_quantity: {
                type: 'number',
                isRequired: true
            },
            auto_remove_requirement: {
                type: 'boolean'
            }
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties.splice(editProperties.indexOf('id'), 1);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.ObjectsItemsRequirementsEntity = ObjectsItemsRequirementsEntity;
