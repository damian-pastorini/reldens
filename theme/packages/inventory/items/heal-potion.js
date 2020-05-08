const { ItemUsable, Modifier, ItemsConst } = require('@reldens/items-system');

class HealPotion extends ItemUsable
{

    constructor(props)
    {
        super(props);
        this.singleInstance = true;
        this.removeAfterUse = true;
        let modProps = {
            key: 'heal_potion_20',
            propertyKey: 'stats/hp',
            operation: ItemsConst.OPS.INC,
            value: {}.hasOwnProperty.call(props, 'value') ? props.value : 20
        };
        this.modifiers = {
            healHp20: new Modifier(modProps)
        };
    }

}

module.exports.HealPotion = HealPotion;
