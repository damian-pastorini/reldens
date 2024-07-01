/**
 *
 * Reldens - ClanLevelsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class ClanLevelsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            key: {
                type: 'number',
                isRequired: true
            },
            label: {
                isRequired: true
            },
            required_experience: {
                type: 'number',
                isRequired: true
            }
        };

        let showPropertiesKeys = Object.keys(properties);
        let listPropertiesKeys = [...showPropertiesKeys];
        let editPropertiesKeys = [...listPropertiesKeys];
        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: showPropertiesKeys,
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            ...extraProps
        };
    }

}

module.exports.ClanLevelsEntity = ClanLevelsEntity;
