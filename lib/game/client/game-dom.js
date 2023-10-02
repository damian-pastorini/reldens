/**
 *
 * Reldens - GameDom
 *
 */

const { sc } = require('@reldens/utils');

class GameDom
{

    constructor()
    {
        // @TODO - BETA - Change all hardcoded values, and make GameDom a full driver for all the game elements.
        this.styleSuffix = {
            width: 'px',
            height: 'px',
            top: 'px',
            bottom: 'px',
            left: 'px',
            right: 'px'
        };
    }

    getWindow()
    {
        return window;
    }

    getDocument()
    {
        return window.document;
    }

    getElement(querySelector, container = false)
    {
        return (container || document).querySelector(querySelector);
    }

    getElements(querySelector, container)
    {
        return (container || document).querySelectorAll(querySelector);
    }

    emptyElement(querySelector, container = false)
    {
        let element = this.getElement(querySelector, container);
        if(element){
            element.innerHTML = '';
        }
    }

    appendToElement(querySelector, newContent)
    {
        let element = this.getElement(querySelector);
        if(!element || !newContent){
            return false;
        }
        let template = document.createElement('template');
        template.innerHTML = newContent;
        for(let i=0; i < template.content.childNodes.length; i++){
            element.appendChild(template.content.childNodes[i]);
        }
        return element;
    }

    updateContent(querySelector, newContent)
    {
        let element = this.getElement(querySelector);
        if(!element){
            return false;
        }
        element.innerHTML = newContent;
        return element;
    }

    removeElement(querySelector)
    {
        this.getElement(querySelector).remove();
    }

    createElement(type, id = false)
    {
        let element = document.createElement(type);
        if(id){
            element.id = id;
        }
        return element;
    }

    setElementStyles(element, styles)
    {
        if(!element || !styles){
            return false;
        }
        let stylesKeys = Object.keys(styles);
        for(let i of stylesKeys){
            let styleValue = styles[i];
            let suffix = sc.get(this.styleSuffix, i, '');
            if('' !== suffix){
                styleValue += suffix;
            }
            element.style[i] = styleValue;
        }
    }

    activeElement()
    {
        return document.activeElement;
    }

    insideInput()
    {
        return 'input' === this.activeElement().tagName.toLowerCase();
    }

    getJSON(url, callback)
    {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'json';
        xhr.onload = () => {
            let status = xhr.status;
            200 === status ? callback(null, xhr.response) : callback(status);
        };
        xhr.send();
    }

    alertReload(message)
    {
        alert(message);
        this.getWindow().location.reload();
    }

}

module.exports.GameDom = new GameDom();
