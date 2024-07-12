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
                alias: 'class_path',
                isRequired: true
            },
            level_id: {
                type: 'reference',
                reference: 'skills_levels',
                alias: 'label_level',
                isRequired: true
            },
            [titleProperty]: {
                isRequired: true
            },
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
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.ClassPathLevelLabelEntity = ClassPathLevelLabelEntity;
