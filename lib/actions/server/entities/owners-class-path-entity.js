/**
 *
 * Reldens - OwnersClassPathEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class OwnersClassPathEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            class_path_id: {
                type: 'reference',
                reference: 'skills_class_path',
                isRequired: true,
                alias: 'class_path_owner'
            },
            owner_id: {
                type: 'reference',
                reference: 'players',
                isRequired: true
            },
            currentLevel: {
                type: 'number',
                isRequired: true
            },
            currentExp: {
                type: 'number',
                isRequired: true
            }
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
            ...extraProps,
            navigationPosition: 990,
        };
    }

}

module.exports.OwnersClassPathEntity = OwnersClassPathEntity;
