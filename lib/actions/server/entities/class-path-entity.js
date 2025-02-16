/**
 *
 * Reldens - ClassPathEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const {sc} = require("@reldens/utils");

class ClassPathEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'label';
        let properties = {
            id: {},
            key: {
                isRequired: true
            },
            [titleProperty]: {},
            levels_set_id: {
                type: 'reference',
                reference: 'skills_levels_set',
                isRequired: true
            },
            enabled: {
                type: 'boolean',
            },
            created_at: {
                type: 'datetime',
            },
            updated_at: {
                type: 'datetime',
            }
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties = sc.removeFromArray(editProperties, ['id', 'created_at', 'updated_at']);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.ClassPathEntity = ClassPathEntity;
