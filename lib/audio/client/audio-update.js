/**
 *
 * Reldens - AudioUpdate
 *
 */

const { AudioConst } = require('../constants');
const { GameConst } = require('../../game/constants');

class AudioUpdate
{

    constructor(updateValue, updateType)
    {
        this[GameConst.ACTION_KEY] = AudioConst.AUDIO_UPDATE;
        this[AudioConst.MESSAGE.DATA.UPDATE_VALUE] = updateValue;
        this[AudioConst.MESSAGE.DATA.UPDATE_TYPE] = updateType;
    }

}

module.exports.AudioUpdate = AudioUpdate;
