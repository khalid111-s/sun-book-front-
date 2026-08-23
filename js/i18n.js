/* =========================================================================
   SunbookI18n — نظام تبديل اللغة (إنجليزي/عربي) الخاص بواجهة العميل فقط
   =========================================================================
   الفكرة: كل نص ثابت في الصفحة بياخد data-i18n="key" بدل ما يتكتب مباشرة.
   لما اللغة تتغيّر، بندور على كل عنصر عليه data-i18n ونستبدل النص من القاموس
   اللي تحت، وكمان بنقلب اتجاه الصفحة (dir="rtl") عشان التصميم يتقلب فعليًا
   مش يفضل واقف زي ما هو مع نص عربي جواه.

   ملحوظة مهمة: القاموس ده بيغطي نصوص الواجهة الثابتة بس (هيدر/فوتر/عناوين/
   أزرار). محتوى المنتجات نفسه (الاسم والوصف) بيفضل زي ما الأدمن كاتبه،
   لأن المطلوب حاليًا إن العميل بس هو اللي يشوف عربي، مش لوحة التحكم.
   ========================================================================= */

(function () {
    const STORAGE_KEY = 'sunbook_lang';

    const dictionary = {
        en: {
            // ====== الهيدر (Header) ======
            promo_banner_text: '✨ Become a member today and get 5% off all books and exclusive sessions!',
            promo_banner_link: 'Sign Up Now',
            search_placeholder: 'Search collection...',
            sign_in: 'Sign In / Register',
            nav_home: 'Home',
            nav_about: 'About Us',
            nav_faq: 'FAQ',
            nav_contact: 'Contact Us',
            nav_policies: 'Policies',
            lang_toggle: 'العربية', // بيظهر اسم اللغة التانية اللي هتنقل لها

            // ====== الصفحة الرئيسية (Home) ======
            hero_caption: 'Discover the timeless wisdom hidden in the ancient world.',
            hero_button: 'Explore Collection',
            best_offers_title: 'Best Offers',
            best_offers_subtitle: 'Shop our exclusive deals and special offers',
            all_products_title: 'All Products',
            all_products_subtitle: 'Explore our complete collection of ancient mysteries and wisdom',

            // ====== قسم الحجز على الصفحة الرئيسية (Booking Teaser) ======
            booking_title: 'Exclusive one-on-one with Ahmed Salem',
            booking_duration: '30 minutes',
            booking_price_from: 'From LE 199.00',
            booking_available: 'Available',
            booking_view_details: 'View full details',
            booking_book_now: 'Book now',

            // ====== مودال الحجز (Booking Modal) ======
            modal_weekday_mo: 'MO', modal_weekday_tu: 'TU', modal_weekday_we: 'WE',
            modal_weekday_th: 'TH', modal_weekday_fr: 'FR', modal_weekday_sa: 'SA', modal_weekday_su: 'SU',
            modal_meeting_title: 'Book a 30 minutes meeting',
            modal_quantity: 'Quantity 1',
            modal_time_question: 'What time works best?',
            modal_timezone: 'Cairo Time',
            modal_cancellation_note: 'Free cancellation up to 4 hours before your session. After that, the booking is final.',
            modal_confirm_book: 'Confirm & Book',

            // ====== الفوتر (Footer) ======
            footer_quick_links: 'Quick Links',
            footer_newsletter: 'Newsletter',
            footer_email_placeholder: 'Enter your email',
            footer_subscribe: 'Subscribe',
            footer_follow_us: 'Follow Us',
            footer_privacy: 'Privacy Policy',
            footer_terms: 'Terms of Service',
            footer_refund: 'Refund Policy',
            footer_copyright: '© 2026 The Sun Book. All rights reserved.',

            // ====== نصوص كروت المنتجات (بتتولد من script.js) ======
            add_to_cart: 'Add to cart',
            out_of_stock: 'Out of Stock',
            egypt_only: 'Egypt Only',
            price_label: 'PRICE',
        },
        ar: {
            // ====== الهيدر (Header) ======
            promo_banner_text: '✨ اشترك دلوقتي واحصل على خصم 5% على كل الكتب والحصص الفردية!',
            promo_banner_link: 'اشترك الآن',
            search_placeholder: 'ابحث في المجموعة...',
            sign_in: 'تسجيل الدخول / حساب جديد',
            nav_home: 'الرئيسية',
            nav_about: 'من نحن',
            nav_faq: 'الأسئلة الشائعة',
            nav_contact: 'تواصل معنا',
            nav_policies: 'السياسات',
            lang_toggle: 'English',

            // ====== الصفحة الرئيسية (Home) ======
            hero_caption: 'اكتشف الحكمة الخالدة المخبأة في أعماق العالم القديم.',
            hero_button: 'استكشف المجموعة',
            best_offers_title: 'أفضل العروض',
            best_offers_subtitle: 'تسوّق عروضنا الحصرية والخصومات المميزة',
            all_products_title: 'كل الكتب',
            all_products_subtitle: 'استكشف مجموعتنا الكاملة من أسرار وحكمة العالم القديم',

            // ====== قسم الحجز على الصفحة الرئيسية (Booking Teaser) ======
            booking_title: 'جلسة فردية حصرية مع أحمد سالم',
            booking_duration: '30 دقيقة',
            booking_price_from: 'ابتداءً من 199.00 جنيه',
            booking_available: 'متاح',
            booking_view_details: 'عرض كل التفاصيل',
            booking_book_now: 'احجز الآن',

            // ====== مودال الحجز (Booking Modal) ======
            modal_weekday_mo: 'إث', modal_weekday_tu: 'ثل', modal_weekday_we: 'أر',
            modal_weekday_th: 'خم', modal_weekday_fr: 'جم', modal_weekday_sa: 'سب', modal_weekday_su: 'أح',
            modal_meeting_title: 'احجز جلسة مدتها 30 دقيقة',
            modal_quantity: 'الكمية 1',
            modal_time_question: 'إيه الوقت الأنسب؟',
            modal_timezone: 'بتوقيت القاهرة',
            modal_cancellation_note: 'إلغاء مجاني حتى 4 ساعات قبل موعد الجلسة. بعد كده، الحجز يبقى نهائي.',
            modal_confirm_book: 'تأكيد الحجز',

            // ====== الفوتر (Footer) ======
            footer_quick_links: 'روابط سريعة',
            footer_newsletter: 'النشرة البريدية',
            footer_email_placeholder: 'أدخل بريدك الإلكتروني',
            footer_subscribe: 'اشترك',
            footer_follow_us: 'تابعنا',
            footer_privacy: 'سياسة الخصوصية',
            footer_terms: 'الشروط والأحكام',
            footer_refund: 'سياسة الاسترجاع',
            footer_copyright: '© 2026 ذا صن بوك. جميع الحقوق محفوظة.',

            // ====== نصوص كروت المنتجات (بتتولد من script.js) ======
            add_to_cart: 'أضف إلى السلة',
            out_of_stock: 'نفدت الكمية',
            egypt_only: 'داخل مصر فقط',
            price_label: 'السعر',
        },
    };

    function getStoredLang() {
        try {
            return localStorage.getItem(STORAGE_KEY) || 'en';
        } catch (e) {
            return 'en';
        }
    }

    function setStoredLang(lang) {
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (e) {
            /* لو الخصوصية مانعة localStorage، منكسرش الصفحة */
        }
    }

    // بيرجع النص المترجم لمفتاح معين، وبيرجع المفتاح نفسه لو مش لاقيه (أسهل في التصحيح)
    function t(key) {
        const lang = getStoredLang();
        return (dictionary[lang] && dictionary[lang][key]) || dictionary.en[key] || key;
    }

    // بيدور على كل عنصر عليه data-i18n وبيستبدل نصه، وdata-i18n-placeholder
    // بيستبدل الـ placeholder بتاع الـ input، وdata-i18n-title بيستبدل الـ title
    function applyTranslations() {
        const lang = getStoredLang();

        document.documentElement.setAttribute('lang', lang === 'ar' ? 'ar' : 'en');
        document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            el.textContent = t(key);
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.setAttribute('placeholder', t(key));
        });

        document.querySelectorAll('[data-i18n-title]').forEach((el) => {
            const key = el.getAttribute('data-i18n-title');
            el.setAttribute('title', t(key));
        });

        document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
            const key = el.getAttribute('data-i18n-aria-label');
            el.setAttribute('aria-label', t(key));
        });

        // بنحدّث نص زرار تبديل اللغة نفسه (بيوري اسم اللغة اللي هتنقل لها)
        document.querySelectorAll('.lang-toggle-btn').forEach((btn) => {
            btn.textContent = t('lang_toggle');
        });

        // بنبلّغ أي كود تاني (زي كروت المنتجات في script.js) إن اللغة اتغيرت
        // عشان يعيد رسم أي محتوى ديناميكي فيه نصوص واجهة (مش محتوى المنتج نفسه)
        document.dispatchEvent(new CustomEvent('sunbook:languagechange', { detail: { lang } }));
    }

    function toggleLanguage() {
        const current = getStoredLang();
        const next = current === 'ar' ? 'en' : 'ar';
        setStoredLang(next);
        applyTranslations();
    }

    // تفويض الحدث (Event Delegation) عشان الزرار يشتغل حتى لو اتحقن جوه الهيدر
    // بعد ما الصفحة خلصت التحميل (الهيدر بيتحمل ديناميكيًا بعدين)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.lang-toggle-btn');
        if (btn) {
            e.preventDefault();
            toggleLanguage();
        }
    });

    // أول ما ملف الصفحة نفسه (مش الهيدر/الفوتر) يخلص تحميل، نطبّق الترجمة
    // على أي نص ثابت موجود بالفعل في الصفحة
    document.addEventListener('DOMContentLoaded', applyTranslations);

    // بنكشف الدوال دي عشان أي كود تاني (loader.js لما يحقن الهيدر/الفوتر،
    // أو script.js لما يعيد رسم كروت المنتجات) يقدر يستخدمها
    window.SunbookI18n = {
        t,
        apply: applyTranslations,
        getLang: getStoredLang,
    };
})();
