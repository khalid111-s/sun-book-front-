if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch((error) => {
            console.error('Service worker registration failed:', error);
        });
    });
}
