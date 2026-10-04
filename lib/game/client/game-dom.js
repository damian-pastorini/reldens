/**
 *
 * Reldens - GameDom
 *
 * Singleton utility class for DOM manipulation and element management. Provides helpers for
 * querying elements, creating elements with styles, updating content, appending HTML, removing
 * elements, and handling AJAX requests. Manages CSS style suffixes (px for positioning/sizing).
 * Exported as a singleton instance for shared use across the client application.
 *
 */

const { sc } = require('@reldens/utils');

class GameDom
{

    constructor()
    {
        /** @type {Object<string, string>} */
        this.styleSuffix = {
            width: 'px',
            height: 'px',
            top: 'px',
            bottom: 'px',
            left: 'px',
            right: 'px'
        };
        /** @type {string} */
        this.reloadModalId = 'reload-modal';
    }

    /**
     * @returns {Window}
     */
    getWindow()
    {
        return window;
    }

    /**
     * @returns {Document}
     */
    getDocument()
    {
        return window.document;
    }

    /**
     * @param {string} querySelector
     * @param {HTMLElement|Document|boolean} [container]
     * @returns {HTMLElement|null}
     */
    getElement(querySelector, container = false)
    {
        if(!querySelector){
            return null;
        }
        return (container || document).querySelector(querySelector);
    }

    /**
     * @param {string} querySelector
     * @param {HTMLElement|Document} [container]
     * @returns {NodeListOf<HTMLElement>|null}
     */
    getElements(querySelector, container)
    {
        if(!querySelector){
            return null;
        }
        return (container || document).querySelectorAll(querySelector);
    }

    /**
     * @param {string} querySelector
     * @param {HTMLElement|Document|boolean} [container]
     */
    emptyElement(querySelector, container = false)
    {
        let element = this.getElement(querySelector, container);
        if(element){
            element.innerHTML = '';
        }
    }

    /**
     * @param {string} querySelector
     * @param {string} newContent
     * @returns {HTMLElement|boolean}
     */
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

    /**
     * @param {string} querySelector
     * @param {string} newContent
     * @returns {HTMLElement|boolean}
     */
    updateContent(querySelector, newContent)
    {
        let element = this.getElement(querySelector);
        if(!element){
            return false;
        }
        element.innerHTML = newContent;
        return element;
    }

    /**
     * @param {string} querySelector
     */
    removeElement(querySelector)
    {
        this.getElement(querySelector)?.remove();
    }

    /**
     * @param {string} type
     * @param {string} [id]
     * @param {Array<string>} [classNamesList]
     * @returns {HTMLElement}
     */
    createElement(type, id = '', classNamesList)
    {
        let element = document.createElement(type);
        if('' !== id){
            element.id = id;
        }
        if(sc.isArray(classNamesList)){
            for(let className of classNamesList){
                element.classList.add(className);
            }
        }
        return element;
    }

    /**
     * @param {HTMLElement} element
     * @param {Object<string, string|number>} styles
     * @returns {boolean}
     */
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
        return true;
    }

    /**
     * @param {string} type
     * @param {string} [id]
     * @param {Object<string, string|number>} [styles]
     * @returns {HTMLElement}
     */
    createElementWithStyles(type, id = '', styles = {})
    {
        let element = this.createElement(type, id);
        this.setElementStyles(element, styles);
        return element;
    }

    /**
     * @returns {HTMLElement}
     */
    activeElement()
    {
        return document.activeElement;
    }

    /**
     * @returns {boolean}
     */
    insideInput()
    {
        return 'input' === this.activeElement().tagName.toLowerCase();
    }

    /**
     * @param {string} url
     * @param {function(number|null, object): void} callback
     */
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

    /**
     * @param {string} message
     * @param {string} [reloadLabel]
     * @returns {boolean}
     */
    alertReload(message, reloadLabel = 'Reload')
    {
        let reloadModal = this.getElement('#'+this.reloadModalId) || this.createReloadModal(reloadLabel);
        this.getElement('.reload-modal-message', reloadModal).textContent = message;
        this.getElement('.reload-modal-button', reloadModal).focus();
        return false;
    }

    /**
     * @param {string} reloadLabel
     * @returns {HTMLElement}
     */
    createReloadModal(reloadLabel)
    {
        let reloadModal = this.createElement('div', this.reloadModalId, ['reload-modal']);
        let modalContent = this.createElement('div', '', ['reload-modal-content']);
        let reloadButton = this.createElement('button', '', ['reload-modal-button']);
        reloadButton.type = 'button';
        reloadButton.textContent = reloadLabel;
        reloadButton.addEventListener('click', () => {
            this.getWindow().location.reload();
        });
        reloadModal.addEventListener('keydown', (event) => {
            event.stopPropagation();
        });
        modalContent.append(this.createElement('p', '', ['reload-modal-message']), reloadButton);
        reloadModal.appendChild(modalContent);
        this.getDocument().body.appendChild(reloadModal);
        return reloadModal;
    }

}

module.exports.GameDom = new GameDom();
