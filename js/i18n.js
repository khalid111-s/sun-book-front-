/* =========================================================
   SunBook i18n — English/Arabic language engine
   ---------------------------------------------------------
   - Persists the chosen language in localStorage
   - Sets <html lang> + <html dir> so the browser and CSS both
     know the real reading direction (not a fake mirror effect)
   - Translates any element carrying data-i18n / data-i18n-placeholder /
     data-i18n-aria-label
   - Re-applies itself automatically whenever the header/footer
     (or any other part of the page) gets injected later, and
     whenever the language is toggled — safely, with no infinite
     update loops (it only writes when a value actually changed)
   ========================================================= */
(function () {
    'use strict';

    var STORAGE_KEY = 'sunbook_lang';

    // كل نصوص الواجهة (مش عناوين الكتب ولا اللوجو) بالإنجليزي والعربي
    var dict = {
        en: {
            // ------- Header -------
            'header.promoText': '✨ Become a member today and get 5% off all books and exclusive sessions!',
            'header.promoLink': 'Sign Up Now',
            'header.searchPlaceholder': 'Search collection...',
            'header.signIn': 'Sign In / Register',
            'header.navHome': 'Home',
            'header.navAbout': 'About Us',
            'header.navFaq': 'FAQ',
            'header.navContact': 'Contact Us',
            'header.navPolicies': 'Policies',

            // ------- Footer -------
            'footer.quickLinks': 'Quick Links',
            'footer.about': 'About Us',
            'footer.faq': 'FAQ',
            'footer.contact': 'Contact Us',
            'footer.newsletter': 'Newsletter',
            'footer.emailPlaceholder': 'Enter your email',
            'footer.subscribe': 'Subscribe',
            'footer.followUs': 'Follow Us',
            'footer.privacy': 'Privacy Policy',
            'footer.terms': 'Terms of Service',
            'footer.refund': 'Refund Policy',
            'footer.copyright': '© 2026 The Sun Book. All rights reserved.',

            // ------- Homepage -------
            'index.heroCaption': 'Discover the timeless wisdom hidden in the ancient world.',
            'index.exploreCollection': 'Explore Collection',
            'index.bestOffers': 'Best Offers',
            'index.bestOffersSub': 'Shop our exclusive deals and special offers',
            'index.allProducts': 'All Products',
            'index.allProductsSub': 'Explore our complete collection of ancient mysteries and wisdom',
            'index.bookingWith': 'Exclusive one-on-one with Ahmed Salem',
            'index.duration': '30 minutes',
            'index.fromPrice': 'From LE 199.00',
            'index.available': 'Available',
            'index.viewFullDetails': 'View full details',
            'index.bookNow': 'Book now',

            // ------- Booking modal -------
            'modal.bookMeeting': 'Book a 30 minutes meeting',
            'modal.quantity': 'Quantity 1',
            'modal.whatTime': 'What time works best?',
            'modal.cairoTime': 'Cairo Time',
            'modal.cancellationPolicy': 'Free cancellation up to 4 hours before your session. After that, the booking is final.',
            'modal.confirmBook': 'Confirm & Book',
            'modal.booking': 'Booking...',

            // ------- Product card microcopy (titles/descriptions stay as entered in the DB) -------
            'product.price': 'PRICE',
            'product.addToCart': 'Add to cart',
            'product.outOfStock': 'Out of Stock',
            'product.egyptOnly': 'Egypt Only',
            'product.noOffers': 'No offers right now.',
            'product.noProducts': 'No products yet.',
            'product.loadError': 'Could not load products. Please refresh the page.',

            // ------- Product detail page (product.html) -------
            'product.loadingTitle': 'Loading...',
            'product.loadingDesc': "Loading the book's details and the mysteries within...",
            'product.readMore': 'Read More',
            'product.readLess': 'Read Less',
            'product.previewBook': 'Preview book',
            'product.closePreview': 'Close preview',
            'product.previewComingSoon': 'Full page preview — coming soon',
            'product.tabDetails': 'Edition Details',
            'product.tabReviews': 'Reader Reviews',
            'product.status': 'Status',
            'product.tba': 'To be announced soon',
            'product.yourRating': 'Your rating',
            'product.star1': '1 star',
            'product.star2': '2 stars',
            'product.star3': '3 stars',
            'product.star4': '4 stars',
            'product.star5': '5 stars',
            'product.shareThoughts': 'Share your thoughts about this book...',
            'product.submitReview': 'Submit Review',
            'product.deleteReview': 'Delete my review',
            'product.signInToReview': 'Sign in to leave a rating and share your opinion about this book.',
            'product.signInLink': 'Sign In',
            'product.noReviewsYet': 'No reviews yet. Be the first to share your opinion about this book!',
            'product.relatedTitle': 'You Might Also Like',
            'product.relatedSubtitle': 'More treasures from our collection worth exploring',
            'product.prevBooks': 'Previous books',
            'product.nextBooks': 'Next books',
            'product.notFound': 'Product Not Found',
            'product.notFoundDesc': 'This book is no longer available.',
            'product.selectStarFirst': 'Please select a star rating first',
            'product.writeCommentFirst': 'Please write a short comment',
            'product.thanksReview': 'Thanks for your review!',
            'product.couldNotSubmitReview': 'Could not submit review',
            'product.reviewDeleted': 'Review deleted',
            'product.couldNotDeleteReview': 'Could not delete review',
            'product.addedToCart': 'Product successfully added to cart!',

            // ------- Cart page (cart.html) -------
            'cart.yourCart': 'Your Cart',
            'cart.emptyCart': 'Your cart is empty!',
            'cart.signInToCheckout': 'Please sign in to complete your order!',
            'cart.emptyTitle': 'Your cart is empty',
            'cart.emptyText': "Looks like you haven't added any books yet. Explore our collection of ancient wisdom and find your next great read.",
            'cart.browseBooks': 'Browse Books',
            'cart.typeDigital': 'Digital (PDF)',
            'cart.typeSession': 'Session',
            'cart.typePhysical': 'Physical Book',
            'cart.remove': 'Remove',
            'cart.orderSummary': 'Order Summary',
            'cart.subtotal': 'Subtotal',
            'cart.memberDiscount': 'Member Discount (5%)',
            'cart.promoLabel': 'Promo',
            'cart.promoPlaceholder': 'Enter code',
            'cart.promoPlaceholderExample': 'Enter code (e.g. SUN7)',
            'cart.applied': 'Applied',
            'cart.apply': 'Apply',
            'cart.total': 'Total',
            'cart.proceedCheckout': 'Proceed to Checkout',
            'cart.enterCode': 'Please enter a code.',
            'cart.checking': 'Checking...',
            'cart.invalidCode': 'Invalid promo code.',

            // ------- Auth page (login.html) -------
            'auth.signIn': 'Sign In',
            'auth.register': 'Register',
            'auth.emailAddress': 'Email Address',
            'auth.password': 'Password',
            'auth.forgotPassword': 'Forgot Password?',
            'auth.fullName': 'Full Name',
            'auth.createAccount': 'Create Account',
            'auth.orContinueWith': 'or continue with',
            'auth.facebookNotConfigured': 'Facebook login is not configured yet.',

            // ------- Checkout page (checkout.html) -------
            'checkout.instantDigitalTitle': 'Instant Digital Delivery',
            'checkout.instantDigitalText': 'No shipping needed. Your books will be available for download immediately after payment.',
            'checkout.shippingAddress': 'Shipping Address',
            'checkout.firstName': 'First Name',
            'checkout.lastName': 'Last Name',
            'checkout.fullAddress': 'Full Address (Street, Building, Apt)',
            'checkout.selectGovernorate': 'Select Governorate',
            'checkout.selectDistrict': 'Select District',
            'checkout.select': 'Select',
            'checkout.paymentMethod': 'Payment Method',
            'checkout.securePaymentNotice': "You'll be redirected to our secure payment page to enter your card or mobile wallet details safely.",
            'checkout.payNowComplete': 'Pay Now & Complete Order',
            'checkout.payConfirmSession': 'Pay & Confirm Session',
            'checkout.payDownloadNow': 'Pay & Download Now',
            'checkout.processing': 'Processing...',
            'checkout.discount': 'Discount',
            'checkout.totalToPay': 'Total to pay',
            'checkout.paymentSuccessful': 'Payment Successful!',
            'checkout.orderPlacedSecurely': 'Your order has been placed securely.',
            'checkout.yourDigitalLibrary': 'Your Digital Library',
            'checkout.goToProfile': 'Go to My Profile',
            'checkout.paymentConfirmedOrder': 'Payment confirmed — order #{orderNum} is on its way.',
            'checkout.paymentNotCompleted': 'Payment Not Completed',
            'checkout.couldNotConfirmPayment': "We couldn't confirm your payment. Your cart is still saved — please try again.",
            'checkout.signInToBookSession': 'Please sign in with your account to book a session.',
            'checkout.bookingFailed': 'Booking failed',
            'checkout.orderFailed': 'Order failed',
            'checkout.downloadsLeft': '{n} Downloads left',
            'checkout.limitReached': 'Limit reached',
            'checkout.downloadLimitReached': 'Download limit reached for this book.',
            'checkout.downloadingPrefix': 'Downloading: ',
            'checkout.fieldRequired': 'This field is required',
            'checkout.invalidEgyptianPhone': 'Please enter a valid Egyptian number (11 digits starting with 01)',
            'checkout.fillAllFields': 'Please fill in all required fields correctly.',
            'checkout.digitalReadyPrefix': 'Your digital books are ready for download. ',
            'checkout.sessionConfirmedFragment': 'Your session has been confirmed. ',
            'checkout.physicalShippedFragment': 'Physical items will be shipped to your address.',
            'checkout.digitalReadyOnly': 'Your digital books are ready! Click below to download.',
            'checkout.sessionBookedPhysical': 'Your session has been booked successfully! Physical items will be shipped to your address.',
            'checkout.sessionBookedOnly': 'Your session has been booked successfully! Check your profile for details.',
            'checkout.orderPlacedGeneric': 'Your order has been placed securely. A receipt has been sent to your email.',
            'checkout.sessionBookingTitle': 'Session Booking',
            'checkout.sessionBookingText': 'Your one-on-one session will be confirmed immediately after payment. No shipping required.',
            'checkout.instantDeliverySessionTitle': 'Instant Delivery & Session',
            'checkout.instantDeliverySessionText': 'Your digital books will be available for download and your session will be confirmed immediately after payment.',
            'checkout.physicalOrderNotice': '<strong>{label}:</strong> Please provide your shipping address below. Your books will be delivered to your door.',
            'checkout.physicalOrderLabel': 'Physical Order',
            'checkout.mixedOrderLabel': 'Mixed Order',
            'checkout.orderSummaryLabel': 'Order Summary',
            'checkout.mixedDigitalPhysicalNotice': '<strong>{label}:</strong> Digital files will be available for instant download. Physical books will be shipped to your address below.',
            'checkout.summaryPhysicalSessionNotice': '<strong>{label}:</strong> Your session will be confirmed after payment. Physical books will be shipped to your address below.',
            'checkout.mixedAllNotice': '<strong>{label}:</strong> Your session will be confirmed and digital files will be available for download. Physical books will be shipped to your address below.',
            // ملحوظة: أسماء المحافظات دي أسماء أماكن رسمية معروفة، فترجمتها مضمونة ودقيقة
            'checkout.gov.Cairo': 'Cairo',
            'checkout.gov.Alexandria': 'Alexandria',
            'checkout.gov.Giza': 'Giza',
            'checkout.gov.Sharqia': 'Sharqia',
            'checkout.gov.Beheira': 'Beheira',
            'checkout.gov.Qalyubia': 'Qalyubia',
            'checkout.gov.Monufia': 'Monufia',
            'checkout.gov.Gharbia': 'Gharbia',
            'checkout.gov.Dakahlia': 'Dakahlia',
            'checkout.gov.KafrElSheikh': 'Kafr El Sheikh',
            'checkout.gov.Damietta': 'Damietta',
            'checkout.gov.PortSaid': 'Port Said',
            'checkout.gov.Suez': 'Suez',
            'checkout.gov.Ismailia': 'Ismailia',
            'checkout.gov.Faiyum': 'Faiyum',
            'checkout.gov.BeniSuef': 'Beni Suef',
            'checkout.gov.Minya': 'Minya',
            'checkout.gov.Asyut': 'Asyut',
            'checkout.gov.Sohag': 'Sohag',
            'checkout.gov.Qena': 'Qena',
            'checkout.gov.Luxor': 'Luxor',
            'checkout.gov.Aswan': 'Aswan',
            'checkout.gov.RedSea': 'Red Sea',
            'checkout.gov.Matrouh': 'Matrouh',
            'checkout.gov.NorthSinai': 'North Sinai',
            'checkout.gov.SouthSinai': 'South Sinai',
            'checkout.gov.NewValley': 'New Valley',

            // ------- Calendar / booking JS -------
            'calendar.fullyBooked': 'Fully booked',

            // ------- Toasts used on the homepage booking flow -------
            'toast.selectDateTime': 'Please select date & time',
            'toast.signInFirst': 'Please sign in first',
            'toast.redirecting': 'Redirecting to payment...',
            'toast.bookedSuccess': 'Booked successfully!'
        },
        ar: {
            // ------- Header -------
            'header.promoText': '✨ اشترك في العضوية الآن واحصل على خصم 5% على جميع الكتب والجلسات الخاصة!',
            'header.promoLink': 'اشترك الآن',
            'header.searchPlaceholder': 'ابحث في المجموعة...',
            'header.signIn': 'تسجيل الدخول / حساب جديد',
            'header.navHome': 'الرئيسية',
            'header.navAbout': 'من نحن',
            'header.navFaq': 'الأسئلة الشائعة',
            'header.navContact': 'تواصل معنا',
            'header.navPolicies': 'السياسات',

            // ------- Footer -------
            'footer.quickLinks': 'روابط سريعة',
            'footer.about': 'من نحن',
            'footer.faq': 'الأسئلة الشائعة',
            'footer.contact': 'تواصل معنا',
            'footer.newsletter': 'النشرة البريدية',
            'footer.emailPlaceholder': 'أدخل بريدك الإلكتروني',
            'footer.subscribe': 'اشتراك',
            'footer.followUs': 'تابعنا',
            'footer.privacy': 'سياسة الخصوصية',
            'footer.terms': 'شروط الخدمة',
            'footer.refund': 'سياسة الاسترجاع',
            'footer.copyright': '© 2026 The Sun Book. جميع الحقوق محفوظة.',

            // ------- Homepage -------
            'index.heroCaption': 'اكتشف الحكمة الخالدة المخبأة في عالم القدماء.',
            'index.exploreCollection': 'استكشف المجموعة',
            'index.bestOffers': 'أفضل العروض',
            'index.bestOffersSub': 'تسوّق عروضنا الحصرية والخاصة',
            'index.allProducts': 'كل المنتجات',
            'index.allProductsSub': 'استكشف مجموعتنا الكاملة من أسرار وحكمة القدماء',
            'index.bookingWith': 'جلسة خاصة فردية مع أحمد سالم',
            'index.duration': '30 دقيقة',
            'index.fromPrice': 'بسعر يبدأ من 199 جنيه',
            'index.available': 'متاح',
            'index.viewFullDetails': 'عرض كل التفاصيل',
            'index.bookNow': 'احجز الآن',

            // ------- Booking modal -------
            'modal.bookMeeting': 'احجز جلسة مدتها 30 دقيقة',
            'modal.quantity': 'الكمية 1',
            'modal.whatTime': 'ما هو الموعد الأنسب لك؟',
            'modal.cairoTime': 'بتوقيت القاهرة',
            'modal.cancellationPolicy': 'إلغاء مجاني حتى 4 ساعات قبل الجلسة، وبعد ذلك يصبح الحجز نهائيًا.',
            'modal.confirmBook': 'تأكيد الحجز',
            'modal.booking': 'جارٍ الحجز...',

            // ------- Product card microcopy -------
            'product.price': 'السعر',
            'product.addToCart': 'أضف إلى السلة',
            'product.outOfStock': 'غير متوفر',
            'product.egyptOnly': 'داخل مصر فقط',
            'product.noOffers': 'لا توجد عروض حاليًا.',
            'product.noProducts': 'لا توجد منتجات بعد.',
            'product.loadError': 'تعذّر تحميل المنتجات. يُرجى تحديث الصفحة.',

            // ------- Product detail page (product.html) -------
            'product.loadingTitle': 'جارٍ التحميل...',
            'product.loadingDesc': 'جارٍ تحميل تفاصيل الكتاب وأسراره...',
            'product.readMore': 'اقرأ المزيد',
            'product.readLess': 'عرض أقل',
            'product.previewBook': 'معاينة الكتاب',
            'product.closePreview': 'إغلاق المعاينة',
            'product.previewComingSoon': 'معاينة الصفحات الكاملة — قريبًا',
            'product.tabDetails': 'تفاصيل الطبعة',
            'product.tabReviews': 'آراء القرّاء',
            'product.status': 'الحالة',
            'product.tba': 'سيُعلن عنها قريبًا',
            'product.yourRating': 'تقييمك',
            'product.star1': 'نجمة واحدة',
            'product.star2': 'نجمتان',
            'product.star3': '3 نجوم',
            'product.star4': '4 نجوم',
            'product.star5': '5 نجوم',
            'product.shareThoughts': 'شاركنا رأيك في هذا الكتاب...',
            'product.submitReview': 'إرسال التقييم',
            'product.deleteReview': 'حذف تقييمي',
            'product.signInToReview': 'سجّل الدخول لإضافة تقييم ومشاركة رأيك في هذا الكتاب.',
            'product.signInLink': 'تسجيل الدخول',
            'product.noReviewsYet': 'لا توجد تقييمات بعد. كن أول من يشارك رأيه في هذا الكتاب!',
            'product.relatedTitle': 'قد يعجبك أيضًا',
            'product.relatedSubtitle': 'كنوز أخرى من مجموعتنا تستحق الاستكشاف',
            'product.prevBooks': 'الكتب السابقة',
            'product.nextBooks': 'الكتب التالية',
            'product.notFound': 'المنتج غير موجود',
            'product.notFoundDesc': 'هذا الكتاب لم يعد متاحًا.',
            'product.selectStarFirst': 'يُرجى اختيار تقييم بالنجوم أولاً',
            'product.writeCommentFirst': 'يُرجى كتابة تعليق قصير',
            'product.thanksReview': 'شكرًا لك على تقييمك!',
            'product.couldNotSubmitReview': 'تعذّر إرسال التقييم',
            'product.reviewDeleted': 'تم حذف التقييم',
            'product.couldNotDeleteReview': 'تعذّر حذف التقييم',
            'product.addedToCart': 'تمت إضافة المنتج إلى السلة بنجاح!',

            // ------- Cart page (cart.html) -------
            'cart.yourCart': 'سلتك',
            'cart.emptyCart': 'سلتك فارغة!',
            'cart.signInToCheckout': 'يُرجى تسجيل الدخول لإتمام طلبك!',
            'cart.emptyTitle': 'سلتك فارغة',
            'cart.emptyText': 'يبدو أنك لم تُضِف أي كتب بعد. استكشف مجموعتنا من حكمة القدماء وابحث عن قراءتك القادمة.',
            'cart.browseBooks': 'تصفّح الكتب',
            'cart.typeDigital': 'نسخة رقمية (PDF)',
            'cart.typeSession': 'جلسة',
            'cart.typePhysical': 'كتاب ورقي',
            'cart.remove': 'إزالة',
            'cart.orderSummary': 'ملخص الطلب',
            'cart.subtotal': 'المجموع الفرعي',
            'cart.memberDiscount': 'خصم الأعضاء (5%)',
            'cart.promoLabel': 'كود الخصم',
            'cart.promoPlaceholder': 'أدخل الكود',
            'cart.promoPlaceholderExample': 'أدخل الكود (مثال: SUN7)',
            'cart.applied': 'تم التطبيق',
            'cart.apply': 'تطبيق',
            'cart.total': 'الإجمالي',
            'cart.proceedCheckout': 'المتابعة إلى الدفع',
            'cart.enterCode': 'يُرجى إدخال كود الخصم.',
            'cart.checking': 'جارٍ التحقق...',
            'cart.invalidCode': 'كود الخصم غير صالح.',

            // ------- Auth page (login.html) -------
            'auth.signIn': 'تسجيل الدخول',
            'auth.register': 'حساب جديد',
            'auth.emailAddress': 'البريد الإلكتروني',
            'auth.password': 'كلمة المرور',
            'auth.forgotPassword': 'نسيت كلمة المرور؟',
            'auth.fullName': 'الاسم الكامل',
            'auth.createAccount': 'إنشاء حساب',
            'auth.orContinueWith': 'أو تابع باستخدام',
            'auth.facebookNotConfigured': 'تسجيل الدخول عبر فيسبوك غير مُفعّل حاليًا.',

            // ------- Checkout page (checkout.html) -------
            'checkout.instantDigitalTitle': 'تسليم رقمي فوري',
            'checkout.instantDigitalText': 'لا حاجة للشحن. ستكون كتبك متاحة للتحميل فور إتمام الدفع.',
            'checkout.shippingAddress': 'عنوان الشحن',
            'checkout.firstName': 'الاسم الأول',
            'checkout.lastName': 'اسم العائلة',
            'checkout.fullAddress': 'العنوان بالكامل (الشارع، المبنى، الشقة)',
            'checkout.selectGovernorate': 'اختر المحافظة',
            'checkout.selectDistrict': 'اختر الحي',
            'checkout.select': 'اختر',
            'checkout.paymentMethod': 'طريقة الدفع',
            'checkout.securePaymentNotice': 'سيتم تحويلك إلى صفحة الدفع الآمنة لإدخال بيانات بطاقتك أو محفظتك الإلكترونية بأمان.',
            'checkout.payNowComplete': 'ادفع الآن وأكمل الطلب',
            'checkout.payConfirmSession': 'ادفع وأكّد الجلسة',
            'checkout.payDownloadNow': 'ادفع وحمّل الآن',
            'checkout.processing': 'جارٍ المعالجة...',
            'checkout.discount': 'الخصم',
            'checkout.totalToPay': 'الإجمالي المطلوب دفعه',
            'checkout.paymentSuccessful': 'تم الدفع بنجاح!',
            'checkout.orderPlacedSecurely': 'تم تسجيل طلبك بأمان.',
            'checkout.yourDigitalLibrary': 'مكتبتك الرقمية',
            'checkout.goToProfile': 'الذهاب إلى حسابي',
            'checkout.paymentConfirmedOrder': 'تم تأكيد الدفع — الطلب رقم #{orderNum} في طريقه إليك.',
            'checkout.paymentNotCompleted': 'لم تكتمل عملية الدفع',
            'checkout.couldNotConfirmPayment': 'تعذّر تأكيد عملية الدفع. سلتك محفوظة كما هي — يُرجى المحاولة مرة أخرى.',
            'checkout.signInToBookSession': 'يُرجى تسجيل الدخول لحجز جلسة.',
            'checkout.bookingFailed': 'فشل الحجز',
            'checkout.orderFailed': 'فشل تنفيذ الطلب',
            'checkout.downloadsLeft': 'باقي {n} تحميلات',
            'checkout.limitReached': 'انتهى الحد المسموح',
            'checkout.downloadLimitReached': 'تم الوصول للحد الأقصى من التحميلات لهذا الكتاب.',
            'checkout.downloadingPrefix': 'جارٍ تحميل: ',
            'checkout.fieldRequired': 'هذا الحقل مطلوب',
            'checkout.invalidEgyptianPhone': 'يُرجى إدخال رقم مصري صحيح (11 رقمًا يبدأ بـ 01)',
            'checkout.fillAllFields': 'يُرجى تعبئة جميع الحقول المطلوبة بشكل صحيح.',
            'checkout.digitalReadyPrefix': 'كتبك الرقمية جاهزة للتحميل. ',
            'checkout.sessionConfirmedFragment': 'تم تأكيد جلستك. ',
            'checkout.physicalShippedFragment': 'سيتم شحن الكتب الورقية إلى عنوانك.',
            'checkout.digitalReadyOnly': 'كتبك الرقمية جاهزة! اضغط أدناه للتحميل.',
            'checkout.sessionBookedPhysical': 'تم حجز جلستك بنجاح! سيتم شحن الكتب الورقية إلى عنوانك.',
            'checkout.sessionBookedOnly': 'تم حجز جلستك بنجاح! راجع حسابك للتفاصيل.',
            'checkout.orderPlacedGeneric': 'تم تسجيل طلبك بأمان. تم إرسال إيصال إلى بريدك الإلكتروني.',
            'checkout.sessionBookingTitle': 'حجز جلسة',
            'checkout.sessionBookingText': 'سيتم تأكيد جلستك الفردية فور إتمام الدفع. لا حاجة للشحن.',
            'checkout.instantDeliverySessionTitle': 'تسليم فوري وجلسة',
            'checkout.instantDeliverySessionText': 'ستكون كتبك الرقمية متاحة للتحميل وستُؤكَّد جلستك فور إتمام الدفع.',
            'checkout.physicalOrderNotice': '<strong>{label}:</strong> يُرجى إدخال عنوان الشحن أدناه. سيتم توصيل كتبك إلى باب منزلك.',
            'checkout.physicalOrderLabel': 'طلب كتب ورقية',
            'checkout.mixedOrderLabel': 'طلب متعدد',
            'checkout.orderSummaryLabel': 'ملخص الطلب',
            'checkout.mixedDigitalPhysicalNotice': '<strong>{label}:</strong> ستكون الملفات الرقمية متاحة للتحميل الفوري. سيتم شحن الكتب الورقية إلى عنوانك أدناه.',
            'checkout.summaryPhysicalSessionNotice': '<strong>{label}:</strong> سيتم تأكيد جلستك بعد الدفع. سيتم شحن الكتب الورقية إلى عنوانك أدناه.',
            'checkout.mixedAllNotice': '<strong>{label}:</strong> سيتم تأكيد جلستك وستكون الملفات الرقمية متاحة للتحميل. سيتم شحن الكتب الورقية إلى عنوانك أدناه.',
            // أسماء المحافظات المصرية - أسماء رسمية معروفة
            'checkout.gov.Cairo': 'القاهرة',
            'checkout.gov.Alexandria': 'الإسكندرية',
            'checkout.gov.Giza': 'الجيزة',
            'checkout.gov.Sharqia': 'الشرقية',
            'checkout.gov.Beheira': 'البحيرة',
            'checkout.gov.Qalyubia': 'القليوبية',
            'checkout.gov.Monufia': 'المنوفية',
            'checkout.gov.Gharbia': 'الغربية',
            'checkout.gov.Dakahlia': 'الدقهلية',
            'checkout.gov.KafrElSheikh': 'كفر الشيخ',
            'checkout.gov.Damietta': 'دمياط',
            'checkout.gov.PortSaid': 'بورسعيد',
            'checkout.gov.Suez': 'السويس',
            'checkout.gov.Ismailia': 'الإسماعيلية',
            'checkout.gov.Faiyum': 'الفيوم',
            'checkout.gov.BeniSuef': 'بني سويف',
            'checkout.gov.Minya': 'المنيا',
            'checkout.gov.Asyut': 'أسيوط',
            'checkout.gov.Sohag': 'سوهاج',
            'checkout.gov.Qena': 'قنا',
            'checkout.gov.Luxor': 'الأقصر',
            'checkout.gov.Aswan': 'أسوان',
            'checkout.gov.RedSea': 'البحر الأحمر',
            'checkout.gov.Matrouh': 'مطروح',
            'checkout.gov.NorthSinai': 'شمال سيناء',
            'checkout.gov.SouthSinai': 'جنوب سيناء',
            'checkout.gov.NewValley': 'الوادي الجديد',

            // ------- Calendar / booking JS -------
            'calendar.fullyBooked': 'محجوز بالكامل',

            // ------- Toasts -------
            'toast.selectDateTime': 'من فضلك اختر التاريخ والوقت',
            'toast.signInFirst': 'من فضلك سجّل الدخول أولاً',
            'toast.redirecting': 'جارٍ تحويلك إلى صفحة الدفع...',
            'toast.bookedSuccess': 'تم الحجز بنجاح!'
        }
    };

    // أسماء الشهور وأيام الأسبوع للكالندر - منفصلة عن القاموس العادي لأنها arrays
    var calendarNames = {
        en: {
            months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            weekdaysShort: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'],
            dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        },
        ar: {
            months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
            weekdaysShort: ['إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت', 'أحد'],
            dayNamesShort: ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
        }
    };

    function getLang() {
        var stored = localStorage.getItem(STORAGE_KEY);
        return stored === 'ar' || stored === 'en' ? stored : 'en';
    }

    function t(key) {
        var lang = getLang();
        var table = dict[lang] || dict.en;
        if (Object.prototype.hasOwnProperty.call(table, key)) return table[key];
        if (Object.prototype.hasOwnProperty.call(dict.en, key)) return dict.en[key];
        return key;
    }

    function getCalendarNames() {
        return calendarNames[getLang()] || calendarNames.en;
    }

    // العربية بتفرّق بين واحد/اتنين/جمع قليل/جمع كتير في العدّ، عكس الإنجليزي
    // اللي بس بيفرّق بين مفرد وجمع. الدالة دي بترجع الصياغة الصح حسب العدد.
    function formatReviewCount(count) {
        if (getLang() === 'ar') {
            if (count === 1) return 'تقييم واحد';
            if (count === 2) return 'تقييمان';
            if (count >= 3 && count <= 10) return `${count} تقييمات`;
            return `${count} تقييمًا`;
        }
        return `${count} review${count === 1 ? '' : 's'}`;
    }

    function setDocumentDirection() {
        var lang = getLang();
        var dir = lang === 'ar' ? 'rtl' : 'ltr';
        if (document.documentElement.getAttribute('lang') !== lang) {
            document.documentElement.setAttribute('lang', lang);
        }
        if (document.documentElement.getAttribute('dir') !== dir) {
            document.documentElement.setAttribute('dir', dir);
        }
    }

    function applyStaticTranslations() {
        var nodes = document.querySelectorAll('[data-i18n]');
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            var val = t(el.getAttribute('data-i18n'));
            if (el.textContent !== val) el.textContent = val;
        }

        var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
        for (var j = 0; j < placeholders.length; j++) {
            var pEl = placeholders[j];
            var pVal = t(pEl.getAttribute('data-i18n-placeholder'));
            if (pEl.getAttribute('placeholder') !== pVal) pEl.setAttribute('placeholder', pVal);
        }

        var arias = document.querySelectorAll('[data-i18n-aria-label]');
        for (var k = 0; k < arias.length; k++) {
            var aEl = arias[k];
            var aVal = t(aEl.getAttribute('data-i18n-aria-label'));
            if (aEl.getAttribute('aria-label') !== aVal) aEl.setAttribute('aria-label', aVal);
        }

        // خلايا أيام الأسبوع في هيدر الكالندر (MO/TU/...) بتتبدل حسب index في مصفوفة weekdaysShort
        var weekdayCells = document.querySelectorAll('[data-i18n-weekday]');
        var weekdayNames = getCalendarNames().weekdaysShort;
        for (var w = 0; w < weekdayCells.length; w++) {
            var wEl = weekdayCells[w];
            var idx = parseInt(wEl.getAttribute('data-i18n-weekday'), 10);
            var wVal = weekdayNames[idx];
            if (wVal !== undefined && wEl.textContent !== wVal) wEl.textContent = wVal;
        }
    }

    function updateToggleButton() {
        var buttons = document.querySelectorAll('.lang-toggle-btn');
        var label = getLang() === 'ar' ? 'English' : 'العربية';
        for (var i = 0; i < buttons.length; i++) {
            var btn = buttons[i];
            if (btn.textContent !== label) btn.textContent = label;
            if (btn.style.display === 'none') btn.style.display = '';
            if (!btn.dataset.bound) {
                btn.dataset.bound = 'true';
                btn.addEventListener('click', function () {
                    var next = getLang() === 'ar' ? 'en' : 'ar';
                    localStorage.setItem(STORAGE_KEY, next);
                    refresh();
                    document.dispatchEvent(new CustomEvent('sunbook:langChanged', { detail: { lang: next } }));
                });
            }
        }
    }

    function refresh() {
        setDocumentDirection();
        applyStaticTranslations();
        updateToggleButton();
    }

    // بيراقب أي جزء من الصفحة بيتغيّر (زي حقن الهيدر/الفوتر أو زرار تسجيل الدخول)
    // ويعيد تطبيق الترجمة تلقائيًا. التحديث بيحصل بس لو القيمة اتغيرت فعليًا،
    // فمفيش خطر لوب لا نهائي حتى لو الـ observer شاف التغييرات دي.
    var observer = new MutationObserver(function () { refresh(); });

    function start() {
        refresh();
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.body) {
        start();
    } else {
        document.addEventListener('DOMContentLoaded', start);
    }

    window.SunBookI18n = {
        t: t,
        getLang: getLang,
        getCalendarNames: getCalendarNames,
        formatReviewCount: formatReviewCount,
        setLanguage: function (lang) {
            localStorage.setItem(STORAGE_KEY, lang === 'ar' ? 'ar' : 'en');
            refresh();
            document.dispatchEvent(new CustomEvent('sunbook:langChanged', { detail: { lang: getLang() } }));
        },
        refresh: refresh
    };
})();
