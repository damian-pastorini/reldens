/**
 *
 * Reldens - AnimationsEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');

class AnimationsEntity extends AdminEntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            skill_id: {
                type: 'reference',
                reference: 'skills_skill'
            },
            key: {
                isTitle: true
            },
            classKey: {},
            animationData: {}
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys.splice(listPropertiesKeys.indexOf('animationData'), 1);
        listPropertiesKeys.splice(listPropertiesKeys.indexOf('classKey'), 1);
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

module.exports.AnimationsEntity = AnimationsEntity;
