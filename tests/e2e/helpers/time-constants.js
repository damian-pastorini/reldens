/**
 *
 * Reldens - Time Constants
 *
 * Central repository for all e2e test timing values.
 * Non-longRun uses base values; longRun applies LONG_RUN_MULTIPLIER.
 * PLAYER_REVIVE and ENEMY_KILL are NOT scaled — they are driven by server-side
 * configuration (gameOver/timeOut) and game mechanics (HP/damage rate), which
 * run at the same speed regardless of longRun mode.
 *
 */

class TimeConstants
{
    static LONG_RUN_MULTIPLIER = 4;
    static ACTION = 1000;
    // Standard interaction pause in longRun (0 when non-longRun)
    static PAUSE = 800;
    // Keystroke delay when simulating human typing in longRun (0 when non-longRun)
    static TYPE_DELAY = 150;
    // UI DOM operations: panel visible after button click (~1s expected + 2s buffer)
    static UI_OPEN = 3000;
    // Server message round-trip: send → process → broadcast → render (~1s + 2s buffer)
    static SERVER_RESPONSE = 5000;
    // Game state detection after scene join: objects/players visible (~5s + 5s buffer)
    static SCENE_LOAD = 10000;
    // Room transition: tile collision → server processes → client room name change (~500ms + 2s buffer)
    static ROOM_TRANSITION = 5000;
    // Walking/navigation loop budget (multi-step movement)
    static NAVIGATION = 10000;
    // Full login flow: auth → char select → scene loads → HUD ready (~10–20s + 10s buffer)
    static GAME_START = 30000;
    // Character selection/creation screen to appear after login (~5–15s + 5s buffer)
    static CHARACTER_SCREEN = 20000;
    // Player revive: server gameOver/timeOut=10000ms + 2s detection buffer — NOT scaled
    static PLAYER_REVIVE = 12000;
    // Enemy kill budget: player HP=81 at 1 HP/sec → 81s + 9s buffer — NOT scaled
    static ENEMY_KILL = 90000;

    static forLongRun(value, longRun)
    {
        return longRun ? value * TimeConstants.LONG_RUN_MULTIPLIER : value;
    }

    static pauseMs(longRun)
    {
        return longRun ? TimeConstants.PAUSE : 0;
    }

    static typeDelay(longRun)
    {
        return longRun ? TimeConstants.TYPE_DELAY : 0;
    }
}

module.exports.TimeConstants = TimeConstants;
