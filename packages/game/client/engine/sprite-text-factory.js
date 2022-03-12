/**
 *
 * Reldens - SpriteTextFactory
 *
 */

class SpriteTextFactory
{

    static attachTextToSprite(sprite, text, textConfig, topOff, textKeyWord, scene)
    {
        let relativeNamePosition = this.getTextPosition(sprite, text, textConfig, topOff);
        let textSprite = scene.add.text(
            relativeNamePosition.x,
            relativeNamePosition.y,
            text,
            {
                fontFamily: (textConfig.fontFamily || 'sans-serif'),
                fontSize: textConfig.fontSize || '12px'
            }
        );
        textSprite.style.setFill((textConfig.fill || '#ffffff'));
        textSprite.style.setAlign((textConfig.align || 'center'));
        textSprite.style.setStroke((textConfig.stroke || '#000000'), (textConfig.strokeThickness || 4));
        textSprite.style.setShadow(
            (textConfig.shadowX || 5),
            (textConfig.shadowY || 5),
            (textConfig.shadowColor || 'rgba(0,0,0,0.7)'),
            (textConfig.shadowBlur || 5)
        );
        textSprite.setDepth((textConfig.depth || 200000));
        sprite[textKeyWord] = textSprite;
    }

    static getTextPosition(sprite, text, textConfig, topOff = 0)
    {
        let height = textConfig.height || 18;
        let x = sprite.x - ((text.length * (textConfig.textLength || 4)));
        let y = sprite.y - height - sprite.height + topOff;
        return {x, y};
    }

}

module.exports.SpriteTextFactory = SpriteTextFactory;
