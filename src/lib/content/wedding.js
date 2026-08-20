/**
 * Every wedding fact and all four locales, extracted verbatim from the original
 * design artifact. This is the single source of truth: the page renders from it
 * AND the chatbot's system prompt is built from it (see $lib/server/chat.js), so
 * the bot can never contradict the schedule printed above it.
 *
 * To change a fact, change it here and in the other three locales. Nowhere else.
 */

/** @typedef {'fr'|'en'|'ar'|'fa'} Lang */

/** @type {Lang[]} */
export const LANGS = ['fr', 'en', 'ar', 'fa'];

/** Languages that read right-to-left. */
export const RTL = new Set(['ar', 'fa']);

/** @type {Lang} */
export const DEFAULT_LANG = 'fr';

/**
 * Facts shared across every locale — they are not translated because they are
 * proper nouns, numbers or URLs.
 *
 * TODO(content): every value marked PLACEHOLDER needs the real thing before launch.
 */
export const SHARED = {
  // The venue address is public information — guests need it, and it is printed
  // on the page. It lives here.
  // TODO(content): the street number is missing from the original artifact.
  addressLine1: 'rue de la Prairie de Rocourt',
  addressLine2: '95470 Fosses',

  // There are deliberately NO phone numbers anywhere on this site, and none in
  // this repo. Guests who need a person are pointed at the couple directly; the
  // chatbot's handoff says the same and is told never to produce a number.
  // The `contact`/`contactValue` locale keys were removed with them.
  // PLACEHOLDER: the shared album guests drop photos into. Empty hides the link.
  photoDropUrl: '',
  // Drop a hand-drawn plan at static/plan.jpg and set this to '/plan.jpg'.
  // The four pins are positioned in percentages, so they scale over any image.
  gardenPlanImage: '',
  isoDate: '2026-09-05',
  names: { latin: ['Leïla', 'Mohammad-Amine'], arabic: 'ليلى و محمد أمين', persian: 'لیلا و محمدامین' },
  monogram: 'L & M'
};

/** Pin positions over the garden plan, as percentages so they scale with it. */
export const PIN_POS = [
  { left: '14%', top: '16%' },
  { left: '58%', top: '34%' },
  { left: '22%', top: '58%' },
  { left: '64%', top: '78%' }
];

/** Digits used for pin labels — Eastern Arabic in ar/fa, Latin elsewhere. */
export const PIN_DIGITS = { ltr: ['1', '2', '3', '4'], rtl: ['١', '٢', '٣', '٤'] };

