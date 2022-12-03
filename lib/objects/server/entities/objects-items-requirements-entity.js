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
            required_qty: {
                type: 'number',
                isRequired: true
            },
            auto_remove_requirement: {
                type: 'boolean'
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

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

module.exports.ObjectsItemsRequirementsEntity = ObjectsItemsRequirementsEntity;
