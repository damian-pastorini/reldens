(function() {
    let overlay = null;
    let videoEl = null;

    function createModal() {
        overlay = document.createElement('div');
        overlay.id = 'video-modal-overlay';
        overlay.addEventListener('click', closeModal);

        let modal = document.createElement('div');
        modal.id = 'video-modal';
        modal.addEventListener('click', function(e) { e.stopPropagation(); });

        let header = document.createElement('div');
        header.id = 'video-modal-header';

        let titleEl = document.createElement('span');
        titleEl.id = 'video-modal-title';

        let closeBtn = document.createElement('button');
        closeBtn.id = 'video-modal-close';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', closeModal);

        header.appendChild(titleEl);
        header.appendChild(closeBtn);

        videoEl = document.createElement('video');
        videoEl.id = 'video-modal-player';
        videoEl.controls = true;

        modal.appendChild(header);
        modal.appendChild(videoEl);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    function openModal(src, title) {
        if(!overlay) {
            createModal();
        }
        let titleEl = document.getElementById('video-modal-title');
        if(titleEl) {
            titleEl.textContent = title || '';
        }
        videoEl.src = src;
        videoEl.load();
        overlay.classList.add('active');
    }

    function closeModal() {
        if(!overlay) {
            return;
        }
        overlay.classList.remove('active');
        videoEl.pause();
        videoEl.src = '';
    }

    document.addEventListener('click', function(e) {
        let target = e.target;
        if(!target.classList.contains('video-link')) {
            return;
        }
        e.preventDefault();
        let src = target.getAttribute('data-src');
        let title = target.getAttribute('data-title');
        openModal(src, title);
    });

    document.addEventListener('keydown', function(e) {
        if('Escape' !== e.key) {
            return;
        }
        closeModal();
    });
})();
