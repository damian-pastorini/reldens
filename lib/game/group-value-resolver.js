/**
 *
 * Reldens - GroupValueResolver
 *
 * Resolves the value an item is grouped by: the requested field, falling back to the item key. Shared by the
 * server scene data optimizer (which splits identical properties into defaults) and the client defaults merger
 * (which restores them), so both sides group and restore by the exact same value.
 *
 */

const { sc } = require('@reldens/utils');

class GroupValueResolver
{

    /**
     * @param {Object} item
     * @param {string} field
     * @returns {string}
     */
    static resolve(item, field)
    {
        let groupValue = sc.get(item, field, '');
        if('' === groupValue){
            groupValue = sc.get(item, 'key', '');
        }
        return groupValue;
    }

}

module.exports.GroupValueResolver = GroupValueResolver;
