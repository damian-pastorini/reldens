/**
 *
 * Reldens - ClassLevelUpAnimationsModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class ClassLevelUpAnimationsModel
{

    beforeDestroyCalled = 0;
    afterDestroyCalled = 0;

    constructor(class_path, level_id, animationData)
    {
        this.class_path = class_path;
        this.level_id = level_id;
        this.animationData = animationData;
    }

    static createByProps(props)
    {
        const {class_path, level_id, animationData} = props;
        return new this(class_path, level_id, animationData);
    }

    static relationMappings()
    {
        return {
            class_path: {
                type: 'ClassPathModel',
                entityName: 'classPath',
                relation: 'm:1',
                join: {
                    from: 'class_path_id',
                    to: 'id'
                }
            },
            level: {
                type: 'LevelModel',
                entityName: 'level',
                relation: 'm:1',
                join: {
                    from: 'level_id',
                    to: 'id'
                }
            }
        };
    }

}

const schema = new EntitySchema({
    class: ClassLevelUpAnimationsModel,
    properties: {
        id: {
            primary: true,
            type: 'ObjectID'
        },
        class_path: {
            reference: 'm:1',
            mappedBy: 'id',
            type: 'ClassPath'
        },
        level_id: {
            reference: 'm:1',
            mappedBy: 'id',
            type: 'Level'
        },
        animationData: {
            type: 'string'
        },
    },
});

module.exports = {
    ClassLevelUpAnimationsModel,
    entity: ClassLevelUpAnimationsModel,
    schema: schema
};
