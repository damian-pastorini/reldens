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

function showConfirmDialog(callback)
{
    let dialog = document.querySelector('.confirm-dialog');
    if(!dialog){
        return callback(false);
    }
    dialog.showModal();
    let confirmButton = dialog.querySelector('.dialog-confirm');
    let cancelButton = dialog.querySelector('.dialog-cancel');
    let onConfirm = () => {
        dialog.close();
        callback(true);
        confirmButton.removeEventListener('click', onConfirm);
        cancelButton.removeEventListener('click', onCancel);
    };
    let onCancel = () => {
        dialog.close();
        callback(false);
        confirmButton.removeEventListener('click', onConfirm);
        cancelButton.removeEventListener('click', onCancel);
    };
    confirmButton.addEventListener('click', onConfirm);
    cancelButton.addEventListener('click', onCancel);
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
        modalContent.src = modalElement.getAttribute('data-modal-zoom-image');
        modalContent.alt = modalElement.alt || 'Modal Image';
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
            overlay.classList.add('modal-overlay');
            let modal = document.createElement('div');
            modal.classList.add('modal');
            modal.classList.add('clickable');
            let modalContent = createModalContent(modalElement);
            modalContent.classList.add('clickable');
            modal.appendChild(modalContent);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';
            modalContent.addEventListener('click', () => {
                document.body.style.overflow = '';
                document.body.removeChild(overlay);
            });
            modal.addEventListener('click', (e) => {
                if(modal === e.target){
                    document.body.style.overflow = '';
                    document.body.removeChild(overlay);
                }
            });
            overlay.addEventListener('click', (e) => {
                if(overlay === e.target){
                    document.body.style.overflow = '';
                    document.body.removeChild(overlay);
                }
            });
        });
    }
}
