/**
 *
 * Reldens - ClanLevelsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class ClanLevelsModel
{

    constructor(id, key, label, required_experience)
    {
        this.id = id;
        this.key = key;
        this.label = label;
        this.required_experience = required_experience;
    }

    static createByProps(props)
    {
        const {id, key, label, required_experience} = props;
        return new this(id, key, label, required_experience);
    }
    
}

const schema = new EntitySchema({
    class: ClanLevelsModel,
    tableName: 'clan_levels',
    properties: {
        id: { type: 'number', primary: true },
        key: { type: 'number' },
        label: { type: 'string' },
        required_experience: { type: 'number', nullable: true },
        related_clan: {
            kind: '1:m',
            entity: 'ClanModel',
            mappedBy: 'related_clan_levels'
        },
        related_clan_levels_modifiers: {
            kind: '1:m',
            entity: 'ClanLevelsModifiersModel',
            mappedBy: 'related_clan_levels'
        }
    },
});

module.exports = {
    ClanLevelsModel,
    entity: ClanLevelsModel,
    schema: schema
};
