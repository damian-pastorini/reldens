/**
 *
 * Reldens - ObjectsAnimationsEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');

class ObjectsAnimationsEntity extends AdminEntityProperties
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
            animationKey: {
                isTitle: true,
                isRequired: true
            },
            animationData: {
                isRequired: true
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys.splice(listPropertiesKeys.indexOf('animationData'), 1);
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

module.exports.ObjectsAnimationsEntity = ObjectsAnimationsEntity;
