/**
 *
 * Reldens - Rooms Default Room Delete Blocker
 *
 */

class RoomsDefaultRoomDeleteBlocker
{
    constructor()
    {
        this.warningOptions = {
            title: 'Default room',
            message: 'You are trying to delete the default room, you need to set another room as default first'
                +' (Set default > Save as default).',
            messageClass: 'alert',
            cancelText: 'Ok',
            cancelClass: 'button-primary'
        };
        this.bind();
    }

    bind()
    {
        document.addEventListener('submit', (event) => this.onDeleteSubmitCapture(event), true);
        document.addEventListener('click', (event) => this.onDeleteSelectionClickCapture(event), true);
    }

    onDeleteSubmitCapture(event)
    {
        let form = event.target;
        if(!form || !form.classList.contains('form-delete')){
            return;
        }
        if(!this.containsDefaultRoom(this.collectFormIds(form))){
            return;
        }
        this.preventDeleteWithWarning(event);
    }

    onDeleteSelectionClickCapture(event)
    {
        if(!event.target.closest || !event.target.closest('.list-delete-selection')){
            return;
        }
        if(!this.containsDefaultRoom(this.collectCheckedIds())){
            return;
        }
        this.preventDeleteWithWarning(event);
    }

    preventDeleteWithWarning(event)
    {
        event.preventDefault();
        event.stopImmediatePropagation();
        adminFunctions.showConfirmDialog((confirmed) => {
            return confirmed;
        }, this.warningOptions);
        let confirmButton = document.querySelector('.confirm-dialog .dialog-confirm');
        if(confirmButton){
            confirmButton.classList.add('hidden');
        }
    }

    collectFormIds(form)
    {
        let formIds = [];
        for(let idInput of form.querySelectorAll('input[name="ids[]"]')){
            formIds.push(String(idInput.value));
        }
        return formIds;
    }

    collectCheckedIds()
    {
        let checkedIds = [];
        for(let checkbox of document.querySelectorAll('.ids-checkbox')){
            if(checkbox.checked){
                checkedIds.push(String(checkbox.value));
            }
        }
        return checkedIds;
    }

    containsDefaultRoom(deleteIds)
    {
        let flagElement = document.querySelector('[data-default-room-id]');
        if(!flagElement || !flagElement.dataset.defaultRoomId){
            return false;
        }
        return -1 !== deleteIds.indexOf(flagElement.dataset.defaultRoomId);
    }
}

new RoomsDefaultRoomDeleteBlocker();
