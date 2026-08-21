/**
 * Every wedding fact and all four locales. This is the single source of truth:
 * the page renders from it AND the chatbot's system prompt is built from it
 * (see $lib/chat-prompt.js), so the bot can never contradict the programme
 * printed above it.
 *
 * To change a fact, change it here and in the other three locales. Nowhere else.
 *
 * The four languages are written natively, not translated from the French.
 * Formal invitation register in each: `يسرّنا أن ندعوكم` in Arabic, `با کمال
 * مسرّت` in Persian. A literal translation of the French reads flat in both.
 */

/** @typedef {'fr'|'en'|'ar'|'fa'} Lang */

/**
 * One row of the programme. It carries EITHER a list of things that happen in
 * that block or a single `note` sentence — Timeline.svelte renders both, and
 * the chatbot's prompt reads both. Naming the shape here is what lets a future
 * entry (the mairie, if it comes back) be a plain note without a type error.
 *
 * @typedef {{ time: string, title: string, items?: string[], note?: string }} ScheduleEntry
 */

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
  // this repo. One email is the single hand-off, and it appears in exactly one
  // place: the chat's give-up line, via `fallbackText()` below. It is NOT in the
  // bot's system prompt — rule 2 there still forbids the model producing any
  // contact detail of its own, because a plausible-looking invented address is
  // worse than "I don't know".
  //
  // TODO(content): set this to the real mailbox. While it is empty the fallback
  // simply omits the sentence, so shipping without it is safe — it is not a
  // broken "write to us at ." on the page.
  email: '',

  // Drop a hand-drawn plan at static/plan.jpg and set this to '/plan.jpg'.
  // The four pins are positioned in percentages, so they scale over any image.
  gardenPlanImage: '',
  isoDate: '2026-09-05',
  names: { latin: ['Leïla', 'Mohammad-Amine'], arabic: 'ليلى و محمد أمين' },

  // What is said at the door, in Arabic script in every locale — the same rule the
  // names follow: this is the greeting itself, not a sentence to be translated.
  // fr/en get a gloss under it (see `salamGloss`); ar/fa need none.
  salam: 'السلام عليكم',

  // Two words, carved one per leaf and read across the shut pair. The array is
  // the split, so the component never has to cut a string it does not own: the
  // line is right-to-left, so [0] is the RIGHT leaf.
  basmala: ['بسم', 'الله'],

  // The couple's phrase — "Iman o Sabr", faith and patience. Arabic script in
  // every locale, like the names: it is a name for the thing, not a sentence to
  // translate.
  motto: 'إيمان و صبر',

  // Qur'an 78:8, in the welcome section under the origins block. Arabic script
  // in every locale for the same reason as the motto; the meaning is carried by
  // `verseGloss`, which is deliberately empty in Arabic — see EXTRA.ar.
  verse: 'وَخَلَقْنَاكُمْ أَزْوَاجًا',

  monogram: 'L & M'
};

/** Pin positions over the garden plan, as percentages so they scale with it. */
export const PIN_POS = [
  { left: '14%', top: '16%' },
  { left: '58%', top: '34%' },
  { left: '22%', top: '58%' },
  { left: '64%', top: '78%' }
];


