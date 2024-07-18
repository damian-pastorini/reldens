/**
 *
 * Reldens - AnimationsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class AnimationsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'key';
        let properties = {
            id: {},
            skill_id: {
                type: 'reference',
                reference: 'skills_skill',
                alias: 'skill',
                isRequired: true
            },
            [titleProperty]: {
                isRequired: true
            },
            classKey: {},
            animationData: {
                isRequired: true
            }
        };

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...listProperties];
        listProperties.splice(listProperties.indexOf('animationData'), 1);
        listProperties.splice(listProperties.indexOf('classKey'), 1);
        editProperties.splice(editProperties.indexOf('id'), 1);

        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: showProperties,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.AnimationsEntity = AnimationsEntity;
