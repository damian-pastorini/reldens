/**
 *
 * Reldens - SpriteTextFactory
 *
 * Factory class for creating and attaching text labels to sprites in Phaser. Provides static methods
 * to position text relative to sprites (e.g., player names, labels) with configurable styling including
 * font, colors, shadows, and strokes.
 *
 */

const { sc } = require('@reldens/utils');

/**
 * @typedef {import('phaser').GameObjects.Sprite} Sprite
 * @typedef {import('phaser').Scene} Scene
 * @typedef {import('phaser').GameObjects.Text} Text
 */
class SpriteTextFactory
{

    /**
     * @param {Sprite} sprite
     * @param {string} text
     * @param {Object} textConfig
     * @param {number} topOff
     * @param {string} textKeyWord
     * @param {Scene} scene
     * @returns {Text}
     */
    static attachTextToSprite(sprite, text, textConfig, topOff, textKeyWord, scene)
    {
        let relativeNamePosition = this.getTextPosition(sprite, text, textConfig, topOff);
        let textSprite = scene.add.text(
            relativeNamePosition.x,
            relativeNamePosition.y,
            text,
            {
                fontFamily: sc.get(textConfig, 'fontFamily', 'sans-serif'),
                fontSize: sc.get(textConfig, 'fontSize', '12px')
            }
        );
        textSprite.style.setFill(sc.get(textConfig, 'fill', '#ffffff'));
        textSprite.style.setAlign(sc.get(textConfig, 'align', 'center'));
        textSprite.style.setStroke(sc.get(textConfig, 'stroke', '#000000'), sc.get(textConfig, 'strokeThickness', 4));
        textSprite.style.setShadow(
            sc.get(textConfig, 'shadowX', 5),
            sc.get(textConfig, 'shadowY', 5),
            sc.get(textConfig, 'shadowColor', 'rgba(0,0,0,0.7)'),
            sc.get(textConfig, 'shadowBlur', 5)
        );
        textSprite.setDepth(sc.get(textConfig, 'depth', 200000));
        sprite[textKeyWord] = textSprite;
        return textSprite;
    }

    /**
     * @param {Sprite} sprite
     * @param {string} text
     * @param {Object} textConfig
     * @param {number} [topOff]
     * @returns {Object} Position object with x and y coordinates
     */
    static getTextPosition(sprite, text, textConfig, topOff = 0)
    {
        if(!sprite){
            return {x: 0, y:0};
        }
        let height = sc.get(textConfig, 'height', 18);
        let x = sprite.x - ((text.length * sc.get(textConfig, 'textLength', 4)));
        let y = sprite.y - height - sprite.height + topOff;
        return {x, y};
    }

}

module.exports.SpriteTextFactory = SpriteTextFactory;
