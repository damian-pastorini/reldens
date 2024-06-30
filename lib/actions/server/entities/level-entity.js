/**
 *
 * Reldens - LevelEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class LevelEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'label';
        let properties = {
            id: {},
            key: {
                isRequired: true
            },
            [titleProperty]: {
                isRequired: true
            },
            required_experience: {
                type: 'number',
                isRequired: true
            },
            levels_set_id: {
                type: 'reference',
                reference: 'skills_levels_set',
                isRequired: true
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

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

module.exports.LevelEntity = LevelEntity;
