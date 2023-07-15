/**
 *
 * Reldens - AudioUpdate
 *
 */

const { AudioConst } = require('../constants');
const { GameConst } = require('../../game/constants');

class AudioUpdate
{

    constructor(updateType, updateValue)
    {
        this[GameConst.ACTION_KEY] = AudioConst.AUDIO_UPDATE;
        this[AudioConst.MESSAGE.DATA.UPDATE_TYPE] = updateType;
        this[AudioConst.MESSAGE.DATA.UPDATE_VALUE] = updateValue;
    }

}

module.exports.AudioUpdate = AudioUpdate;
