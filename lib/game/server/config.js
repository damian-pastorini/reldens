/**
 *
 * Reldens - GameConfig
 *
 * In order to override any of the default values please create an ".env" file in your project root to change the
 * values you need.
 *
 */

// @TODO - BETA - Client config will be sent onJoin.
class GameConfig
{

    getConfig()
    {
        return {
            // @NOTE: the game server URL will be part of the configuration in the database.
            engine: process.env.RELDENS_CLIENT_ENGINE ? process.env.RELDENS_CLIENT_ENGINE : 'phaser',
            type: process.env.RELDENS_CLIENT_TYPE ? Number(process.env.RELDENS_CLIENT_TYPE) : 0, // Phaser.AUTO
            parent: process.env.RELDENS_CLIENT_PARENT || 'reldens',
            dom: {
                createContainer: process.env.RELDENS_CLIENT_DOM || true
            },
            physics: {
                default: process.env.RELDENS_CLIENT_PHYSICS_DEFAULT || 'arcade',
                arcade: {
                    gravity: {
                        x: (process.env.RELDENS_CLIENT_PHYSICS_GRAVITY_X
                            ? Number(process.env.RELDENS_CLIENT_PHYSICS_GRAVITY_X) : 0),
                        y: process.env.RELDENS_CLIENT_PHYSICS_GRAVITY_Y
                            ? Number(process.env.RELDENS_CLIENT_PHYSICS_GRAVITY_Y) : 0,
                    },
                    debug: process.env.RELDENS_CLIENT_PHYSICS_DEBUG || false
                }
            },
            scale: {
                parent: process.env.RELDENS_CLIENT_SCALE_PARENT || 'reldens',
                // mode = 3 = Phaser.Scale.FIT
                mode: (process.env.RELDENS_CLIENT_SCALE_MODE ? Number(process.env.RELDENS_CLIENT_SCALE_MODE) : 3),
                // note: these will be just the starting if the responsive is enabled (default).
                width: (process.env.RELDENS_CLIENT_SCALE_WIDTH ? Number(process.env.RELDENS_CLIENT_SCALE_WIDTH) : 740),
                height: (process.env.RELDENS_CLIENT_SCALE_HEIGHT ? Number(process.env.RELDENS_CLIENT_SCALE_HEIGHT) : 360),
                min: {
                    width: (process.env.RELDENS_CLIENT_SCALE_MIN_WIDTH
                        ? Number(process.env.RELDENS_CLIENT_SCALE_MIN_WIDTH) : 360),
                    height: (process.env.RELDENS_CLIENT_SCALE_MIN_HEIGHT
                        ? Number(process.env.RELDENS_CLIENT_SCALE_MIN_HEIGHT) : 360)
                },
                // auto center = 1 = Phaser.Scale.CENTER_BOTH
                autoCenter: (process.env.RELDENS_CLIENT_SCALE_AUTOCENTER
                    ? Number(process.env.RELDENS_CLIENT_SCALE_AUTOCENTER) : 1),
            }
        }
    }

}

module.exports.GameConfig = GameConfig;
