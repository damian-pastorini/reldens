/**
 *
 * Reldens - ClassPathLevelLabelEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class ClassPathLevelLabelEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'label';
        let properties = {
            id: {},
            class_path_id: {
                type: 'reference',
                reference: 'skills_class_path',
                isRequired: true
            },
            level_id: {
                type: 'reference',
                reference: 'skills_levels',
                isRequired: true
            },
            [titleProperty]: {
                isRequired: true
            },
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

module.exports.ClassPathLevelLabelEntity = ClassPathLevelLabelEntity;
