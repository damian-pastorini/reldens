/**
 *
 * Reldens - Tile-Extruder
 *
 * Ported from https://github.com/sporadic-labs/tile-extruder
 * Updated for Jimp 1.2.0.
 *
 */

const { Jimp } = require('jimp');

/**
 * @param {Jimp} srcImage
 * @param {number} srcX
 * @param {number} srcY
 * @param {number} srcW
 * @param {number} srcH
 * @param {Jimp} destImage
 * @param {number} destX
 * @param {number} destY
 */
function copyPixels(srcImage, srcX, srcY, srcW, srcH, destImage, destX, destY)
{
    srcImage.scan(srcX, srcY, srcW, srcH, (curSrcX, curSrcY, curSrcIndex) => {
        let curDestX = destX + (curSrcX - srcX);
        let curDestY = destY + (curSrcY - srcY);
        let curDestIndex = destImage.getPixelIndex(curDestX, curDestY);
        destImage.bitmap.data[curDestIndex] = srcImage.bitmap.data[curSrcIndex];
        destImage.bitmap.data[curDestIndex + 1] = srcImage.bitmap.data[curSrcIndex + 1];
        destImage.bitmap.data[curDestIndex + 2] = srcImage.bitmap.data[curSrcIndex + 2];
        destImage.bitmap.data[curDestIndex + 3] = srcImage.bitmap.data[curSrcIndex + 3];
    });
}

/**
 * @param {Jimp} srcImage
 * @param {number} srcX
 * @param {number} srcY
 * @param {Jimp} destImage
 * @param {number} destX
 * @param {number} destY
 * @param {number} destW
 * @param {number} destH
 */
function copyPixelToRect(srcImage, srcX, srcY, destImage, destX, destY, destW, destH)
{
    let srcIndex = srcImage.getPixelIndex(srcX, srcY);
    destImage.scan(destX, destY, destW, destH, (curDestX, curDestY, curDestIndex) => {
        destImage.bitmap.data[curDestIndex] = srcImage.bitmap.data[srcIndex];
        destImage.bitmap.data[curDestIndex + 1] = srcImage.bitmap.data[srcIndex + 1];
        destImage.bitmap.data[curDestIndex + 2] = srcImage.bitmap.data[srcIndex + 2];
        destImage.bitmap.data[curDestIndex + 3] = srcImage.bitmap.data[srcIndex + 3];
    });
}

/**
 * @param {number} tw
 * @param {number} th
 * @param {string} inputPath
 * @param {Object} options
 * @param {number} [options.margin]
 * @param {number} [options.spacing]
 * @param {number} [options.color]
 * @param {number} [options.extrusion]
 * @returns {Promise<Jimp>}
 */
async function ExtrudeTileset(tw, th, inputPath, {margin = 0, spacing = 0, color = 0xffffff00, extrusion = 1} = {})
{
    let image = await Jimp.read(inputPath).catch((err) => {
        throw err;
    });
    let cols = (image.bitmap.width - 2 * margin + spacing) / (tw + spacing);
    let rows = (image.bitmap.height - 2 * margin + spacing) / (th + spacing);
    if(!Number.isInteger(cols) || !Number.isInteger(rows)){
        throw new Error('Non-integer number of rows or cols found.');
    }
    let extruded = await new Jimp({
        width: 2 * margin + (cols - 1) * spacing + cols * (tw + 2 * extrusion),
        height: 2 * margin + (rows - 1) * spacing + rows * (th + 2 * extrusion),
        color
    });
    for(let row = 0; row < rows; row++){
        for(let col = 0; col < cols; col++){
            let srcX = margin + col * (tw + spacing);
            let srcY = margin + row * (th + spacing);
            let destX = margin + col * (tw + spacing + 2 * extrusion);
            let destY = margin + row * (th + spacing + 2 * extrusion);
            copyPixels(image, srcX, srcY, tw, th, extruded, destX + extrusion, destY + extrusion);
            let newSrcX = srcX + tw - 1;
            let newSrcY = srcY + th - 1;
            let newDestX = destX + extrusion + tw;
            let newDestY = destY + extrusion + th;
            for(let i = 0; i < extrusion; i++){
                copyPixels(image, srcX, srcY, tw, 1, extruded, destX + extrusion, destY + i);
                copyPixels(image, srcX, newSrcY, tw, 1, extruded, destX + extrusion, newDestY + (extrusion - i - 1));
                copyPixels(image, srcX, srcY, 1, th, extruded, destX + i, destY + extrusion);
                copyPixels(image, newSrcX, srcY, 1, th, extruded, newDestX + (extrusion - i - 1), destY + extrusion);
            }
            copyPixelToRect(image, srcX, srcY, extruded, destX, destY, extrusion, extrusion);
            copyPixelToRect(image, newSrcX, srcY, extruded, newDestX, destY, extrusion, extrusion);
            copyPixelToRect(image, srcX, newSrcY, extruded, destX, newDestY, extrusion, extrusion);
            copyPixelToRect(image, newSrcX, newSrcY, extruded, newDestX, newDestY, extrusion, extrusion);
        }
    }
    return extruded;
}

module.exports.ExtrudeTileset = ExtrudeTileset;
