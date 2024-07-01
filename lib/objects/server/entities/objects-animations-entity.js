/**
 *
 * Reldens - ObjectsAnimationsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class ObjectsAnimationsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'animationKey';
        let properties = {
            id: {},
            object_id: {
                type: 'reference',
                reference: 'objects',
                isRequired: true
            },
            [titleProperty]: {
                isRequired: true
            },
            animationData: {
                isRequired: true
            }
        };

        let showPropertiesKeys = Object.keys(properties);
        let listPropertiesKeys = [...showPropertiesKeys];
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys.splice(listPropertiesKeys.indexOf('animationData'), 1);
        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: showPropertiesKeys,
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.ObjectsAnimationsEntity = ObjectsAnimationsEntity;
