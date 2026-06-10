/**
 *
 * Reldens - RoomCustomData
 *
 * Parses the rooms.customData column (which may arrive as a JSON string from the DB or as
 * an already-parsed object depending on the storage driver) and provides typed reads /
 * writes plus a JSON-string serializer for persisting back.
 *
 */

const { sc } = require('@reldens/utils');

class RoomCustomData
{

    /**
     * @param {string|Object} rawCustomData
     */
    constructor(rawCustomData)
    {
        /** @type {Object} */
        this.parsed = this.parse(rawCustomData);
    }

    /**
     * @param {string|Object} rawCustomData
     * @returns {Object}
     */
    parse(rawCustomData)
    {
        if(!rawCustomData){
            return {};
        }
        if(sc.isObject(rawCustomData)){
            return rawCustomData;
        }
        return sc.toJson(rawCustomData, {});
    }

    /**
     * @param {string} field
     * @param {*} defaultValue
     * @returns {*}
     */
    get(field, defaultValue)
    {
        return sc.get(this.parsed, field, defaultValue);
    }

    /**
     * @param {string} field
     * @param {*} value
     */
    set(field, value)
    {
        this.parsed[field] = value;
    }

    /**
     * @returns {string}
     */
    toJsonString()
    {
        return sc.toJsonString(this.parsed);
    }
}

module.exports.RoomCustomData = RoomCustomData;
