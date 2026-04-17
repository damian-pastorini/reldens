/**
 *
 * Reldens - Admin Functions
 *
 */

function getCookie(name)
{
    let value = '; '+document.cookie;
    let parts = value.split('; '+name+'=');
    if(2 === parts.length){
        return parts.pop().split(';').shift();
    }
}

function deleteCookie(name)
{
    document.cookie = name+'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

function escapeHTML(str)
{
    return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function sanitizeImageUrl(url)
{
    if(!url || 'string' !== typeof url){
        return null;
    }
    let trimmedUrl = url.trim();
    trimmedUrl = trimmedUrl.replace(/[<>"']/g, '');
    if(0 === trimmedUrl.indexOf('/')){
        return trimmedUrl;
    }
    if(0 === trimmedUrl.indexOf('./')){
        return trimmedUrl;
    }
    if(0 === trimmedUrl.indexOf('..')){
        return trimmedUrl;
    }
    try{
        let urlObject = new URL(trimmedUrl);
        if('http:' === urlObject.protocol || 'https:' === urlObject.protocol){
            return urlObject.href;
        }
        return null;
    } catch(error){
        return null;
    }
}

function cloneElement(element)
{
    if(element instanceof HTMLCanvasElement){
        let clonedCanvas = document.createElement('canvas');
        clonedCanvas.width = element.width;
        clonedCanvas.height = element.height;
        let ctx = clonedCanvas.getContext('2d');
        ctx.drawImage(element, 0, 0);
        return clonedCanvas;
    }
    return element.cloneNode(true);
}

function showConfirmDialog(callback, options)
{
    let dialog = document.querySelector('.confirm-dialog');
    if(!dialog){
        return callback(false);
    }
    let titleEl = dialog.querySelector('.dialog-title');
    let messageEl = dialog.querySelector('.dialog-message');
    let confirmButton = dialog.querySelector('.dialog-confirm');
    let cancelButton = dialog.querySelector('.dialog-cancel');
    let savedTitle = titleEl ? titleEl.textContent : '';
    let savedMessage = messageEl ? messageEl.textContent : '';
    let savedConfirmText = confirmButton ? confirmButton.textContent : '';
    let savedConfirmClass = confirmButton ? confirmButton.className : '';
    let savedCancelText = cancelButton ? cancelButton.textContent : '';
    let savedCancelClass = cancelButton ? cancelButton.className : '';
    let knownButtonClasses = ['button-primary', 'button-secondary', 'button-danger', 'button-warning', 'button-success', 'button-info', 'button-dark'];
    if('string' === typeof options && options){
        if(messageEl){
            messageEl.textContent = options;
        }
    }
    if(options && 'object' === typeof options){
        if(options.title && titleEl){
            titleEl.textContent = options.title;
        }
        if(options.message && messageEl){
            messageEl.textContent = options.message;
        }
        if(options.confirmText && confirmButton){
            confirmButton.textContent = options.confirmText;
        }
        if(options.confirmClass && confirmButton){
            for(let cls of knownButtonClasses){
                confirmButton.classList.remove(cls);
            }
            confirmButton.classList.add(options.confirmClass);
        }
        if(options.cancelText && cancelButton){
            cancelButton.textContent = options.cancelText;
        }
        if(options.cancelClass && cancelButton){
            for(let cls of knownButtonClasses){
                cancelButton.classList.remove(cls);
            }
            cancelButton.classList.add(options.cancelClass);
        }
    }
    let closeButton = dialog.querySelector('.button-close');
    let backdrop = dialog.querySelector('.modal-backdrop');
    dialog.classList.remove('hidden');
    let restoreDialog = () => {
        if(titleEl){
            titleEl.textContent = savedTitle;
        }
        if(messageEl){
            messageEl.textContent = savedMessage;
        }
        if(confirmButton){
            confirmButton.textContent = savedConfirmText;
            confirmButton.className = savedConfirmClass;
        }
        if(cancelButton){
            cancelButton.textContent = savedCancelText;
            cancelButton.className = savedCancelClass;
        }
    };
    let onConfirm = () => {
        dialog.classList.add('hidden');
        restoreDialog();
        callback(true);
        confirmButton.removeEventListener('click', onConfirm);
        cancelButton.removeEventListener('click', onCancel);
        if(closeButton){
            closeButton.removeEventListener('click', onCancel);
        }
        if(backdrop){
            backdrop.removeEventListener('click', onCancel);
        }
    };
    let onCancel = () => {
        dialog.classList.add('hidden');
        restoreDialog();
        callback(false);
        confirmButton.removeEventListener('click', onConfirm);
        cancelButton.removeEventListener('click', onCancel);
        if(closeButton){
            closeButton.removeEventListener('click', onCancel);
        }
        if(backdrop){
            backdrop.removeEventListener('click', onCancel);
        }
    };
    confirmButton.addEventListener('click', onConfirm);
    cancelButton.addEventListener('click', onCancel);
    if(closeButton){
        closeButton.addEventListener('click', onCancel);
    }
    if(backdrop){
        backdrop.addEventListener('click', onCancel);
    }
}

function activateExpandCollapse()
{
    let expandCollapseButtons = document.querySelectorAll('[data-expand-collapse]');
    if(!expandCollapseButtons){
        return;
    }
    for(let expandCollapseButton of expandCollapseButtons){
        expandCollapseButton.addEventListener('click', (event) => {
            let expandCollapseElement = document.querySelector(event.currentTarget.dataset.expandCollapse);
            if(expandCollapseElement){
                expandCollapseElement.classList.toggle('hidden');
            }
        });
    }
}

function createModalContent(modalElement)
{
    if(modalElement.hasAttribute('data-modal-zoom-image')){
        let modalContent = document.createElement('img');
        let imageUrl = modalElement.getAttribute('data-modal-zoom-image');
        let sanitizedUrl = sanitizeImageUrl(imageUrl);
        if(!sanitizedUrl){
            return cloneElement(modalElement);
        }
        modalContent.setAttribute('src', sanitizedUrl);
        modalContent.setAttribute('alt', modalElement.alt || 'Modal Image');
        modalContent.classList.add('modal-zoom-image');
        return modalContent;
    }
    return cloneElement(modalElement);
}

function activateModalElements()
{
    let modalElements = document.querySelectorAll('[data-toggle="modal"]');
    if(!modalElements){
        return;
    }
    for(let modalElement of modalElements){
        if(!modalElement.id){
            modalElement.id = 'modal-'+Math.random().toString(36).substr(2, 9);
        }
        modalElement.addEventListener('click', () => {
            let overlayId = 'overlay-'+modalElement.id;
            let existingOverlay = document.querySelector('#'+overlayId);
            if(existingOverlay){
                existingOverlay.style.display = 'block';
                document.body.style.overflow = 'hidden';
                return;
            }
            let overlay = document.createElement('div');
            overlay.id = overlayId;
            overlay.classList.add('modal');
            let backdrop = document.createElement('div');
            backdrop.classList.add('modal-backdrop');
            let dialog = document.createElement('div');
            dialog.classList.add('modal-dialog');
            dialog.classList.add('modal-width-auto');
            let isZoomImage = modalElement.hasAttribute('data-modal-zoom-image');
            if(isZoomImage){
                let imageUrl = modalElement.getAttribute('data-modal-zoom-image');
                let fileName = imageUrl ? imageUrl.split('/').pop() : '';
                let header = document.createElement('div');
                header.classList.add('modal-header');
                let titleEl = document.createElement('span');
                titleEl.textContent = fileName;
                let closeBtn = document.createElement('button');
                closeBtn.textContent = '\u00d7';
                closeBtn.classList.add('button', 'button-close', 'button-circle', 'button-dark');
                closeBtn.setAttribute('type', 'button');
                closeBtn.addEventListener('click', () => {
                    document.body.style.overflow = '';
                    document.body.removeChild(overlay);
                });
                header.appendChild(titleEl);
                header.appendChild(closeBtn);
                dialog.appendChild(header);
            }
            let body = document.createElement('div');
            body.classList.add('modal-body');
            let modalContent = createModalContent(modalElement);
            modalContent.classList.add('clickable');
            body.appendChild(modalContent);
            dialog.appendChild(body);
            overlay.appendChild(backdrop);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';
            modalContent.addEventListener('click', () => {
                document.body.style.overflow = '';
                document.body.removeChild(overlay);
            });
            backdrop.addEventListener('click', () => {
                document.body.style.overflow = '';
                document.body.removeChild(overlay);
            });
        });
    }
}