export const STR = {
  fr: {
    date: "samedi 5 septembre 2026", town: "Fosses", rsvpCta: "je réponds",
    welcomeKicker: "Bienvenue",
    welcome1: "Nous nous marions dans le jardin de la maison des parents d'Amine. Il y a des arbres, de la place à l'ombre, et de quoi rester tard.",
    welcome2: "Vous venez de Casablanca, de Téhéran, d'Alger, de Palerme ou du bout de la rue. Cette page rassemble tout ce qu'il faut savoir pour arriver tranquille.",
    dayTitle: "Le déroulé",
    essTitle: "Les essentiels", planPlaceholder: "plan annoté du jardin — à fournir",
    chatTitle: "Une question ?", chatSub: "Demandez-nous ce que vous voulez. Si personne ne répond tout de suite, la réponse est probablement déjà là.",
    chatPlaceholder: "Posez votre question…", send: "envoyer",
    rsvpTitle: "Répondez-nous", rsvpSub: "Avant le 15 juillet 2026, si possible.",
    yes: "j'y serai", no: "je ne peux pas",
    fName: "votre nom", fCount: "combien serez-vous", fSong: "un morceau à passer", fSongPh: "titre, artiste…",
    fWord: "un mot pour nous", sendRsvp: "envoyer",
    thanksTitle: "C'est noté", thanksBody: "Merci. On vous attend le 5 septembre, sous les arbres.",
    address: "l'adresse",
    signoff: "À très vite",
    schedule: [
      { time: "13h30", title: "La mairie", note: "En cercle restreint — nous prévenons directement les personnes concernées." },
      { time: "15h", title: "Le repas au jardin", note: "On arrive quand on veut à partir de 15h. Ça dure tout l'après-midi." },
      { time: "19h", title: "Le gâteau", note: "Puis la musique, aussi longtemps que vous voulez." }
    ],
    pins: [
      { label: "1 · le portail", text: "L'entrée se fait par le portail vert. Il reste ouvert, entrez directement." },
      { label: "2 · les tables", text: "Les tables sont dressées côté jardin. Pas de plan de table, installez-vous." },
      { label: "3 · le grand arbre", text: "C'est là qu'on se retrouve en arrivant. Le sol est en herbe — évitez les talons fins." },
      { label: "4 · le stationnement", text: "Stationnement libre dans la rue. Venez à plusieurs par voiture si vous pouvez." }
    ],
    facts: [
      { label: "en train", value: "RER D jusqu'à Survilliers-Fosses, puis le bus 4. Comptez vingt minutes depuis la gare." },
      { label: "en voiture", value: "Une heure depuis Paris par l'A1. Stationnement dans la rue." },
      { label: "la tenue", value: "Élégant et confortable. On est dehors, sur l'herbe, du début à la fin — chaussures plates conseillées." },
      { label: "la météo", value: "Début septembre : doux le jour, frais le soir. Prenez une veste." }
    ],
    chips: [
      { q: "Comment venir ?", a: "RER D jusqu'à Survilliers-Fosses, puis le bus 4 — vingt minutes de porte à porte. En voiture, une heure depuis Paris par l'A1." },
      { q: "Je m'habille comment ?", a: "Élégant et confortable. Tout se passe dehors sur l'herbe : privilégiez les chaussures plates et prenez une veste pour le soir." },
      { q: "Il y a un parking ?", a: "Pas de parking dédié, mais le stationnement est libre dans la rue. Covoiturez si vous pouvez." },
      { q: "Les enfants sont invités ?", a: "Oui. Le jardin est clos et il y a de la place pour courir." }
    ],
    fallback: "Bonne question — on n'a pas encore la réponse ici. Écrivez-nous directement et on vous répond dans la journée."
  },
  en: {
    date: "saturday 5 september 2026", town: "Fosses", rsvpCta: "i'm replying",
    welcomeKicker: "Welcome",
    welcome1: "We're getting married in the garden of Amine's parents' house. There are trees, shade, and room to stay late.",
    welcome2: "You're coming from Casablanca, Tehran, Algiers, Palermo or just down the road. This page has everything you need to arrive without worrying.",
    dayTitle: "The day",
    essTitle: "The essentials", planPlaceholder: "annotated garden plan — to be supplied",
    chatTitle: "A question?", chatSub: "Ask us anything. If nobody answers right away, the answer is probably already here.",
    chatPlaceholder: "Ask your question…", send: "send",
    rsvpTitle: "Reply to us", rsvpSub: "Before 15 July 2026 if you can.",
    yes: "i'll be there", no: "i can't make it",
    fName: "your name", fCount: "how many of you", fSong: "a song to play", fSongPh: "title, artist…",
    fWord: "a word for us", sendRsvp: "send",
    thanksTitle: "Noted", thanksBody: "Thank you. We'll see you on 5 September, under the trees.",
    address: "the address",
    signoff: "See you very soon",
    schedule: [
      { time: "1.30pm", title: "The town hall", note: "A small circle only — we're telling those concerned directly." },
      { time: "3pm", title: "Lunch in the garden", note: "Come any time from 3pm. It runs all afternoon." },
      { time: "7pm", title: "The cake", note: "Then music, for as long as you like." }
    ],
    pins: [
      { label: "1 · the gate", text: "Come in through the green gate. It stays open — walk straight in." },
      { label: "2 · the tables", text: "Tables are set on the garden side. No seating plan, sit where you like." },
      { label: "3 · the big tree", text: "That's where we gather as people arrive. The ground is grass — avoid thin heels." },
      { label: "4 · parking", text: "Free street parking. Share a car if you can." }
    ],
    facts: [
      { label: "by train", value: "RER D to Survilliers-Fosses, then bus 4. About twenty minutes from the station." },
      { label: "by car", value: "An hour from Paris on the A1. Street parking." },
      { label: "dress", value: "Elegant and comfortable. We're outdoors on grass the whole time — flat shoes are wise." },
      { label: "weather", value: "Early September: mild by day, cool at night. Bring a jacket." }
    ],
    chips: [
      { q: "How do I get there?", a: "RER D to Survilliers-Fosses, then bus 4 — twenty minutes door to door. By car, an hour from Paris on the A1." },
      { q: "What should I wear?", a: "Elegant and comfortable. Everything happens outdoors on grass: flat shoes, and a jacket for the evening." },
      { q: "Is there parking?", a: "No dedicated car park, but street parking is free. Share a car if you can." },
      { q: "Are children invited?", a: "Yes. The garden is enclosed and there's room to run." }
    ],
    fallback: "Good question — we don't have that answer here yet. Write to us directly and we'll reply the same day."
  },
  ar: {
    date: "السبت ٥ سبتمبر ٢٠٢٦", town: "فوس", rsvpCta: "أؤكد حضوري",
    welcomeKicker: "أهلاً بكم",
    welcome1: "سنتزوّج في حديقة منزل والدَي أمين. هناك أشجار وظلّ ومكان يتيح البقاء حتى وقت متأخر.",
    welcome2: "تأتون من الدار البيضاء ومن طهران ومن الجزائر ومن باليرمو ومن آخر الشارع. في هذه الصفحة كل ما تحتاجونه للوصول بسهولة.",
    dayTitle: "برنامج اليوم",
    essTitle: "الأساسيات", planPlaceholder: "مخطط الحديقة — سيُضاف لاحقاً",
    chatTitle: "لديكم سؤال؟", chatSub: "اسألونا عمّا تريدون. إن لم يردّ أحد فوراً، فالجواب موجود هنا على الأغلب.",
    chatPlaceholder: "اكتبوا سؤالكم…", send: "إرسال",
    rsvpTitle: "أجيبونا", rsvpSub: "قبل ١٥ يوليو ٢٠٢٦ إن أمكن.",
    yes: "سأحضر", no: "لا أستطيع الحضور",
    fName: "الاسم", fCount: "عدد الحاضرين", fSong: "أغنية تحبّون سماعها", fSongPh: "العنوان، الفنان…",
    fWord: "كلمة لنا", sendRsvp: "إرسال",
    thanksTitle: "وصلنا ردّكم", thanksBody: "شكراً لكم. نراكم في الخامس من سبتمبر، تحت الأشجار.",
    address: "العنوان",
    signoff: "إلى اللقاء قريباً",
    schedule: [
      { time: "١٣:٣٠", title: "البلدية", note: "في نطاق ضيّق — سنبلغ المعنيين مباشرة." },
      { time: "١٥:٠٠", title: "الغداء في الحديقة", note: "تعالوا في أي وقت بعد الثالثة. يمتدّ طول العصر." },
      { time: "١٩:٠٠", title: "الكعكة", note: "ثم الموسيقى، ما شاء لكم البقاء." }
    ],
    pins: [
      { label: "١ · البوابة", text: "الدخول من البوابة الخضراء. تبقى مفتوحة، ادخلوا مباشرة." },
      { label: "٢ · الطاولات", text: "الطاولات في جهة الحديقة. لا يوجد ترتيب للجلوس، اجلسوا كما تشاؤون." },
      { label: "٣ · الشجرة الكبيرة", text: "هنا نلتقي عند الوصول. الأرض عشب — تجنّبوا الكعب الرقيق." },
      { label: "٤ · مواقف السيارات", text: "الوقوف حرّ في الشارع. شاركوا السيارة إن أمكن." }
    ],
    facts: [
      { label: "بالقطار", value: "خط RER D حتى Survilliers-Fosses ثم الحافلة ٤. نحو عشرين دقيقة من المحطة." },
      { label: "بالسيارة", value: "ساعة من باريس عبر A1. الوقوف في الشارع." },
      { label: "اللباس", value: "أنيق ومريح. نحن في الخارج على العشب طول الوقت — الأحذية المسطّحة أفضل." },
      { label: "الطقس", value: "بداية سبتمبر: معتدل نهاراً وبارد ليلاً. خذوا معكم سترة." }
    ],
    chips: [
      { q: "كيف نصل؟", a: "خط RER D حتى Survilliers-Fosses ثم الحافلة ٤ — عشرون دقيقة من الباب إلى الباب. بالسيارة، ساعة من باريس عبر A1." },
      { q: "ماذا نلبس؟", a: "أنيق ومريح. كل شيء في الخارج على العشب: أحذية مسطّحة وسترة للمساء." },
      { q: "هل هناك مواقف؟", a: "لا يوجد موقف مخصّص، لكن الوقوف حرّ في الشارع." },
      { q: "هل الأطفال مدعوّون؟", a: "نعم. الحديقة مسوّرة وفيها مساحة للّعب." }
    ],
    fallback: "سؤال جيّد — الجواب غير متوفّر هنا بعد. اكتبوا لنا مباشرة ونردّ في اليوم نفسه."
  },
  fa: {
    date: "شنبه ۱۴ شهریور ۱۴۰۵", town: "فوس", rsvpCta: "پاسخ می‌دهم",
    welcomeKicker: "خوش آمدید",
    welcome1: "ما در باغ خانه‌ی پدر و مادر امین ازدواج می‌کنیم. درخت هست، سایه هست، و جا برای ماندن تا دیروقت.",
    welcome2: "از کازابلانکا، تهران، الجزیره، پالرمو یا همین نزدیکی می‌آیید. هر چه برای رسیدن بی‌دغدغه لازم است در این صفحه آمده.",
    dayTitle: "برنامهٔ روز",
    essTitle: "نکته‌های ضروری", planPlaceholder: "نقشهٔ باغ — بعداً اضافه می‌شود",
    chatTitle: "سؤالی دارید؟", chatSub: "هر چه می‌خواهید بپرسید. اگر کسی فوری جواب نداد، پاسخ احتمالاً همین‌جا هست.",
    chatPlaceholder: "سؤالتان را بنویسید…", send: "ارسال",
    rsvpTitle: "به ما پاسخ دهید", rsvpSub: "اگر می‌شود پیش از ۲۴ تیر ۱۴۰۵.",
    yes: "می‌آیم", no: "نمی‌توانم بیایم",
    fName: "نام شما", fCount: "چند نفر می‌آیید", fSong: "آهنگی برای پخش", fSongPh: "نام آهنگ، خواننده…",
    fWord: "یک کلام برای ما", sendRsvp: "ارسال",
    thanksTitle: "ثبت شد", thanksBody: "سپاسگزاریم. پنجم سپتامبر، زیر درخت‌ها می‌بینیمتان.",
    address: "نشانی",
    signoff: "به‌زودی می‌بینیمتان",
    schedule: [
      { time: "۱۳:۳۰", title: "شهرداری", note: "در جمعی کوچک — به افراد مربوط مستقیم خبر می‌دهیم." },
      { time: "۱۵:۰۰", title: "ناهار در باغ", note: "از ساعت سه هر وقت خواستید بیایید. تا عصر ادامه دارد." },
      { time: "۱۹:۰۰", title: "کیک", note: "بعد موسیقی، هر چقدر که بخواهید." }
    ],
    pins: [
      { label: "۱ · دروازه", text: "ورود از دروازهٔ سبز است. باز می‌ماند، مستقیم بیایید داخل." },
      { label: "۲ · میزها", text: "میزها سمت باغ چیده شده. جای نشستن تعیین‌شده نیست." },
      { label: "۳ · درخت بزرگ", text: "هنگام رسیدن همان‌جا جمع می‌شویم. زمین چمن است — کفش پاشنه‌باریک نپوشید." },
      { label: "۴ · پارکینگ", text: "پارک در خیابان آزاد است. اگر می‌شود چند نفری با یک ماشین بیایید." }
    ],
    facts: [
      { label: "با قطار", value: "خط RER D تا Survilliers-Fosses، بعد اتوبوس ۴. حدود بیست دقیقه از ایستگاه." },
      { label: "با ماشین", value: "یک ساعت از پاریس با A1. پارک در خیابان." },
      { label: "پوشش", value: "شیک و راحت. تمام مدت بیرون روی چمن هستیم — کفش تخت بهتر است." },
      { label: "هوا", value: "اوایل سپتامبر: روز ملایم، شب خنک. یک کت بردارید." }
    ],
    chips: [
      { q: "چطور بیاییم؟", a: "خط RER D تا Survilliers-Fosses و بعد اتوبوس ۴ — بیست دقیقه از در تا در. با ماشین یک ساعت از پاریس با A1." },
      { q: "چه بپوشیم؟", a: "شیک و راحت. همه‌چیز بیرون روی چمن است: کفش تخت و یک کت برای شب." },
      { q: "پارکینگ دارید؟", a: "پارکینگ اختصاصی نیست، اما پارک در خیابان آزاد است." },
      { q: "بچه‌ها هم دعوت‌اند؟", a: "بله. باغ محصور است و جا برای دویدن دارد." }
    ],
    fallback: "سؤال خوبی است — پاسخش هنوز اینجا نیست. مستقیم به ما پیام بدهید، همان روز جواب می‌دهیم."
  }
};

