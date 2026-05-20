class TilesetModalManager
{
    constructor(app)
    {
        this.app = app;
        this.onConfirmAction = null;
        this.onAlternativeAction = null;
        this.confirmQueue = [];
        this.confirmOpen = false;
    }

    showGenerate(message)
    {
        this.app.getElement('.generate-modal-message').textContent = message;
        this.app.getElement('.generate-modal').classList.remove('hidden');
    }

    hideGenerate()
    {
        this.app.getElement('.generate-modal').classList.add('hidden');
    }

    show(message, onConfirmAction, alternativeAction, okClass)
    {
        let request = { message, onConfirmAction, alternativeAction, okClass };
        if(this.confirmOpen){
            this.confirmQueue.push(request);
            return;
        }
        this.openConfirmRequest(request);
    }

    openConfirmRequest(request)
    {
        this.confirmOpen = true;
        this.app.getElement('.confirm-modal-message').textContent = request.message;
        this.onConfirmAction = request.onConfirmAction;
        let extraBtn = this.app.getElement('.confirm-modal-extra');
        extraBtn.classList.toggle('hidden', !request.alternativeAction);
        this.onAlternativeAction = null;
        if(request.alternativeAction){
            extraBtn.textContent = request.alternativeAction.label;
            this.onAlternativeAction = request.alternativeAction.callback;
        }
        let okBtn = this.app.getElement('.confirm-modal-ok');
        okBtn.className = 'button confirm-modal-ok ' + (request.okClass || 'button-primary');
        this.app.getElement('.confirm-modal').classList.remove('hidden');
    }

    hide()
    {
        this.app.getElement('.confirm-modal').classList.add('hidden');
        this.confirmOpen = false;
        if(this.confirmQueue.length){
            this.openConfirmRequest(this.confirmQueue.shift());
        }
    }

    bind()
    {
        this.app.getElement('.confirm-modal-ok').addEventListener('click', () => {
            this.hide();
            if(this.onConfirmAction){
                this.onConfirmAction();
            }
        });
        this.app.getElement('.confirm-modal-extra').addEventListener('click', () => {
            this.hide();
            if(this.onAlternativeAction){
                this.onAlternativeAction();
            }
        });
        for(let dismissBtn of document.querySelectorAll('.confirm-modal-cancel, .confirm-modal-close')){
            dismissBtn.addEventListener('click', () => this.hide());
        }
        let confirmBackdrop = document.querySelector('.confirm-modal .modal-backdrop');
        if(confirmBackdrop){
            confirmBackdrop.addEventListener('click', () => {
                this.hide();
            });
        }
        for(let helpButton of document.querySelectorAll('.help-button')){
            helpButton.addEventListener('click', () => {
                this.app.getElement('.help-modal').classList.remove('hidden');
            });
        }
        this.app.getElement('.modal-close-btn').addEventListener('click', () => {
            this.app.getElement('.help-modal').classList.add('hidden');
        });
        this.app.getElement('.help-modal-backdrop').addEventListener('click', () => {
            this.app.getElement('.help-modal').classList.add('hidden');
        });
    }
}
window.TilesetModalManager = TilesetModalManager;
