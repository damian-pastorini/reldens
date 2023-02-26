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

    getElement(querySelector, container = false)
    {
        return (container || document).querySelector(querySelector);
    }

    getElements(querySelector, container)
    {
        return (container || document).querySelectorAll(querySelector);
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
