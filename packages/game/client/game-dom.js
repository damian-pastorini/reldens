// @TODO - BETA - Replace with React, Vue or some other better option.
const $ = require('jquery');

class GameDom
{

    getWindow()
    {
        return window;
    }

    getWindowElement()
    {
        return $(window);
    }

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

    createElement(type)
    {
        return document.createElement(type);
    }

    activeElement()
    {
        return document.activeElement;
    }

    insideInput()
    {
        return (this.activeElement().tagName.toLowerCase() === 'input');
    }

}

module.exports.GameDom = GameDom;
