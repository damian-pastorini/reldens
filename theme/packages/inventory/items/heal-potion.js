/**
 *
 * Reldens - Npc1
 *
 * Custom animation object sample.
 *
 */
const { ItemSingleUsable } = require('@reldens/items-system');

class HealPotion extends ItemSingleUsable
{

    constructor(props)
    {
        super(props);
        this.removeAfterUse = true;
        // @NOTE: we can use the same object and setup the animation data here since we never execute / use this item,
        // though the item instance is created on the client, it's never executed so we can call this data when we get
        // the item confirmation that was executed on the server.
        this.animationData = {
            frameWidth: 64,
            frameHeight: 64,
            start: 6,
            end: 11,
            repeat: 0,
            hide: true,
            destroyOnComplete: true,
            usePlayerPosition: true,
            closeInventoryOnUse: true,
            followPlayer: true,
            startsOnTarget: true
        };
    }

}

module.exports.HealPotion = HealPotion;
