// @TODO: replace with React, Vue or some other better option.
const $ = require('jquery');

class GameDom
{

    getElement(querySelector)
    {
        return $(querySelector);
    }

    appendToElement(querySelector, newContent)
    {
        let element = $(querySelector);
        let $newContent = $(newContent);
        if(!element || !$newContent){
            return false;
        }
        element.append($newContent);
        return element;
    }

    updateContent(querySelector, newContent)
    {
        let element = $(querySelector);
        if(!element){
            return false;
        }
        element.html(newContent);
        return element;
    }

    removeElement(querySelector)
    {
        $(querySelector).remove();
    }

}

module.exports.GameDom = GameDom;
