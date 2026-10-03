/**
 *
 * Reldens - QuestsProgressEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class QuestsProgressEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                isId: true,
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            player_id: {
                type: 'number',
                dbType: 'int'
            },
            quest_key: {
                isRequired: true,
                dbType: 'varchar'
            },
            customData: {
                type: 'textarea',
                dbType: 'text'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = [...propertiesKeys];
        listProperties.splice(listProperties.indexOf('customData'), 1);
        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.QuestsProgressEntity = QuestsProgressEntity;