/**
 * @param {string | undefined} lang
 * @returns {Lang}
 */
export function pickLang(lang) {
  return /** @type {Lang} */ (LANGS.includes(/** @type {Lang} */ (lang)) ? lang : DEFAULT_LANG);
}

/** @param {Lang} lang */
export function dirOf(lang) {
  return RTL.has(lang) ? 'rtl' : 'ltr';
}

/** @param {Lang} lang */
export function t(lang) {
  return STR[pickLang(lang)];
}

/**
 * Strings this build needs that the original artifact had no equivalent for.
 * Kept separate so the STR block above stays a verbatim extraction, then merged
 * in below. Add new copy HERE, in all four languages.
 */
const EXTRA = {
  fr: {
    editReply: 'modifier ma réponse',
    photoTitle: 'Les photos',
    photoCta: 'déposer vos photos',
    rateLimited: 'Vous avez posé beaucoup de questions — reprenons dans un moment.',
    botNote: 'Réponses automatiques, à partir des informations de cette page.'
  },
  en: {
    editReply: 'change my reply',
    photoTitle: 'The photos',
    photoCta: 'drop your photos here',
    rateLimited: "That's a lot of questions — let's pick this up in a little while.",
    botNote: 'Answered automatically, from the information on this page.'
  },
  ar: {
    editReply: 'تعديل ردّي',
    photoTitle: 'الصور',
    photoCta: 'شاركوا صوركم',
    rateLimited: 'طرحتم أسئلة كثيرة — لنكمل بعد قليل.',
    botNote: 'إجابات آلية مبنية على المعلومات الواردة في هذه الصفحة.'
  },
  fa: {
    editReply: 'ویرایش پاسخم',
    photoTitle: 'عکس‌ها',
    photoCta: 'عکس‌هایتان را اینجا بگذارید',
    rateLimited: 'سؤال‌های زیادی پرسیدید — کمی بعد ادامه دهیم.',
    botNote: 'پاسخ‌ها خودکار و بر پایهٔ اطلاعات همین صفحه است.'
  }
};

for (const lang of LANGS) Object.assign(STR[lang], EXTRA[lang]);
