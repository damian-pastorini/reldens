/**
 *
 * Reldens - Object Animation Frame Ranges Reader
 *
 * Reads, from the active scene, the frames range stored for each object animation and the frames range of the
 * animation created on the client.
 *
 */

class ObjectAnimationFrameRangesReader
{
    static async fetchStoredAndCreated(page)
    {
        return page.evaluate(() => {
            let scene = window.reldens.getActiveScene();
            let storedAnimations = {};
            for(let objectKey of Object.keys(scene.objectsAnimationsData)){
                Object.assign(storedAnimations, scene.objectsAnimationsData[objectKey].animations || {});
            }
            let animationsFrames = [];
            for(let animationKey of Object.keys(storedAnimations)){
                let storedAnimation = storedAnimations[animationKey];
                if('number' !== typeof storedAnimation.start){
                    continue;
                }
                if('number' !== typeof storedAnimation.end){
                    continue;
                }
                let createdAnimation = scene.anims.get(animationKey);
                let createdFrames = createdAnimation ? createdAnimation.frames : [];
                let firstFrame = [...createdFrames].shift();
                let lastFrame = [...createdFrames].pop();
                let storedRange = {key: animationKey, start: storedAnimation.start, end: storedAnimation.end};
                let createdRange = {
                    key: animationKey,
                    start: firstFrame ? firstFrame.textureFrame : null,
                    end: lastFrame ? lastFrame.textureFrame : null
                };
                animationsFrames.push({stored: storedRange, created: createdRange});
            }
            return animationsFrames;
        });
    }
}

module.exports.ObjectAnimationFrameRangesReader = ObjectAnimationFrameRangesReader;
