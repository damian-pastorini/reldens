/**
 *
 * Reldens - GameDom
 *
 */

class GameDom
{

    getDocument()
    {
        return document;
    }

    getWindow()
    {
        return window;
    }

    getElement(querySelector)
    {
        return document.querySelector(querySelector);
    }

    getElements(querySelector)
    {
        return document.querySelectorAll(querySelector);
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

    getJSON(url, callback)
    {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'json';
        xhr.onload = () => {
            let status = xhr.status;
            if (status === 200) {
                callback(null, xhr.response);
            } else {
                callback(status);
            }
        };
        xhr.send();
    }

}

module.exports.GameDom = GameDom;
