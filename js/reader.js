(() => {
    'use strict';

    const tr = (key, fallback) => window.SunBookI18n ? window.SunBookI18n.t(key) : fallback;
    const token = localStorage.getItem('sunbook_token');
    const productId = new URLSearchParams(window.location.search).get('book');
    const validLogin = token && token !== 'social_dummy_token';
    if (!validLogin) {
        localStorage.setItem('sunbook_redirect_after_login', `reader.html?book=${encodeURIComponent(productId || '')}`);
        window.location.replace('login.html');
        return;
    }
    if (!productId) {
        window.location.replace('profile.html?tab=digital');
        return;
    }

    const pageImage = document.getElementById('readerPage');
    const viewport = document.getElementById('readerViewport');
    const skeleton = document.getElementById('readerSkeleton');
    const status = document.getElementById('readerStatus');
    const counter = document.getElementById('pageCounter');
    const pageInput = document.getElementById('pageNumber');
    const previous = document.getElementById('previousPage');
    const next = document.getElementById('nextPage');
    const titleEl = document.getElementById('readerTitle');
    // الكتب عربية (RTL): الصفحة التالية بتبقى ناحية الشمال (سهم شمال / سحب من الشمال لليمين)
    const BOOK_IS_RTL = true;
    // بنحتفظ بآخر كام صفحة في الذاكرة (blob URLs) عشان الرجوع للصفحة السابقة ميتحسبش طلب جديد على السيرفر
    const MAX_CACHED_PAGES = 6;
    const cache = new Map();
    const inflight = new Map();
    let wantedPage = 1;
    let readToken = '';
    let pageCount = 0;
    let currentPage = 1;
    let requestSerial = 0;
    let zoom = 1;

    const setStatus = (message, isError = false) => {
        status.textContent = message;
        status.classList.toggle('reader-status-error', isError);
    };

    const updateControls = () => {
        counter.textContent = tr('reader.pageOf', 'Page {page} of {total}')
            .replace('{page}', currentPage).replace('{total}', pageCount);
        pageInput.value = currentPage;
        pageInput.max = pageCount;
        previous.disabled = currentPage <= 1;
        next.disabled = currentPage >= pageCount;
    };

    const trimCache = () => {
        while (cache.size > MAX_CACHED_PAGES) {
            let farthest = null;
            for (const page of cache.keys()) {
                if (farthest === null || Math.abs(page - wantedPage) > Math.abs(farthest - wantedPage)) farthest = page;
            }
            if (farthest === null || farthest === wantedPage) break;
            URL.revokeObjectURL(cache.get(farthest));
            cache.delete(farthest);
        }
    };

    const getPageUrl = (page) => {
        if (cache.has(page)) return Promise.resolve(cache.get(page));
        if (inflight.has(page)) return inflight.get(page);
        const request = api.fetchPage(productId, page, readToken)
            .then((blob) => {
                const url = URL.createObjectURL(blob);
                cache.set(page, url);
                trimCache();
                return url;
            })
            .finally(() => inflight.delete(page));
        inflight.set(page, request);
        return request;
    };

    const showPage = async (page, save = true) => {
        if (!Number.isInteger(page) || page < 1 || page > pageCount) return;
        const serial = ++requestSerial;
        wantedPage = page;
        skeleton.hidden = false;
        pageImage.hidden = true;
        setStatus(tr('reader.loading', 'Loading page...'));
        try {
            const url = await getPageUrl(page);
            if (serial !== requestSerial) return;
            pageImage.onload = () => {
                if (serial !== requestSerial) return;
                pageImage.hidden = false;
                skeleton.hidden = true;
                pageImage.style.transform = `scale(${zoom})`;
                setStatus('');
                if (save) {
                    api.saveProgress(productId, page).catch((error) => {
                        console.error('Could not save reader progress:', error);
                    });
                }
                preloadNearbyPages();
            };
            pageImage.onerror = () => {
                if (serial !== requestSerial) return;
                // الصفحة المتخزنة ممكن تكون بايظة: نشيلها من الكاش عشان المحاولة الجاية تجيبها من جديد
                if (cache.get(page) === url) {
                    URL.revokeObjectURL(url);
                    cache.delete(page);
                }
                skeleton.hidden = true;
                setStatus(tr('reader.loadFailed', 'Could not load this page. Please try again.'), true);
            };
            pageImage.src = url;
            currentPage = page;
            updateControls();
            viewport.scrollTo({ top: 0, behavior: 'auto' });
        } catch (error) {
            if (serial !== requestSerial) return;
            skeleton.hidden = true;
            pageImage.hidden = true;
            if (error.status === 401) setStatus(tr('reader.sessionExpired', error.message), true);
            else if (error.status === 403) setStatus(tr('reader.notOwned', error.message), true);
            else if (error.status === 429) setStatus(tr('reader.rateLimited', error.message), true);
            else if (!navigator.onLine) setStatus(tr('reader.offline', 'Reading requires an internet connection.'), true);
            else setStatus(error.message || tr('reader.loadFailed', 'Could not load this page.'), true);
        }
    };

    // بنحمّل الصفحتين الجايين والسابقة مقدمًا (كل طلب بيتحسب في حد الطلبات، فالعدد قليل عمدًا)
    function preloadNearbyPages() {
        [currentPage + 1, currentPage + 2, currentPage - 1].forEach((page) => {
            if (page < 1 || page > pageCount || cache.has(page) || inflight.has(page)) return;
            getPageUrl(page).catch((error) => {
                if (error.status === 401 || error.status === 429) setStatus(error.message, true);
            });
        });
    }

    // اتجاه التقليب: forward = الصفحة التالية في الكتاب
    const goForward = () => showPage(currentPage + 1);
    const goBackward = () => showPage(currentPage - 1);

    document.getElementById('goToPage').addEventListener('click', () => {
        const page = Number(pageInput.value);
        if (Number.isInteger(page)) showPage(page);
    });
    pageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') document.getElementById('goToPage').click();
    });
    previous.addEventListener('click', goBackward);
    next.addEventListener('click', goForward);
    document.getElementById('zoomIn').addEventListener('click', () => {
        zoom = Math.min(2, zoom + 0.15);
        pageImage.style.transform = `scale(${zoom})`;
    });
    document.getElementById('zoomOut').addEventListener('click', () => {
        zoom = Math.max(0.75, zoom - 0.15);
        pageImage.style.transform = `scale(${zoom})`;
    });
    document.addEventListener('keydown', (event) => {
        if (event.target === pageInput) return;
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        const movesForward = BOOK_IS_RTL ? event.key === 'ArrowLeft' : event.key === 'ArrowRight';
        if (movesForward) goForward();
        else goBackward();
    });
    let touchStartX = 0;
    viewport.addEventListener('touchstart', (event) => {
        touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });
    viewport.addEventListener('touchend', (event) => {
        // لو الصفحة متكبّرة، السحب معناه تحريك الصفحة مش تقليبها
        if (zoom > 1) return;
        const distance = event.changedTouches[0].clientX - touchStartX;
        if (Math.abs(distance) <= 55) return;
        const swipedRight = distance > 0;
        const movesForward = BOOK_IS_RTL ? swipedRight : !swipedRight;
        if (movesForward) goForward();
        else goBackward();
    }, { passive: true });
    ['contextmenu', 'selectstart', 'dragstart'].forEach((eventName) => {
        document.addEventListener(eventName, (event) => event.preventDefault());
    });
    document.addEventListener('visibilitychange', () => {
        document.body.classList.toggle('reader-blurred', document.visibilityState === 'hidden');
    });
    window.addEventListener('online', () => {
        if (!pageImage.hidden) return;
        showPage(currentPage, false);
    });
    window.addEventListener('beforeunload', () => {
        for (const url of cache.values()) URL.revokeObjectURL(url);
    });

    if (!navigator.onLine) {
        skeleton.hidden = true;
        setStatus(tr('reader.offline', 'Reading requires an internet connection.'), true);
    } else {
        const getDeviceId = () => {
            let id = localStorage.getItem('sunbook_reader_device');
            if (!id) {
                id = window.crypto?.randomUUID
                    ? window.crypto.randomUUID()
                    : Array.from(window.crypto.getRandomValues(new Uint8Array(16)), (n) => n.toString(16).padStart(2, '0')).join('');
                localStorage.setItem('sunbook_reader_device', id);
            }
            return id;
        };
        api.startReadSession(productId, getDeviceId())
            .then(({ data }) => {
                readToken = data.readToken;
                if (data.title) {
                    titleEl.textContent = data.title;
                    document.title = `${data.title} | The Sun Book`;
                }
                pageCount = data.pageCount;
                currentPage = Math.min(Math.max(1, data.lastPage || 1), pageCount);
                if (!pageCount || !readToken) throw new Error(tr('reader.loadFailed', 'Could not open this book.'));
                showPage(currentPage, false);
            })
            .catch((error) => {
                skeleton.hidden = true;
                if (error.status === 401) setStatus(tr('reader.sessionExpired', error.message), true);
                else if (error.status === 403) setStatus(tr('reader.notOwned', error.message), true);
                else if (error.status === 429) setStatus(tr('reader.rateLimited', error.message), true);
                else setStatus(error.message || tr('reader.loadFailed', 'Could not open this book.'), true);
            });
    }
})();
