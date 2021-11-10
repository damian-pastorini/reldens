/**
 *
 * Reldens - ClassPathLevelLabelEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');

class ClassPathLevelLabelEntity extends AdminEntityProperties
{

    static propertiesConfig(extraProps)
    {
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
            label: {
                isTitle: true,
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
            ...extraProps
        };
    }

}

module.exports.ClassPathLevelLabelEntity = ClassPathLevelLabelEntity;
