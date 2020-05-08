
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
        element.append($newContent);
        return element;
    }

    updateContent(querySelector, newContent)
    {
        let element = $(querySelector);
        element.html(newContent);
        return element;
    }

    removeElement(querySelector)
    {
        $(querySelector).remove();
    }

}

module.exports.GameDom = GameDom;
