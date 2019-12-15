/**
 *
 * Reldens - InteractionArea
 *
 * This class is used to validate the area for an specific object or action, for example if player A targets player B
 * by clicking on it and then run an action (by pressing space bar or using the action button), the action will
 * be only valid and executed if player A is inside the interactive area of player B.
 *
 */

class InteractionArea
{

    setupInteractionArea(margin = false, x = false, y = false)
    {
        this.x = false;
        this.y = false;
        this.interactionArea = false;
        this.interactionLimits = {};
        // interaction area can be forced by parameter:
        if(margin){
            this.interactionArea = margin;
        }
        // if there's none interaction area just do nothing:
        if(!this.interactionArea){
            return;
        }
        if(x){
            this.x = x;
        }
        if(y){
            this.y = y;
        }
        this.interactionLimits.left = this.x - this.interactionArea;
        this.interactionLimits.right = this.x + this.interactionArea;
        this.interactionLimits.up = this.y - this.interactionArea;
        this.interactionLimits.down = this.y + this.interactionArea;
    }

    isValidInteraction(posX, posY)
    {
        return posX > this.interactionLimits.left
            && posX < this.interactionLimits.right
            && posY > this.interactionLimits.up
            && posY < this.interactionLimits.down;
    }

}

module.exports.InteractionArea = InteractionArea;