export const STR = {
  fr: {
    date: "Samedi 5 septembre 2026", town: "Fosses", rsvpCta: "Je réponds",
    welcomeKicker: "Bienvenue",
    welcome1: "Nous avons le plaisir de vous convier à célébrer notre mariage chez les parents de Mohammad-Amine, dans une ambiance intimiste. Ce sera pour nous une grande joie de partager ce moment, ainsi qu'un repas, en votre compagnie, dans une atmosphère que nous espérons chaleureuse et conviviale.",
    welcome2: "Que vous veniez d'Azrou, de Téhéran, d'Alger, de Chelghoum Laïd ou du bout de la rue, vous trouverez sur cette page toutes les informations utiles pour préparer votre venue dans les meilleures conditions :",
    dayTitle: "Le déroulé",
    essTitle: "Informations pratiques", planPlaceholder: "plan annoté du jardin — à venir",
    chatTitle: "Vos questions", chatSub: "Posez votre question : cette page y répond pour nous, à partir de tout ce qui y est écrit.",
    chatPlaceholder: "Posez votre question…", send: "Envoyer",
    rsvpTitle: "Votre réponse", rsvpSub: "Nous vous remercions de nous répondre avant le 15 juillet 2026.",
    yes: "Je serai des vôtres", no: "Je ne pourrai pas venir",
    fName: "Votre nom", fCount: "Combien serez-vous", fSong: "Un morceau à faire jouer", fSongPh: "titre, artiste…",
    fWord: "Un mot pour nous", sendRsvp: "Envoyer ma réponse",
    thanksTitle: "Votre réponse nous est parvenue", thanksBody: "Merci du fond du cœur. Nous vous attendons le 5 septembre, sous les arbres.",
    address: "L'adresse",
    /** @type {ScheduleEntry[]} */
    schedule: [
      {
        time: "15h", title: "Rendez-vous au jardin",
        items: [
          "Un buffet en plusieurs étapes",
          "Des photos de groupe",
          "Des jeux",
          "Le gâteau",
          "De la musique et de la danse"
        ]
      }
    ],
    pins: [
      { label: "1 · le portail", text: "L'entrée se fait par le portail vert, qui reste ouvert toute la journée." },
      { label: "2 · les tables", text: "Les tables sont dressées côté jardin, sans plan de table." },
      { label: "3 · le grand arbre", text: "C'est là que nous nous retrouvons à l'arrivée." },
      { label: "4 · le stationnement", text: "Le long de la rue, devant la maison et aux alentours." }
    ],
    facts: [
      { label: "en train", value: "RER D jusqu'à Survilliers-Fosses, puis le bus 4 — une vingtaine de minutes depuis la gare." },
      { label: "en voiture", value: "Une heure depuis Paris par l'A1. Le stationnement est libre dans la rue ; n'hésitez pas à venir à plusieurs." },
      { label: "la tenue", value: "Élégante et confortable. La journée se passe entièrement au jardin, sur l'herbe." },
      { label: "la météo", value: "Début septembre : doux dans l'après-midi, plus frais à la tombée du soir. Prévoyez une veste." }
    ],
    // The chips deliberately do NOT restate the `facts` rows. Their job is the
    // questions the page does not already answer in print — and where they do
    // overlap (getting here), the answer is the door-to-door version while the
    // `facts` row stays the compressed reference.
    chips: [
      { q: "À quelle heure faut-il arriver ?", a: "Nous vous accueillons à partir de 15h. Le buffet se déroule en plusieurs étapes tout au long de l'après-midi : venez à l'heure qui vous convient, vous ne manquerez rien." },
      { q: "Comment venir jusqu'à Fosses ?", a: "En RER D jusqu'à Survilliers-Fosses, puis le bus 4 : comptez une vingtaine de minutes depuis la gare. En voiture, une heure depuis Paris par l'A1, et le stationnement est libre dans la rue." },
      { q: "Les enfants sont-ils les bienvenus ?", a: "Bien sûr. Le jardin est clos, ils y auront toute la place pour courir, et des jeux sont prévus dans l'après-midi." },
      { q: "Pourquoi nous demandez-vous un morceau ?", a: "La musique de la journée se construit à partir de vos réponses. Le morceau que vous indiquez dans le formulaire a toutes les chances d'être joué." }
    ],
    fallback: "Voilà une question à laquelle cette page ne répond pas encore.",
    fallbackContact: "Écrivez-nous à {email} et nous vous répondrons dans la journée."
  },
  en: {
    date: "Saturday 5 September 2026", town: "Fosses", rsvpCta: "Reply",
    welcomeKicker: "Welcome",
    welcome1: "It is our pleasure to invite you to celebrate our marriage at the home of Mohammad-Amine's parents, among those closest to us. It would be a great joy to share this moment, and a meal, in your company — in what we hope will be a warm and easy afternoon.",
    welcome2: "Whether you are coming from Azrou, Tehran, Algiers, Chelghoum Laïd or from just down the road, this page holds everything you need to prepare your visit:",
    dayTitle: "The day",
    essTitle: "Practical information", planPlaceholder: "annotated garden plan — to come",
    chatTitle: "Your questions", chatSub: "Ask your question: this page answers on our behalf, drawing on everything written here.",
    chatPlaceholder: "Ask your question…", send: "Send",
    rsvpTitle: "Your reply", rsvpSub: "We would be grateful for your reply before 15 July 2026.",
    yes: "I will be there", no: "I am unable to come",
    fName: "Your name", fCount: "How many of you", fSong: "A song to play", fSongPh: "title, artist…",
    fWord: "A word for us", sendRsvp: "Send my reply",
    thanksTitle: "Your reply has reached us", thanksBody: "Thank you, warmly. We will see you on 5 September, under the trees.",
    address: "The address",
    /** @type {ScheduleEntry[]} */
    schedule: [
      {
        time: "3pm", title: "Gathering in the garden",
        items: [
          "A buffet served in several courses",
          "Group photographs",
          "Games",
          "The cake",
          "Music and dancing"
        ]
      }
    ],
    pins: [
      { label: "1 · the gate", text: "Come in through the green gate, which stays open all day." },
      { label: "2 · the tables", text: "The tables are set on the garden side, with no seating plan." },
      { label: "3 · the big tree", text: "This is where we gather as everyone arrives." },
      { label: "4 · parking", text: "Along the street, in front of the house and nearby." }
    ],
    facts: [
      { label: "by train", value: "RER D to Survilliers-Fosses, then bus 4 — about twenty minutes from the station." },
      { label: "by car", value: "An hour from Paris on the A1. Street parking is free; do share a car if you can." },
      { label: "dress", value: "Elegant and comfortable. The whole day is spent in the garden, on grass." },
      { label: "weather", value: "Early September: mild through the afternoon, cooler as evening falls. Bring a jacket." }
    ],
    chips: [
      { q: "What time should we arrive?", a: "You are welcome from 3pm. The buffet is served in several courses through the afternoon, so come at whatever hour suits you — you will miss nothing." },
      { q: "How do we get to Fosses?", a: "RER D to Survilliers-Fosses, then bus 4: about twenty minutes from the station. By car, an hour from Paris on the A1, with free street parking." },
      { q: "Are children welcome?", a: "Of course. The garden is enclosed, there is room to run, and games are planned for the afternoon." },
      { q: "Why are you asking for a song?", a: "The day's music is built from your replies. Whatever you name in the form stands every chance of being played." }
    ],
    fallback: "That is a question this page does not answer yet.",
    fallbackContact: "Write to us at {email} and we will reply the same day."
  },
  ar: {
    date: "السبت ٥ سبتمبر ٢٠٢٦", town: "فوس", rsvpCta: "أُلبّي الدعوة",
    welcomeKicker: "أهلاً وسهلاً",
    welcome1: "يسرّنا أن ندعوكم لمشاركتنا فرحة زفافنا في بيت والدَي محمد أمين، في جوٍّ حميم بين الأقربين. وسيكون لنا عظيم السرور أن نتقاسم معكم هذه اللحظة ومائدةً نرجو أن تجمعنا في دفءٍ وأُنس.",
    welcome2: "سواء أتيتم من أزرو أو من طهران أو من الجزائر أو من شلغوم العيد أو من آخر الشارع، تجدون في هذه الصفحة كل ما يلزمكم للاستعداد لزيارتكم:",
    dayTitle: "برنامج اليوم",
    essTitle: "معلومات عملية", planPlaceholder: "مخطط الحديقة — سيُضاف قريباً",
    chatTitle: "أسئلتكم", chatSub: "اسألوا ما شئتم: تجيبكم هذه الصفحة عنّا، اعتماداً على كل ما ورد فيها.",
    chatPlaceholder: "اكتبوا سؤالكم…", send: "إرسال",
    rsvpTitle: "ردّكم", rsvpSub: "نرجو تكرّمكم بالردّ قبل ١٥ يوليو ٢٠٢٦.",
    yes: "سأكون معكم بإذن الله", no: "يعزّ عليّ أنّني لن أتمكّن",
    fName: "اسمكم", fCount: "عدد الحاضرين", fSong: "أغنية تودّون سماعها", fSongPh: "العنوان، الفنان…",
    fWord: "كلمة لنا", sendRsvp: "إرسال ردّي",
    thanksTitle: "وصلنا ردّكم", thanksBody: "شكراً لكم من القلب. ننتظركم في الخامس من سبتمبر، تحت الأشجار.",
    address: "العنوان",
    /** @type {ScheduleEntry[]} */
    schedule: [
      {
        time: "١٥:٠٠", title: "اللقاء في الحديقة",
        items: [
          "مائدة تُقدَّم على مراحل",
          "صور جماعية",
          "ألعاب",
          "الكعكة",
          "موسيقى ورقص"
        ]
      }
    ],
    pins: [
      { label: "١ · البوابة", text: "الدخول من البوابة الخضراء، وتبقى مفتوحة طوال اليوم." },
      { label: "٢ · الطاولات", text: "الطاولات مُعدّة في جهة الحديقة، من غير ترتيب مسبق للجلوس." },
      { label: "٣ · الشجرة الكبيرة", text: "هناك نلتقي بكم عند وصولكم." },
      { label: "٤ · مواقف السيارات", text: "على طول الشارع، أمام البيت وما حوله." }
    ],
    facts: [
      { label: "بالقطار", value: "خط RER D حتى محطة Survilliers-Fosses، ثم الحافلة رقم ٤ — نحو عشرين دقيقة من المحطة." },
      { label: "بالسيارة", value: "ساعة من باريس عبر الطريق A1. الوقوف حرّ في الشارع، ونرحّب بمن يأتي بسيارة واحدة مع غيره." },
      { label: "اللباس", value: "أنيق ومريح. يمضي اليوم كلّه في الحديقة، على العشب." },
      { label: "الطقس", value: "مطلع سبتمبر: معتدل بعد الظهر، وأبرد مع حلول المساء. خذوا معكم سترة." }
    ],
    chips: [
      { q: "متى نصل؟", a: "نستقبلكم ابتداءً من الثالثة بعد الظهر. تُقدَّم المائدة على مراحل طوال العصر، فتعالوا في الوقت الذي يناسبكم، ولن يفوتكم شيء." },
      { q: "كيف نصل إلى فوس؟", a: "خط RER D حتى محطة Survilliers-Fosses ثم الحافلة رقم ٤: نحو عشرين دقيقة من المحطة. وبالسيارة ساعة من باريس عبر A1، والوقوف حرّ في الشارع." },
      { q: "هل الأطفال مدعوّون؟", a: "بكل تأكيد. الحديقة مسوّرة وفيها متّسع للّعب، وقد أعددنا ألعاباً في فترة العصر." },
      { q: "لماذا تسألوننا عن أغنية؟", a: "موسيقى اليوم تُبنى من ردودكم. والأغنية التي تذكرونها في الاستمارة لها كل الحظّ في أن تُعزف." }
    ],
    fallback: "سؤال لم تُجب عنه هذه الصفحة بعد.",
    fallbackContact: "اكتبوا لنا على {email} ونردّ عليكم في اليوم نفسه."
  },
  fa: {
    // Jalali, with the Gregorian alongside it because the guests are in France.
    // Everywhere ELSE in this locale the date is Jalali only — see thanksBody.
    date: "شنبه ۱۴ شهریور ۱۴۰۵ · ۵ سپتامبر ۲۰۲۶", town: "فوس", rsvpCta: "پاسخ می‌دهم",
    welcomeKicker: "خوش آمدید",
    welcome1: "با کمال مسرّت شما را به جشن ازدواج خود در خانهٔ پدر و مادر محمدامین دعوت می‌کنیم؛ در جمعی خودمانی و صمیمی. مایهٔ خوشحالی بسیار ماست که این لحظه و سفره‌ای را در کنار شما قسمت کنیم، در فضایی که امیدواریم گرم و دلنشین باشد.",
    welcome2: "چه از ازرو بیایید، چه از تهران، الجزیره، شلغوم‌العید یا از همین نزدیکی، هر آنچه برای آماده شدن سفرتان لازم است در این صفحه آمده است:",
    dayTitle: "برنامهٔ روز",
    essTitle: "اطلاعات کاربردی", planPlaceholder: "نقشهٔ باغ — به‌زودی افزوده می‌شود",
    chatTitle: "پرسش‌های شما", chatSub: "هر چه می‌خواهید بپرسید: این صفحه از جانب ما پاسخ می‌دهد، بر پایهٔ هر آنچه در آن نوشته شده است.",
    chatPlaceholder: "پرسشتان را بنویسید…", send: "ارسال",
    rsvpTitle: "پاسخ شما", rsvpSub: "سپاسگزار می‌شویم اگر تا ۲۴ تیر ۱۴۰۵ پاسخ خود را برای ما بفرستید.",
    yes: "حتماً خواهم آمد", no: "متأسفانه نمی‌توانم بیایم",
    fName: "نام شما", fCount: "چند نفر تشریف می‌آورید", fSong: "آهنگی که دوست دارید پخش شود", fSongPh: "نام آهنگ، خواننده…",
    fWord: "یک کلام برای ما", sendRsvp: "ارسال پاسخ من",
    thanksTitle: "پاسخ شما به دست ما رسید", thanksBody: "از صمیم قلب سپاسگزاریم. چهاردهم شهریور، زیر درخت‌ها منتظرتان هستیم.",
    address: "نشانی",
    /** @type {ScheduleEntry[]} */
    schedule: [
      {
        time: "۱۵:۰۰", title: "دیدار در باغ",
        items: [
          "سفره‌ای که در چند مرحله چیده می‌شود",
          "عکس دسته‌جمعی",
          "بازی",
          "کیک",
          "موسیقی و رقص"
        ]
      }
    ],
    pins: [
      { label: "۱ · دروازه", text: "ورود از دروازهٔ سبز است که تمام روز باز می‌ماند." },
      { label: "۲ · میزها", text: "میزها سمت باغ چیده شده و جای نشستن از پیش تعیین نشده است." },
      { label: "۳ · درخت بزرگ", text: "هنگام رسیدنتان همان‌جا به استقبالتان می‌آییم." },
      { label: "۴ · پارکینگ", text: "در طول خیابان، مقابل خانه و اطراف آن." }
    ],
    facts: [
      { label: "با قطار", value: "خط RER D تا ایستگاه Survilliers-Fosses، سپس اتوبوس ۴ — حدود بیست دقیقه از ایستگاه." },
      { label: "با ماشین", value: "یک ساعت از پاریس با اتوبان A1. پارک در خیابان آزاد است؛ اگر می‌توانید چند نفری با یک ماشین بیایید." },
      { label: "پوشش", value: "شیک و راحت. تمام روز در باغ و روی چمن می‌گذرد." },
      { label: "هوا", value: "اوایل سپتامبر: بعدازظهر ملایم و نزدیک غروب خنک‌تر. یک کت همراه داشته باشید." }
    ],
    chips: [
      { q: "چه ساعتی برسیم؟", a: "از ساعت سه بعدازظهر در خدمتتان هستیم. سفره در چند مرحله و در طول بعدازظهر چیده می‌شود؛ هر ساعتی که برایتان مناسب است بیایید، چیزی را از دست نمی‌دهید." },
      { q: "چطور به فوس برسیم؟", a: "خط RER D تا ایستگاه Survilliers-Fosses و سپس اتوبوس ۴: حدود بیست دقیقه از ایستگاه. با ماشین یک ساعت از پاریس با اتوبان A1، و پارک در خیابان آزاد است." },
      { q: "بچه‌ها هم دعوت‌اند؟", a: "البته. باغ محصور است و جا برای دویدن دارد، و برای بعدازظهر بازی هم در نظر گرفته‌ایم." },
      { q: "چرا از ما آهنگ می‌پرسید؟", a: "موسیقی آن روز از پاسخ‌های شما ساخته می‌شود. آهنگی که در فرم می‌نویسید به احتمال زیاد پخش خواهد شد." }
    ],
    fallback: "پرسشی است که این صفحه هنوز پاسخش را ندارد.",
    fallbackContact: "به {email} برای ما بنویسید، همان روز پاسخ می‌دهیم."
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

/**
 * A number in the reader's own numerals — garden-plan pins, countdown figures.
 *
 * The numbering system is pinned explicitly rather than left to `ar-EG`/`fa-IR`,
 * whose default varies between ICU versions. Persian is `arabext` (۱۲۳۴), NOT
 * `arab` (١٢٣٤); the hand-written table this replaces gave both languages the
 * Arabic digits, so Persian readers were seeing the wrong numerals.
 *
 * Grouping is off: these are digit substitutions, and a thousands separator in
 * a day count is noise.
 *
 * @param {number} n
 * @param {Lang} lang
 */
export function localeDigits(n, lang) {
  return new Intl.NumberFormat(NUMERALS[lang] ?? 'en', { useGrouping: false }).format(n);
}

/** @type {Partial<Record<Lang, string>>} */
const NUMERALS = { ar: 'en-u-nu-arab', fa: 'en-u-nu-arabext' };

/**
 * What the chat says when it has no answer — the ONE place a contact detail
 * appears on this site.
 *
 * Two keys rather than one string with the address baked in, because
 * `SHARED.email` is still a TODO: while it is empty the hand-off sentence is
 * dropped entirely, so the page never ships a dangling "write to us at ." Set
 * the address and the sentence appears in all four languages at once.
 *
 * @param {Lang} lang
 */
export function fallbackText(lang) {
  const s = t(lang);
  return SHARED.email ? `${s.fallback} ${s.fallbackContact.replace('{email}', SHARED.email)}` : s.fallback;
}

/**
 * The string table for a language, EXTRA included.
 *
 * The cast is doing real work: `Object.assign` at the foot of this file merges
 * EXTRA into STR at runtime, but TypeScript types STR from its literal and never
 * sees the merge — so every EXTRA key (`photoCta`, `botNote`, `calendarCta`, …)
 * read off `data.t` was a svelte-check error. Naming the merged shape here fixes
 * all of them in one place instead of at each call site.
 *
 * @param {Lang} lang
 * @returns {typeof STR.fr & typeof EXTRA.fr}
 */
export function t(lang) {
  return /** @type {typeof STR.fr & typeof EXTRA.fr} */ (STR[pickLang(lang)]);
}

/**
 * Strings this build needs that the original artifact had no equivalent for.
 * Kept separate so the STR block above stays the couple's own copy, then merged
 * in below. Add new copy HERE, in all four languages — `wedding.test.js` fails
 * if a key exists in one locale and not the others.
 */
const EXTRA = {
  fr: {
    editReply: 'Modifier ma réponse',
    photoCta: 'Déposer vos photos',
    rateLimited: 'Vous avez posé beaucoup de questions en peu de temps. Reprenons dans un instant.',
    botNote: 'Réponses automatiques, établies à partir des informations de cette page.',
    calendarCta: 'Ajouter à mon calendrier',
    eventKind: 'Un mariage',
    rsvpOffline: "Votre réponse ne peut pas être enregistrée pour le moment. Merci de réessayer dans quelques instants — le reste de la page reste accessible.",
    icsSummary: 'Mariage de Leïla & Mohammad-Amine',
    lostTitle: 'Page introuvable',
    lostBody: "Ce lien ne mène nulle part. Tout se trouve sur la page d'accueil.",
    lostCta: "Retour à l'invitation",
    closing: "Nous serions honorés de célébrer cette journée en votre compagnie.",
    // `motto` glosses SHARED.motto so it does not read as two more names.
    // fr/en get the meaning; ar/fa already have it, so they get the framing.
    // Kept lowercase: scripts/make-og.js bakes this into static/og.png.
    motto: 'foi & patience',
    cdDays: 'jours',
    cdHours: 'heures',
    cdMins: 'minutes',
    originsTitle: 'Quatre pays. Deux familles. Une histoire.',
    origins: [
      { country: 'Maroc', cities: 'Azrou' },
      { country: 'Iran', cities: 'Téhéran' },
      { country: 'Algérie', cities: 'Alger · Chelghoum Laïd' },
      { country: 'France', cities: 'Paris · Chauny' }
    ],
    // The door. `salamGloss`/`basmalaGloss` translate what is written on it, so
    // they are EMPTY in ar/fa rather than restated — there is nothing to gloss for
    // someone already reading the script. `doorHint` doubles as the button's
    // aria-label, which is why it is an instruction and not a greeting.
    // `verseGloss` below follows exactly the same rule.
    salamGloss: 'que la paix soit sur vous',
    basmalaGloss: 'au nom de Dieu',
    doorHint: 'touchez pour entrer',
    verseGloss: '« Et Nous vous avons créés par couples. »',
    verseRef: "Sourate An-Naba', 8",
    errGoing: 'Choisissez une réponse.',
    errName: "Merci d'indiquer votre nom.",
    errNameLong: 'Ce nom est trop long.',
    themeToLight: 'Passer au thème clair',
    themeToDark: 'Passer au thème sombre',
    langLabel: 'Langue'
  },
  en: {
    editReply: 'Change my reply',
    photoCta: 'Share your photographs',
    rateLimited: 'That is a great many questions in a short time. Let us pick this up in a moment.',
    botNote: 'Answered automatically, from the information on this page.',
    calendarCta: 'Add to my calendar',
    eventKind: 'A wedding',
    rsvpOffline: 'Your reply cannot be recorded at the moment. Please try again shortly — the rest of the page remains available.',
    icsSummary: 'Wedding of Leïla & Mohammad-Amine',
    lostTitle: 'Page not found',
    lostBody: 'That link leads nowhere. Everything is on the front page.',
    lostCta: 'Back to the invitation',
    closing: 'We would be honoured to celebrate this day in your company.',
    motto: 'faith & patience',
    cdDays: 'days',
    cdHours: 'hours',
    cdMins: 'minutes',
    originsTitle: 'Four countries. Two families. One story.',
    origins: [
      { country: 'Morocco', cities: 'Azrou' },
      { country: 'Iran', cities: 'Tehran' },
      { country: 'Algeria', cities: 'Algiers · Chelghoum Laïd' },
      { country: 'France', cities: 'Paris · Chauny' }
    ],
    salamGloss: 'peace be upon you',
    basmalaGloss: 'in the name of God',
    doorHint: 'tap to enter',
    verseGloss: '“And We created you in pairs.”',
    verseRef: "Sūrat an-Naba', 8",
    errGoing: 'Please choose an answer.',
    errName: 'Please tell us your name.',
    errNameLong: 'That name is too long.',
    themeToLight: 'Switch to the light theme',
    themeToDark: 'Switch to the dark theme',
    langLabel: 'Language'
  },
  ar: {
    editReply: 'تعديل ردّي',
    photoCta: 'شاركونا صوركم',
    rateLimited: 'طرحتم أسئلة كثيرة في وقت قصير. نكمل بعد قليل.',
    botNote: 'إجابات آلية، مستندة إلى المعلومات الواردة في هذه الصفحة.',
    calendarCta: 'إضافة إلى تقويمي',
    eventKind: 'زفاف',
    rsvpOffline: 'تعذّر تسجيل ردّكم في الوقت الحالي. نرجو المحاولة بعد قليل — وبقية الصفحة تعمل كالمعتاد.',
    icsSummary: 'زفاف ليلى و محمد أمين',
    lostTitle: 'الصفحة غير موجودة',
    lostBody: 'هذا الرابط لا يؤدي إلى شيء. كل شيء في الصفحة الرئيسية.',
    lostCta: 'العودة إلى الدعوة',
    closing: 'يشرّفنا أن نحتفل بهذا اليوم في صحبتكم.',
    motto: 'شعارنا',
    cdDays: 'أيام',
    cdHours: 'ساعات',
    cdMins: 'دقائق',
    originsTitle: 'أربعة بلدان. عائلتان. حكاية واحدة.',
    origins: [
      { country: 'المغرب', cities: 'أزرو' },
      { country: 'إيران', cities: 'طهران' },
      { country: 'الجزائر', cities: 'الجزائر · شلغوم العيد' },
      { country: 'فرنسا', cities: 'باريس · شوني' }
    ],
    // Empty on purpose: an Arabic reader does not need the verse glossed, and a
    // paraphrase set beneath the آية would read as a correction of it. The page
    // renders the gloss line only when it is non-empty.
    salamGloss: '',
    basmalaGloss: '',
    doorHint: 'انقروا للدخول',
    verseGloss: '',
    verseRef: 'سورة النبأ، ٨',
    errGoing: 'اختاروا أحد الجوابين.',
    errName: 'نرجو كتابة اسمكم.',
    errNameLong: 'هذا الاسم طويل أكثر من اللازم.',
    themeToLight: 'التحويل إلى المظهر الفاتح',
    themeToDark: 'التحويل إلى المظهر الداكن',
    langLabel: 'اللغة'
  },
  fa: {
    editReply: 'ویرایش پاسخم',
    photoCta: 'عکس‌هایتان را با ما بگذارید',
    rateLimited: 'در زمان کوتاهی پرسش‌های زیادی مطرح شد. کمی بعد ادامه می‌دهیم.',
    botNote: 'پاسخ‌ها خودکار و بر پایهٔ اطلاعات همین صفحه است.',
    calendarCta: 'افزودن به تقویم من',
    eventKind: 'یک عروسی',
    rsvpOffline: 'پاسخ شما در حال حاضر ثبت نمی‌شود. لطفاً کمی بعد دوباره تلاش کنید — بقیهٔ صفحه در دسترس است.',
    icsSummary: 'عروسی لیلا و محمدامین',
    lostTitle: 'صفحه پیدا نشد',
    lostBody: 'این پیوند به جایی نمی‌رسد. همه‌چیز در صفحهٔ اصلی است.',
    lostCta: 'بازگشت به دعوت‌نامه',
    closing: 'مایهٔ افتخار ماست که این روز را در کنار شما جشن بگیریم.',
    motto: 'شعار ما',
    cdDays: 'روز',
    cdHours: 'ساعت',
    cdMins: 'دقیقه',
    originsTitle: 'چهار کشور. دو خانواده. یک قصه.',
    origins: [
      { country: 'مراکش', cities: 'ازرو' },
      { country: 'ایران', cities: 'تهران' },
      { country: 'الجزایر', cities: 'الجزیره · شلغوم‌العید' },
      { country: 'فرانسه', cities: 'پاریس · شونی' }
    ],
    salamGloss: '',
    basmalaGloss: '',
    doorHint: 'برای ورود لمس کنید',
    verseGloss: '«و شما را جفت‌ها آفریدیم.»',
    verseRef: 'سورهٔ نبأ، ۸',
    errGoing: 'لطفاً یکی از دو گزینه را انتخاب کنید.',
    errName: 'لطفاً نامتان را بنویسید.',
    errNameLong: 'این نام بیش از حد بلند است.',
    themeToLight: 'تغییر به پوستهٔ روشن',
    themeToDark: 'تغییر به پوستهٔ تیره',
    langLabel: 'زبان'
  }
};

for (const lang of LANGS) Object.assign(STR[lang], EXTRA[lang]);
