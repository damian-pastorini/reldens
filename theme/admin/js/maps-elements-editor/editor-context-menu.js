class EditorContextMenu
{
    constructor(editor)
    {
        this.editor = editor;
        this.element = null;
        this.targetInstanceId = null;
        this.outsideClickHandler = null;
    }

    show(instanceId, x, y)
    {
        this.targetInstanceId = instanceId;
        if(!this.element){
            this.element = this.buildMenu();
            document.body.appendChild(this.element);
            this.outsideClickHandler = (event) => {
                if(!this.element.contains(event.target)){
                    this.hide();
                }
            };
        }
        this.element.style.left = x+'px';
        this.element.style.top = y+'px';
        this.element.classList.remove('hidden');
        this.clampToViewport();
        document.addEventListener('mousedown', this.outsideClickHandler);
    }

    clampToViewport()
    {
        let rect = this.element.getBoundingClientRect();
        if(rect.right > window.innerWidth){
            this.element.style.left = Math.max(0, window.innerWidth - rect.width - 5)+'px';
        }
        if(rect.bottom > window.innerHeight){
            this.element.style.top = Math.max(0, window.innerHeight - rect.height - 5)+'px';
        }
    }

    hide()
    {
        if(!this.element){
            return;
        }
        this.element.classList.add('hidden');
        this.targetInstanceId = null;
        if(this.outsideClickHandler){
            document.removeEventListener('mousedown', this.outsideClickHandler);
        }
    }

    isOpen()
    {
        return this.element && !this.element.classList.contains('hidden');
    }

    buildMenu()
    {
        let menu = document.createElement('div');
        menu.className = 'element-context-menu hidden';
        menu.appendChild(
            EditorButtonFactory.create('Duplicate', 'button-primary', () => this.onDuplicate())
        );
        menu.appendChild(
            EditorButtonFactory.create('Delete', 'button-danger', () => this.onDelete())
        );
        return menu;
    }

    onDuplicate()
    {
        let target = this.targetInstanceId;
        this.hide();
        this.editor.requestDuplicate(target);
    }

    onDelete()
    {
        let target = this.targetInstanceId;
        this.hide();
        this.editor.confirmDeleteElement(target);
    }
}
window.EditorContextMenu = EditorContextMenu;
