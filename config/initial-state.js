/**
 *
 * Reldens - config/initial-scene
 *
 * Please do not to modify this file!
 * In order to override any of the default values please create an ".env" file in your project root to change the
 * values you need.
 *
 */

module.exports =  {
    scene: process.env.RELDENS_INITIAL_SCENE_NAME || 'ReldensTown',
    x: Number(process.env.RELDENS_INITIAL_SCENE_X) || 400,
    y: Number(process.env.RELDENS_INITIAL_SCENE_Y) || 345,
    dir: process.env.RELDENS_INITIAL_SCENE_DIR || 'down'
};
