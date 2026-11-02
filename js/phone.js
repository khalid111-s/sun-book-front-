// =========================================
// حقل التليفون الدولي (بيقبل رقم من أي دولة)
// =========================================
// الفكرة: بدل "+20" الثابت وصيغة الأرقام المصرية بس، كل حقل تليفون
// (.phone-input-wrapper > .country-code + .phone-field) بيتحوّل لقائمة أكواد دول + خانة الرقم.
//
// - input.value بيرجّع الرقم الكامل بصيغة دولية (+966512345678) أو '' لو الخانة فاضية،
//   وإسناد قيمة له (رقم قديم 01012345678 أو دولي) بيوزّعها تلقائي على الكود والرقم.
//   عشان كده باقي الكود (الحفظ/التعبئة التلقائية/إرسال الطلب) شغّال زي ما هو من غير تعديل.
// - SunBookPhone.validate(input) بترجّع { valid, full, dial, error }.
(function () {
    // [ISO, كود الاتصال, اسم عربي/إنجليزي مختصر]
    const COUNTRIES = [
        ['EG', '20'], ['SA', '966'], ['AE', '971'], ['KW', '965'], ['QA', '974'], ['BH', '973'], ['OM', '968'],
        ['JO', '962'], ['LB', '961'], ['IQ', '964'], ['SY', '963'], ['PS', '970'], ['YE', '967'],
        ['LY', '218'], ['SD', '249'], ['TN', '216'], ['DZ', '213'], ['MA', '212'], ['MR', '222'],
        ['SO', '252'], ['DJ', '253'], ['KM', '269'],
        ['TR', '90'], ['GB', '44'], ['US', '1'], ['DE', '49'], ['FR', '33'], ['IT', '39'], ['ES', '34'],
        ['NL', '31'], ['BE', '32'], ['CH', '41'], ['AT', '43'], ['SE', '46'], ['NO', '47'], ['DK', '45'],
        ['FI', '358'], ['IE', '353'], ['PT', '351'], ['GR', '30'], ['CY', '357'], ['MT', '356'],
        ['PL', '48'], ['CZ', '420'], ['RO', '40'], ['RU', '7'], ['UA', '380'],
        ['IN', '91'], ['PK', '92'], ['BD', '880'], ['ID', '62'], ['MY', '60'], ['SG', '65'], ['PH', '63'],
        ['CN', '86'], ['JP', '81'], ['KR', '82'], ['AU', '61'], ['NZ', '64'],
        ['ZA', '27'], ['NG', '234'], ['KE', '254'], ['ET', '251'], ['BR', '55'], ['MX', '52'], ['AR', '54'],
    ];

    const DIALS_BY_LENGTH = [...new Set(COUNTRIES.map((c) => c[1]))].sort((a, b) => b.length - a.length);
    const DEFAULT_ISO = 'EG';
    const PLACEHOLDERS = { EG: '1XX XXX XXXX', SA: '5X XXX XXXX', AE: '5X XXX XXXX', KW: '5XXX XXXX', QA: '3XXX XXXX', DEFAULT: 'Phone number' };

    const flag = (iso) => String.fromCodePoint(...[...iso].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
    const nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

    const t = (key, fallback) => {
        try { return window.SunBookI18n ? (window.SunBookI18n.t(key) || fallback) : fallback; } catch (e) { return fallback; }
    };

    function findDial(digits) {
        return DIALS_BY_LENGTH.find((d) => digits.startsWith(d)) || null;
    }

    function stripTrunkZero(digits) {
        return digits.startsWith('0') ? digits.slice(1) : digits;
    }

    function getCtx(input) { return input && input._sbPhone; }

    function render(ctx) {
        const { select, input } = ctx;
        input.placeholder = PLACEHOLDERS[select.selectedOptions[0]?.dataset.iso] || PLACEHOLDERS.DEFAULT;
    }

    // بيقسم أي رقم (قديم محلي / دولي) على كود الدولة والرقم المحلي
    function applyFull(ctx, raw) {
        const { select, input } = ctx;
        let s = String(raw == null ? '' : raw).trim();
        if (!s) { nativeValue.set.call(input, ''); return; }
        const hasPlus = s.startsWith('+') || s.startsWith('00');
        let digits = s.replace(/[^0-9]/g, '');
        if (s.startsWith('00')) digits = digits.slice(2);
        if (hasPlus) {
            const dial = findDial(digits);
            if (dial) {
                const opt = [...select.options].find((o) => o.value === dial);
                if (opt) select.value = dial;
                nativeValue.set.call(input, digits.slice(dial.length));
                render(ctx);
                return;
            }
            // كود دولة مش في القائمة: بنسيب الرقم كامل بعلامة + وبيتقبل كرقم دولي
            nativeValue.set.call(input, '+' + digits);
            return;
        }
        // رقم محلي من غير كود: بنفترض الدولة المختارة حاليًا (أو مصر للأرقام القديمة المحفوظة)
        nativeValue.set.call(input, stripTrunkZero(digits));
    }

    function getFull(ctx) {
        const { select, input } = ctx;
        const shown = nativeValue.get.call(input).trim();
        if (!shown) return '';
        if (shown.startsWith('+')) return '+' + shown.replace(/[^0-9]/g, '');
        const digits = shown.replace(/[^0-9]/g, '');
        if (!digits) return '';
        return '+' + select.value + stripTrunkZero(digits);
    }

    function validate(input) {
        const ctx = getCtx(input);
        if (!ctx) return { valid: true, full: String(input.value || '').trim(), dial: '' };
        const full = getFull(ctx);
        if (!full) return { valid: false, full: '', dial: ctx.select.value, error: 'required' };
        const digits = full.slice(1);
        const dial = findDial(digits) || '';
        const national = dial ? digits.slice(dial.length) : digits;

        if (dial === '20') {
            // مصر: موبايل 11 رقم بيبدأ بـ 01 (010/011/012/015)
            if (!/^1[0125]\d{8}$/.test(national)) return { valid: false, full, dial, error: 'egypt' };
            return { valid: true, full, dial };
        }
        // أي دولة تانية: معيار E.164 (الرقم كامل من 8 لـ 15 خانة، والمحلي 6 على الأقل)
        if (digits.length < 8 || digits.length > 15 || (dial && national.length < 6)) {
            return { valid: false, full, dial, error: 'generic' };
        }
        return { valid: true, full, dial };
    }

    // رسالة الخطأ المناسبة (بالمصري لو الدولة مصر، وإلا رسالة عامة)
    function errorMessage(result) {
        if (result && result.error === 'egypt') {
            return t('checkout.invalidEgyptianPhone', 'Please enter a valid Egyptian number (11 digits starting with 01)');
        }
        return t('checkout.invalidPhone', 'Please enter a valid phone number for the selected country');
    }

    function enhance(wrapper) {
        const input = wrapper.querySelector('.phone-field');
        const oldCode = wrapper.querySelector('.country-code');
        if (!input || !oldCode || input._sbPhone) return;

        const select = document.createElement('select');
        select.className = oldCode.className + ' country-code-select';
        select.setAttribute('aria-label', 'Country code');
        select.setAttribute('dir', 'ltr');
        COUNTRIES.forEach(([iso, dial]) => {
            const opt = document.createElement('option');
            opt.value = dial;
            opt.dataset.iso = iso;
            opt.textContent = `${flag(iso)} +${dial}`;
            select.appendChild(opt);
        });
        select.value = '20';
        oldCode.replaceWith(select);

        // شيلنا قيود الأرقام المصرية القديمة من الـ HTML (maxlength=11 / pattern / تحويل أول رقم لـ 0)
        input.removeAttribute('pattern');
        input.removeAttribute('oninput');
        input.oninput = null;
        input.setAttribute('maxlength', '18');
        input.setAttribute('inputmode', 'tel');
        if (!input.getAttribute('autocomplete')) input.setAttribute('autocomplete', 'tel-national');

        const ctx = { select, input, touched: false };
        input._sbPhone = ctx;

        // input.value = الرقم الكامل بالصيغة الدولية
        Object.defineProperty(input, 'value', {
            configurable: true,
            get() { return getFull(ctx); },
            set(v) { applyFull(ctx, v); },
        });

        input.addEventListener('input', () => {
            ctx.touched = true;
            let shown = nativeValue.get.call(input);
            // بنسمح بأرقام بس (وعلامة + في الأول للي يكتب الرقم بكوده)
            const cleaned = (shown.startsWith('+') ? '+' : '') + shown.replace(/[^0-9]/g, '');
            if (cleaned !== shown) { nativeValue.set.call(input, cleaned); shown = cleaned; }
            // لو كتب الرقم بكوده (+966... أو 00966...) بنختار الدولة تلقائيًا ونسيب باقي الرقم
            if (cleaned.startsWith('+') || (cleaned.startsWith('00') && cleaned.length > 2)) {
                applyFull(ctx, cleaned);
            }
            input.dispatchEvent(new CustomEvent('sunbook:phonechange', { bubbles: true }));
        });
        select.addEventListener('change', () => { ctx.touched = true; render(ctx); });

        render(ctx);
        // لو في قيمة متخزنة قبل التحسين (autofill بتاع المتصفح مثلًا)
        const pre = nativeValue.get.call(input);
        if (pre) applyFull(ctx, pre);
    }

    // بنختار كود دولة الزائر تلقائيًا (لو لسه ماختارش بنفسه ومفيش رقم متسجل)
    async function preselectCountry(inputs) {
        let country = null;
        try { country = sessionStorage.getItem('sunbook_country'); } catch (e) {}
        if (!country && typeof api !== 'undefined' && api.getMyCountry) {
            try {
                const { data } = await api.getMyCountry();
                country = data && data.country;
                if (country) { try { sessionStorage.setItem('sunbook_country', country); } catch (e) {} }
            } catch (e) { /* بنسيب الافتراضي (مصر) */ }
        }
        if (!country) return;
        const entry = COUNTRIES.find((c) => c[0] === String(country).toUpperCase());
        if (!entry) return;
        inputs.forEach((input) => {
            const ctx = getCtx(input);
            if (!ctx || ctx.touched || nativeValue.get.call(input)) return;
            ctx.select.value = entry[1];
            render(ctx);
        });
    }

    function init() {
        const inputs = [];
        document.querySelectorAll('.phone-input-wrapper').forEach((w) => {
            enhance(w);
            const i = w.querySelector('.phone-field');
            if (i && i._sbPhone) inputs.push(i);
        });
        if (inputs.length) preselectCountry(inputs);
    }

    window.SunBookPhone = { init, validate, errorMessage, findDial };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
