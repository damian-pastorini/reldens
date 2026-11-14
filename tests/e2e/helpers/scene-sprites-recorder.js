/**
 *
 * Reldens - Scene Sprites Recorder
 *
 * Records the texture key and the position of every game object added to the active scene of the page, and the text of
 * the added text objects (the Phaser addedtoscene event, the listener is added once per scene and the start clears the
 * recorded lists), so the specs prove the skill attack, hit, cast and effect sprites and the floating damage texts were created
 * even when their animation ends and destroys them before a read; it also reads the current sprite of a player (its
 * position and the visibility of the sprite and its name) and waits until a player sprite is shown or removed.
 *
 */

class SceneSpritesRecorder
{

    static async start(page)
    {
        await page.evaluate(() => {
            let scene = window.reldens.getActiveScene();
            window.e2eAddedTextures = [];
            window.e2eAddedSprites = [];
            window.e2eAddedTexts = [];
            if(window.e2eRecordedSceneKey === scene.sys.settings.key){
                return;
            }
            window.e2eRecordedSceneKey = scene.sys.settings.key;
            scene.sys.events.on('addedtoscene', (gameObject) => {
                let textureKey = gameObject.texture ? gameObject.texture.key : '';
                window.e2eAddedTextures.push(textureKey);
                window.e2eAddedSprites.push({key: textureKey, x: gameObject.x, y: gameObject.y});
                if('string' === typeof gameObject.text){
                    window.e2eAddedTexts.push(gameObject.text);
                }
            });
        });
    }

    static async waitForTextures(page, textureKeys, timeout)
    {
        await page.waitForFunction(
            (keys) => keys.every(key => (window.e2eAddedTextures || []).includes(key)),
            textureKeys,
            {timeout}
        );
        return await page.evaluate(() => window.e2eAddedTextures);
    }

    static async fetchTexts(page)
    {
        return await page.evaluate(() => window.e2eAddedTexts || []);
    }

    static async fetchSprites(page, textureKey)
    {
        return await page.evaluate(
            (key) => (window.e2eAddedSprites || []).filter(addedSprite => key === addedSprite.key),
            textureKey
        );
    }

    static async fetchPlayerSprite(page, sessionId)
    {
        return await page.evaluate((id) => {
            let sprite = window.reldens.getCurrentPlayer().players[id];
            if(!sprite){
                return false;
            }
            return {x: sprite.x, y: sprite.y, visible: sprite.visible, nameVisible: Boolean(sprite.nameSprite?.visible)};
        }, sessionId);
    }

    static async waitForRemovedPlayer(page, sessionId, timeout)
    {
        await page.waitForFunction(
            (id) => !window.reldens.getCurrentPlayer().players[id],
            sessionId,
            {timeout}
        );
    }

    static async waitForShownPlayer(page, sessionId, timeout)
    {
        await page.waitForFunction(
            (id) => Boolean(window.reldens.getCurrentPlayer().players[id]?.visible),
            sessionId,
            {timeout}
        );
    }

}

module.exports.SceneSpritesRecorder = SceneSpritesRecorder;
