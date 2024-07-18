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

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...showProperties];
        listProperties.splice(listProperties.indexOf('animationData'), 1);
        editProperties.splice(editProperties.indexOf('id'), 1);

        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.ObjectsAnimationsEntity = ObjectsAnimationsEntity;
