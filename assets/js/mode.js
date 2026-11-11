(() => {
    try {
        if (localStorage.getItem('ems-site-mode') === 'plain') {
            document.documentElement.dataset.mode = 'plain';
        }
    } catch {
        // Storage can be unavailable in private or restricted browsing.
    }
})();
