/**
 *
 * Reldens - RoomImportData
 *
 * Parses the optional "roomData" property from the import data and applies it over the room fields
 * created by the importer. Properties can be declared for every imported room with "allRooms" and per
 * map with "rooms" (keyed by map name or map title), where the per map properties win. The rooms
 * primitive fields are assigned directly while "customData" keys are set through RoomCustomData so the
 * column keeps a valid JSON string.
 *
 */

const { Logger, sc } = require('@reldens/utils');

class RoomImportData
{

    /**
     * @param {string|Object} rawRoomData
     */
    constructor(rawRoomData)
    {
        /** @type {Object} */
        this.parsed = this.parse(rawRoomData);
        /** @type {Array<string>} */
        this.assignableFields = ['name', 'title', 'map_filename', 'scene_images', 'room_class_key', 'server_url'];
        /** @type {string} */
        this.customDataField = 'customData';
    }

    /**
     * @param {string|Object} rawRoomData
     * @returns {Object}
     */
    parse(rawRoomData)
    {
        if(!rawRoomData){
            return {};
        }
        if(sc.isObject(rawRoomData)){
            return rawRoomData;
        }
        return sc.toJson(rawRoomData, {});
    }

    /**
     * @param {Object} roomCreateData
     * @param {RoomCustomData} roomCustomData
     * @param {string} mapName
     * @param {string} mapTitle
     */
    applyTo(roomCreateData, roomCustomData, mapName, mapTitle)
    {
        this.applyProperties(roomCreateData, roomCustomData, sc.get(this.parsed, 'allRooms', {}));
        this.applyProperties(roomCreateData, roomCustomData, this.fetchMapProperties(mapName, mapTitle));
        roomCreateData[this.customDataField] = roomCustomData.toJsonString();
    }

    /**
     * @param {string} mapName
     * @param {string} mapTitle
     * @returns {Object}
     */
    fetchMapProperties(mapName, mapTitle)
    {
        let rooms = sc.get(this.parsed, 'rooms', {});
        if(sc.hasOwn(rooms, mapName)){
            return rooms[mapName];
        }
        return sc.get(rooms, mapTitle, {});
    }

    /**
     * @param {Object} roomCreateData
     * @param {RoomCustomData} roomCustomData
     * @param {Object} properties
     */
    applyProperties(roomCreateData, roomCustomData, properties)
    {
        if(!sc.isObject(properties)){
            return;
        }
        for(let field of Object.keys(properties)){
            this.applyField(roomCreateData, roomCustomData, field, properties[field]);
        }
    }

    /**
     * @param {Object} roomCreateData
     * @param {RoomCustomData} roomCustomData
     * @param {string} field
     * @param {*} value
     */
    applyField(roomCreateData, roomCustomData, field, value)
    {
        if(this.customDataField === field){
            this.applyCustomData(roomCustomData, value);
            return;
        }
        if(-1 === this.assignableFields.indexOf(field)){
            Logger.warning('Room import data field is not a room field and it will be ignored: '+field);
            return;
        }
        if(!this.isPrimitiveValue(value)){
            Logger.warning('Room import data field value is not a primitive and it will be ignored: '+field);
            return;
        }
        roomCreateData[field] = value;
    }

    /**
     * @param {RoomCustomData} roomCustomData
     * @param {Object} value
     */
    applyCustomData(roomCustomData, value)
    {
        if(!sc.isObject(value)){
            Logger.warning('Room import data customData is not an object and it will be ignored.');
            return;
        }
        for(let customDataKey of Object.keys(value)){
            roomCustomData.set(customDataKey, value[customDataKey]);
        }
    }

    /**
     * @param {*} value
     * @returns {boolean}
     */
    isPrimitiveValue(value)
    {
        if(sc.isString(value) || sc.isNumber(value) || sc.isBoolean(value)){
            return true;
        }
        return value instanceof Date;
    }

}

module.exports.RoomImportData = RoomImportData;
