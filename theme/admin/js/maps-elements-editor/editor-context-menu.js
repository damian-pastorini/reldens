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
            this.editor.ui.container.appendChild(this.element);
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
            this.editor.ui.buildButton('Move back', 'button-secondary', () => this.onMove(-1))
        );
        menu.appendChild(
            this.editor.ui.buildButton('Move front', 'button-secondary', () => this.onMove(1))
        );
        menu.appendChild(
            this.editor.ui.buildButton('Duplicate', 'button-primary', () => this.onDuplicate())
        );
        menu.appendChild(
            this.editor.ui.buildButton('Edit tiles layers', 'button-secondary', () => this.onEditTiles())
        );
        menu.appendChild(
            this.editor.ui.buildButton('Delete', 'button-danger', () => this.onDelete())
        );
        return menu;
    }

    onEditTiles()
    {
        let target = this.targetInstanceId;
        this.hide();
        this.editor.tilesLayerEditor.open(target);
    }

    onMove(direction)
    {
        let target = this.targetInstanceId;
        this.hide();
        if(!this.editor.zOrderSorter.moveElement(target, direction)){
            return;
        }
        this.editor.markDirty();
        this.editor.afterMutation();
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
        this.editor.confirmations.confirmDeleteElement(target);
    }
}
window.EditorContextMenu = EditorContextMenu;
