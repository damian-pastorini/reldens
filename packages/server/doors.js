/**
 *
 * Reldens - DoorObject
 *
 * This is an example object class, it extends from the AnimationsObject class and the define the specific parameters
 * for the animation.
 * The main point here is that this is just and example, and you could even create several animations for a single
 * object, and make the object run any kind of actions at any time. Here you can see a simple animation object but it
 * can be literally anything.
 *
 */

const AnimationObject = require('reldens/src/objects/animation-object');

class DoorObject extends AnimationObject
{

    constructor(props)
    {
        super(props);
        this.runOnHit = true;
        // @NOTE: in this example we are changing the position data to run the animation before we hit the change-point.
        // this.xFix = 0;
        this.yFix = 6;
        // assign extra public params:
        // @TODO: - Seiyria this seems like the kind of thing a getter would do better, or an ES6 proxy. accessing
        //   obj.publicParamsObj feels weird, and IMO is an anti pattern - everything on the object should be accessible
        //   if it is visible. this is another small plug for typescript, since it would let you encapsulate this data
        this.publicParamsObj = Object.assign(this.publicParamsObj, {
            enabled: true,
            // @NOTE: in the same way we can fix the position of the body object in the server we can do it just for
            // the animation by setting the positionFix.x and positionFix.y which are the valued shared with the client.
            positionFix: {y: -18},
            frameStart: 0,
            frameEnd: 3,
            repeat: 0,
            hideOnComplete: false,
            autoStart: true
        });
    }

}

module.exports = DoorObject;
