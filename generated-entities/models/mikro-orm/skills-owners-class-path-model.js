/**
 *
 * Reldens - SkillsOwnersClassPathModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class SkillsOwnersClassPathModel
{

    constructor(id, class_path_id, owner_id, currentLevel, currentExp)
    {
        this.id = id;
        this.class_path_id = class_path_id;
        this.owner_id = owner_id;
        this.currentLevel = currentLevel;
        this.currentExp = currentExp;
    }

    static createByProps(props)
    {
        const {id, class_path_id, owner_id, currentLevel, currentExp} = props;
        return new this(id, class_path_id, owner_id, currentLevel, currentExp);
    }
    
}

const schema = new EntitySchema({
    class: SkillsOwnersClassPathModel,
    tableName: 'skills_owners_class_path',
    properties: {
        id: { type: 'number', primary: true },
        class_path_id: { type: 'number', persist: false },
        owner_id: { type: 'number', persist: false },
        currentLevel: { type: 'number', nullable: true },
        currentExp: { type: 'number', nullable: true },
        related_skills_class_path: {
            kind: 'm:1',
            entity: 'SkillsClassPathModel',
            joinColumn: 'class_path_id'
        },
        related_players: {
            kind: 'm:1',
            entity: 'PlayersModel',
            joinColumn: 'owner_id'
        }
    },
});
schema._fkMappings = {
    "class_path_id": {
        "relationKey": "related_skills_class_path",
        "entityName": "SkillsClassPathModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "owner_id": {
        "relationKey": "related_players",
        "entityName": "PlayersModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    SkillsOwnersClassPathModel,
    entity: SkillsOwnersClassPathModel,
    schema: schema
};
