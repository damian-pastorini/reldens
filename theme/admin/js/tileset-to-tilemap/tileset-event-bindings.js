class TilesetEventBindings
{
    constructor(app)
    {
        this.app = app;
    }

    bind()
    {
        this.app.getElement('.session-name-input').addEventListener('input', (event) => {
            let filtered = event.target.value.replace(/[^a-zA-Z0-9-]/g, '');
            if(filtered !== event.target.value){
                event.target.value = filtered;
            }
        });
        this.app.getElement('.back-btn').addEventListener('click', () => {
            this.app.abortAllRequests();
            location.reload();
        });
        this.app.getElement('.new-session-btn').addEventListener('click', () => {
            if(!this.app.state.length){
                this.app.abortAllRequests();
                location.reload();
                return;
            }
            this.app.modals.show(
                'Are you sure you want to leave the current session?',
                () => {
                    this.app.abortAllRequests();
                    location.reload();
                }
            );
        });
        this.app.getElement('.results-files-toggle-btn').addEventListener('click', () => {
            this.app.getElement('.results-list').classList.toggle('hidden');
        });
        this.app.getElement('.generated-files-toggle-btn').addEventListener('click', () => {
            this.app.getElement('.generated-files-list').classList.toggle('hidden');
            this.app.getElement('.generated-files-search').classList.toggle('hidden');
        });
        this.app.getElement('.generated-files-search').addEventListener('input', (event) => {
            let term = event.target.value.toLowerCase();
            let list = this.app.getElement('.generated-files-list');
            for(let li of list.querySelectorAll('li[data-session-id]')){
                li.classList.toggle('hidden', !li.dataset.sessionId.toLowerCase().includes(term));
            }
        });
        let reviewTopBar = this.app.getElement('.review-top-bar');
        let reviewSection = this.app.getElement('.review-section');
        window.addEventListener('scroll', () => {
            if(reviewSection.classList.contains('hidden')){
                reviewTopBar.classList.remove('is-scrolled');
                return;
            }
            reviewTopBar.classList.toggle('is-scrolled', window.scrollY > 0);
        }, { passive: true });
    }
}
window.TilesetEventBindings = TilesetEventBindings;
