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
  addressLine1: '1b rue de la Prairie de Rocourt',
  addressLine2: '95470 Fosses',

  // The same address as coordinates, from Nominatim. The universal `?api=1`
  // form hands the pin to whatever the guest already has: the Maps app on
  // Android, the app or the web map on iOS, the web map on desktop. A link,
  // not an embed — this site loads no third-party script or tile, and adding a
  // map iframe would be the first.
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=49.0951880,2.4944159',

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

  // The aerial shot of the house. The four pins are positioned in percentages
  // of it, so they scale with the box — see PIN_POS. Emptying this string puts
  // the hatched placeholder back, which is why GardenPlan still carries it.
  gardenPlanImage: '/img/house.jpg',
  isoDate: '2026-09-05',
  names: { latin: ['Leïla', 'Mohammad-Amine'], arabic: 'ليلى و محمد أمين' },

  // Two words, carved one per leaf and read across the shut pair. The array is
  // the split, so the component never has to cut a string it does not own: the
  // line is right-to-left, so [0] is the RIGHT leaf. It carries no gloss under
  // the door any more — see issue #16.
  basmala: ['بسم', 'الله'],

  // What is said at the door, in Arabic script in every locale — the same rule the
  // names follow: this is the greeting itself, not a sentence to be translated.
  // fr/en get a gloss under it (see `salamGloss`); ar/fa need none.
  salam: 'السلام عليكم',

  // The couple's phrase — "Iman o Sabr", faith and patience. Arabic script in
  // every locale, like the names: it is a name for the thing, not a sentence to
  // translate.
  motto: 'إيمان و صبر',

  // Qur'an 78:8, in the welcome section's verse card. Arabic script
  // in every locale for the same reason as the motto; the meaning is carried by
  // `verseGloss`, which is deliberately empty in Arabic — see EXTRA.ar.
  verse: 'وَخَلَقْنَاكُمْ أَزْوَاجًا',

  // The invocation that opens the invitation text, above `welcome1`. Set alone
  // and untranslated in every locale: this is the opening of a document, not a
  // sentence being made. The door carries the two-word `بسم الله` as well, and
  // neither is glossed — a translation under the full formula would render half
  // of it and stop, which is what `basmalaGloss` used to do (issue #16).
  bismillah: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',

  /*
   * The quote stars. One eight-point star per quote, scattered in the FOREGROUND
   * of a section and opened by a click — see Section.svelte.
   *
   * The page stopped naming anyone's origins in print when the four-country grid
   * went (issue #18). This puts the traditions back as something a guest FINDS
   * rather than something they are told, which is the only reason it earns the
   * decoration budget.
   *
   * Each quote keeps its ORIGINAL language, so `lang` is not metadata — it drives
   * the direction AND the typeface, because app.css already keys the font off
   * `:lang()`. The per-locale gloss and attribution live in EXTRA.<lang>.starGloss,
   * exactly the split `verse` / `verseGloss` / `verseRef` above already uses.
   *
   * WRITTEN ORIGINALS ONLY. The Amazigh material researched alongside these is
   * oral tradition with a French ethnographic record and no fixed original;
   * printing a French sentence under "Amazigh proverb" would claim a source that
   * does not exist. The Maghreb is carried here in Arabic instead — which is also
   * the right register for this family.
   *
   * `id` is what the gloss tables key on, so this list can be reordered freely,
   * and wedding.test.js fails if an id is missing a gloss in any of the four.
   */
  starQuotes: [
    // Qur'an 30:21, EXCERPTED to the mawadda-wa-rahma clause. The whole verse is
    // about four times the weight of the other nine and would leave one note
    // visibly taller than the rest; the reference under it names the full ayah.
    { id: 'rum30', section: 'welcome', lang: 'ar', text: 'وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً' },
    {
      id: 'stex',
      section: 'welcome',
      lang: 'fr',
      text: "Aimer, ce n'est pas se regarder l'un l'autre, c'est regarder dans la même direction."
    },
    {
      id: 'hafez',
      section: 'day',
      lang: 'fa',
      text: 'فاش می‌گویم و از گفتهٔ خود دلشادم / بنده عشقم و از هر دو جهان آزادم'
    },
    {
      id: 'bazin',
      section: 'day',
      lang: 'fr',
      text: "Une vie sans amour, c'est une vie sans soleil."
    },
    {
      id: 'darija',
      section: 'essentials',
      lang: 'ar',
      text: 'حل عينيك قبل الزواج، أما بعدو غير غمضهوم'
    },
    {
      id: 'augustin',
      section: 'essentials',
      lang: 'fr',
      text: 'Le véritable amour ne se consume jamais ; plus on le donne, plus on en a.'
    },
    // TODO(content): the first two lines of the rubāʿī. Sufi, much-loved, and it
    // opens on "beyond disbelief and Islam" — read it aloud to family before
    // launch, since it sits on the same page as two Qur'anic verses. If it lands
    // wrong, a second Hafez replaces it with no other change.
    {
      id: 'rumi',
      section: 'chat',
      lang: 'fa',
      text: 'از کفر و ز اسلام برون صحرائی است / ما را به میان آن فضا سودائی است'
    },
    { id: 'dzkalam', section: 'chat', lang: 'ar', text: 'كل كلام الخير ولا سكوت خير' },
    {
      id: 'hugo',
      section: 'rsvp',
      lang: 'fr',
      text: "Il faut s'aimer, et puis il faut se le dire."
    },
    { id: 'libas', section: 'rsvp', lang: 'ar', text: 'هُنَّ لِبَاسٌ لَّكُمْ وَأَنتُمْ لِبَاسٌ لَّهُنَّ' }
  ]
};

/**
 * Pin positions over the garden plan, as percentages so they scale with it.
 *
 * Ordered as a guest arrives — park, gate, greeting, table, food, then the
 * children's corner and the dancing — not by where they sit on the photo. The
 * numbering a guest reads is this order, so the labels carry it explicitly.
 *
 * Read off `static/img/house.jpg` (628x507) against a 10% grid. These are
 * feature CENTRES: the pin button is translated -50%/-50%, so the number below
 * is where the marker actually lands, at any width. Retune by eye if the photo
 * is ever replaced — and keep this list the same length as every locale's
 * `pins`, which wedding.test.js checks.
 */
export const PIN_POS = [
  { left: '50%', top: '83%' }, // 1 le stationnement — the street out front
  { left: '44%', top: '61%' }, // 2 le portail — the white line between the
  //                                cherry tree and the red maple
  { left: '35%', top: '51%' }, // 3 l'accueil — the paved courtyard
  { left: '68%', top: '51%' }, // 4 les tables — open lawn east of the house
  { left: '30%', top: '35%' }, // 5 le buffet — under the low red roof
  { left: '77%', top: '16%' }, // 6 les enfants — the far corner of the garden
  { left: '50%', top: '9%' } //   7 la danse — open ground behind the house
];


export const STR = {
  fr: {
    date: "Samedi 5 septembre 2026", town: "Fosses", rsvpCta: "Je réponds",
    welcome1: "Nous avons la joie de vous convier à célébrer notre mariage chez la famille Banaei, dans une ambiance intimiste. Nous serions heureux de vous compter parmi nous.",
    dayTitle: "Le déroulé",
    essTitle: "Informations pratiques", planPlaceholder: "plan annoté du jardin — à venir",
    chatTitle: "Vos questions", chatSub: "Posez votre question : cette page y répond pour nous.",
    chatPlaceholder: "Posez votre question…", send: "Envoyer",
    rsvpTitle: "Votre réponse", rsvpSub: "Merci de nous répondre avant le 15 juillet 2026.",
    yes: "Je serai des vôtres", no: "Je ne pourrai pas venir",
    fName: "Votre nom", fCount: "Combien serez-vous", fSong: "Un morceau à faire jouer", fSongPh: "titre, artiste…",
    fWord: "Un mot pour nous", sendRsvp: "Envoyer ma réponse",
    thanksTitle: "Votre réponse nous est parvenue", thanksBody: "Merci du fond du cœur. Rendez-vous le 5 septembre, au jardin.",
    // Shown instead of `thanksBody` when the answer is no — see RsvpForm.svelte.
    // The yes line ends on the date and the garden, which is exactly what a
    // guest who has just said they cannot come must not be told.
    thanksBodyNo: "Merci de nous avoir répondu. Vous nous manquerez ce jour-là, et nous penserons à vous.",
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
      { label: "1 · le stationnement", text: "Le long de la rue, devant la maison et aux alentours." },
      { label: "2 · le portail", text: "L'entrée se fait par le portail, ouvert toute la journée." },
      { label: "3 · l'accueil", text: "C'est là que nous nous retrouvons à l'arrivée." },
      { label: "4 · les tables", text: "Les tables sont dressées côté jardin ; un plan de table vous y attend." },
      { label: "5 · le buffet", text: "Sous le toit rouge, contre la maison : il est servi tout l'après-midi." },
      { label: "6 · les enfants", text: "Un coin du jardin leur est réservé, tout au fond." },
      { label: "7 · la danse", text: "Derrière la maison : c'est là que la musique et la danse prennent place." }
    ],
    facts: [
      { label: "en train", value: "RER D jusqu'à Survilliers-Fosses, puis le bus R1 jusqu'à l'arrêt Bellevue, ou le R2 (direction Mairie annexe) jusqu'à l'arrêt Cottages — une vingtaine de minutes depuis la gare." },
      // `map: true` marks the row that carries the maps link — see +page.svelte.
      // A flag, not an index: the facts are ordered the same in all four
      // locales today, and nothing would tell us if that stopped being true.
      { label: "en voiture", value: "Une heure depuis Paris par l'A1. Stationnement libre dans la rue ; venez à plusieurs si vous pouvez.", map: true },
      { label: "au jardin", value: "Tout se passe dehors, sur l'herbe : prévoyez des chaussures qui s'en accommodent. Début septembre est doux l'après-midi et plus frais le soir — emportez une veste, et de quoi vous couvrir si le temps tourne." }
    ],
    // The chips deliberately do NOT restate the `facts` rows. Their job is the
    // questions the page does not already answer in print — and where they do
    // overlap (getting here), the answer is the door-to-door version while the
    // `facts` row stays the compressed reference.
    chips: [
      { q: "À quelle heure faut-il arriver ?", a: "Nous vous accueillons à partir de 15h. Le buffet se déroule tout l'après-midi : venez à l'heure qui vous convient, vous ne manquerez rien." },
      { q: "Comment venir jusqu'à Fosses ?", a: "En RER D jusqu'à Survilliers-Fosses, puis le bus R1 jusqu'à l'arrêt Bellevue, ou le R2 (direction Mairie annexe) jusqu'à l'arrêt Cottages : comptez une vingtaine de minutes depuis la gare. En voiture, une heure depuis Paris par l'A1, et le stationnement est libre dans la rue." },
      { q: "Les enfants sont-ils les bienvenus ?", a: "Bien sûr. Le jardin est clos, il y a la place pour courir, et des jeux sont prévus." },
      { q: "Pourquoi nous demandez-vous un morceau ?", a: "La musique de la journée se construit à partir de vos réponses. Le morceau que vous indiquez a toutes les chances d'être joué." }
    ],
    fallback: "Voilà une question à laquelle cette page ne répond pas encore.",
    fallbackContact: "Écrivez-nous à {email} et nous vous répondrons dans la journée."
  },
  en: {
    date: "Saturday 5 September 2026", town: "Fosses", rsvpCta: "Reply",
    welcome1: "It is our joy to invite you to celebrate our marriage at the home of the Banaei family, among those closest to us. We would love to have you with us.",
    dayTitle: "The day",
    essTitle: "Practical information", planPlaceholder: "annotated garden plan — to come",
    chatTitle: "Your questions", chatSub: "Ask your question: this page answers on our behalf.",
    chatPlaceholder: "Ask your question…", send: "Send",
    rsvpTitle: "Your reply", rsvpSub: "Please reply before 15 July 2026.",
    yes: "I will be there", no: "I am unable to come",
    fName: "Your name", fCount: "How many of you", fSong: "A song to play", fSongPh: "title, artist…",
    fWord: "A word for us", sendRsvp: "Send my reply",
    thanksTitle: "Your reply has reached us", thanksBody: "Thank you, warmly. See you on 5 September, in the garden.",
    // Shown instead of `thanksBody` when the answer is no — see RsvpForm.svelte.
    // The yes line ends on the date and the garden, which is exactly what a
    // guest who has just said they cannot come must not be told.
    thanksBodyNo: "Thank you for letting us know. You will be missed on the day, and we will be thinking of you.",
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
      { label: "1 · parking", text: "Along the street, in front of the house and nearby." },
      { label: "2 · the gate", text: "Come in through the gate, open all day." },
      { label: "3 · the welcome", text: "This is where we gather as everyone arrives." },
      { label: "4 · the tables", text: "The tables are set on the garden side; a seating plan will show you yours." },
      { label: "5 · the buffet", text: "Under the red roof, against the house: served all afternoon." },
      { label: "6 · the children", text: "A corner of the garden is set aside for them, right at the back." },
      { label: "7 · the dancing", text: "Behind the house: this is where the music and the dancing happen." }
    ],
    facts: [
      { label: "by train", value: "RER D to Survilliers-Fosses, then bus R1 to the Bellevue stop, or the R2 (towards Mairie annexe) to the Cottages stop — about twenty minutes from the station." },
      { label: "by car", value: "An hour from Paris on the A1. Street parking is free; share a car if you can.", map: true },
      { label: "in the garden", value: "Everything happens outdoors, on grass — bring shoes that suit it. Early September is mild in the afternoon and cooler by evening, so bring a jacket, and something warmer in case the weather turns." }
    ],
    chips: [
      { q: "What time should we arrive?", a: "You are welcome from 3pm. The buffet runs all afternoon, so come at whatever hour suits you — you will miss nothing." },
      { q: "How do we get to Fosses?", a: "RER D to Survilliers-Fosses, then bus R1 to the Bellevue stop, or the R2 (towards Mairie annexe) to the Cottages stop: about twenty minutes from the station. By car, an hour from Paris on the A1, with free street parking." },
      { q: "Are children welcome?", a: "Of course. The garden is enclosed, there is room to run, and games are planned." },
      { q: "Why are you asking for a song?", a: "The day's music is built from your replies. Whatever you name stands every chance of being played." }
    ],
    fallback: "That is a question this page does not answer yet.",
    fallbackContact: "Write to us at {email} and we will reply the same day."
  },
  ar: {
    date: "السبت ٥ سبتمبر ٢٠٢٦", town: "فوس", rsvpCta: "أُلبّي الدعوة",
    welcome1: "يسرّنا أن ندعوكم لمشاركتنا فرحة زفافنا في بيت عائلة بنائي، في جوٍّ حميم بين الأقربين. يسعدنا أن تكونوا معنا.",
    dayTitle: "برنامج اليوم",
    essTitle: "معلومات عملية", planPlaceholder: "مخطط الحديقة — سيُضاف قريباً",
    chatTitle: "أسئلتكم", chatSub: "اسألوا ما شئتم: تجيبكم هذه الصفحة عنّا.",
    chatPlaceholder: "اكتبوا سؤالكم…", send: "إرسال",
    rsvpTitle: "ردّكم", rsvpSub: "نرجو ردّكم قبل ١٥ يوليو ٢٠٢٦.",
    yes: "سأكون معكم بإذن الله", no: "يعزّ عليّ أنّني لن أتمكّن",
    fName: "اسمكم", fCount: "عدد الحاضرين", fSong: "أغنية تودّون سماعها", fSongPh: "العنوان، الفنان…",
    fWord: "كلمة لنا", sendRsvp: "إرسال ردّي",
    thanksTitle: "وصلنا ردّكم", thanksBody: "شكراً لكم من القلب. ننتظركم في الخامس من سبتمبر، في الحديقة.",
    // Shown instead of `thanksBody` when the answer is no — see RsvpForm.svelte.
    // The yes line ends on the date and the garden, which is exactly what a
    // guest who has just said they cannot come must not be told.
    thanksBodyNo: "شكراً لكم على ردّكم. سنفتقدكم في ذلك اليوم، وستكونون في خاطرنا.",
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
      { label: "١ · مواقف السيارات", text: "على طول الشارع، أمام البيت وما حوله." },
      { label: "٢ · البوابة", text: "الدخول من البوابة، وتبقى مفتوحة طوال اليوم." },
      { label: "٣ · الاستقبال", text: "هناك نلتقي بكم عند وصولكم." },
      { label: "٤ · الطاولات", text: "الطاولات مُعدّة في جهة الحديقة، وهناك ترتيب للجلوس يدلّكم على مكانكم." },
      { label: "٥ · البوفيه", text: "تحت السقف الأحمر، بجانب البيت: يُقدَّم طوال العصر." },
      { label: "٦ · الأطفال", text: "ركن من الحديقة مخصّص لهم، في أقصاها." },
      { label: "٧ · الرقص", text: "خلف البيت: هناك تكون الموسيقى والرقص." }
    ],
    facts: [
      { label: "بالقطار", value: "خط RER D حتى محطة Survilliers-Fosses، ثم الحافلة R1 إلى موقف Bellevue، أو R2 (باتجاه Mairie annexe) إلى موقف Cottages — نحو عشرين دقيقة من المحطة." },
      { label: "بالسيارة", value: "ساعة من باريس عبر A1. الوقوف حرّ في الشارع؛ تعالوا معاً في سيارة واحدة إن أمكن.", map: true },
      { label: "في الحديقة", value: "كلّ شيء في الهواء الطلق على العشب، فاختاروا حذاءً يناسب ذلك. مطلع سبتمبر معتدل بعد الظهر وأبرد مساءً: خذوا سترة، وما يقيكم إن تقلّب الجوّ." }
    ],
    chips: [
      { q: "متى نصل؟", a: "نستقبلكم من الثالثة بعد الظهر. تُقدَّم المائدة طوال العصر: تعالوا في الوقت الذي يناسبكم، ولن يفوتكم شيء." },
      { q: "كيف نصل إلى فوس؟", a: "خط RER D حتى محطة Survilliers-Fosses، ثم الحافلة R1 إلى موقف Bellevue أو R2 (باتجاه Mairie annexe) إلى موقف Cottages: نحو عشرين دقيقة من المحطة. وبالسيارة ساعة من باريس عبر A1، والوقوف حرّ في الشارع." },
      { q: "هل الأطفال مدعوّون؟", a: "بكل تأكيد. الحديقة مسوّرة وفيها متّسع للّعب، وقد أعددنا ألعاباً." },
      { q: "لماذا تسألوننا عن أغنية؟", a: "موسيقى اليوم تُبنى من ردودكم. والأغنية التي تذكرونها لها كل الحظّ في أن تُعزف." }
    ],
    fallback: "سؤال لم تُجب عنه هذه الصفحة بعد.",
    fallbackContact: "اكتبوا لنا على {email} ونردّ عليكم في اليوم نفسه."
  },
  fa: {
    // Jalali, with the Gregorian alongside it because the guests are in France.
    // Everywhere ELSE in this locale the date is Jalali only — see thanksBody.
    date: "شنبه ۱۴ شهریور ۱۴۰۵ · ۵ سپتامبر ۲۰۲۶", town: "فوس", rsvpCta: "پاسخ می‌فرستم",
    welcome1: "شما را به جشن پیوند خود در خانهٔ خانوادهٔ بنایی دعوت می‌کنیم؛ جمعی کوچک و خودمانی، در باغ خانه. خوشحال می‌شویم کنارمان باشید.",
    dayTitle: "آنچه در آن روز می‌گذرد",
    essTitle: "دانستنی‌های سفر", planPlaceholder: "نقشهٔ باغ — به‌زودی",
    chatTitle: "پرسش‌های شما", chatSub: "بپرسید؛ این صفحه از جانب ما پاسخ می‌گوید.",
    chatPlaceholder: "پرسش خود را بنویسید…", send: "ارسال",
    rsvpTitle: "پاسخ شما", rsvpSub: "تا ۲۴ تیر ۱۴۰۵ ما را بی‌خبر نگذارید.",
    yes: "به دیدارتان می‌آیم", no: "افسوس که این‌بار در کنارتان نیستم",
    fName: "نام شما", fCount: "چند نفر تشریف می‌آورید", fSong: "آهنگی که دوست دارید بشنوید", fSongPh: "نام آهنگ، خواننده…",
    fWord: "سخنی برای ما", sendRsvp: "پاسخم را می‌فرستم",
    thanksTitle: "پاسخ شما به دستمان رسید", thanksBody: "از صمیم دل سپاسگزاریم. چهاردهم شهریور، در باغ چشم‌به‌راهتان هستیم.",
    // Shown instead of `thanksBody` when the answer is no — see RsvpForm.svelte.
    // The yes line ends on the date and the garden, which is exactly what a
    // guest who has just said they cannot come must not be told.
    thanksBodyNo: "سپاسگزاریم که ما را بی‌خبر نگذاشتید. جای شما آن روز خالی است و یادتان با ماست.",
    address: "نشانی",
    /** @type {ScheduleEntry[]} */
    schedule: [
      {
        time: "۱۵:۰۰", title: "دیدار در باغ",
        items: [
          "سفره‌ای که کم‌کم چیده می‌شود",
          "عکس یادگاری، همه در یک قاب",
          "بازی و سرگرمی",
          "بریدن کیک",
          "ساز و آواز و رقص"
        ]
      }
    ],
    pins: [
      { label: "۱ · پارکینگ", text: "در طول خیابان، روبه‌روی خانه و گرداگرد آن." },
      { label: "۲ · دروازه", text: "از دروازه؛ تمام روز باز است." },
      { label: "۳ · پذیرایی", text: "همان‌جا به پیشوازتان می‌آییم." },
      { label: "۴ · میزها", text: "سمت باغ چیده شده؛ نقشهٔ نشستن جای شما را نشان می‌دهد." },
      { label: "۵ · بوفه", text: "زیر سقف قرمز، کنار خانه؛ تمام بعدازظهر برقرار است." },
      { label: "۶ · بچه‌ها", text: "گوشه‌ای از باغ برای آن‌هاست، در انتهای آن." },
      { label: "۷ · رقص", text: "پشت خانه: موسیقی و رقص همان‌جاست." }
    ],
    facts: [
      { label: "با قطار", value: "RER D تا ایستگاه Survilliers-Fosses، سپس اتوبوس R1 تا ایستگاه Bellevue، یا R2 (به سمت Mairie annexe) تا ایستگاه Cottages — حدود بیست دقیقه." },
      { label: "با ماشین", value: "یک ساعت از پاریس با اتوبان A1. پارک در خیابان آزاد است؛ اگر می‌شود چند نفری بیایید.", map: true },
      { label: "در باغ", value: "همه‌چیز بیرون و روی چمن است؛ کفشی بپوشید که با آن جور باشد. نیمهٔ شهریور بعدازظهر ملایم و غروب خنک است: کتی همراه داشته باشید و اگر هوا برگشت، پوشش گرم‌تری هم." }
    ],
    chips: [
      { q: "چه ساعتی برسیم؟", a: "ما از ساعت ۱۵ آمادهٔ پذیرایی از شما عزیزان هستیم. سفره کم‌کم چیده می‌شود؛ هر وقت برسید، چیزی از دست نمی‌رود." },
      { q: "چطور به فوس برسیم؟", a: "با RER D تا Survilliers-Fosses، سپس اتوبوس R1 تا ایستگاه Bellevue یا R2 (به سمت Mairie annexe) تا ایستگاه Cottages: حدود بیست دقیقه. با ماشین یک ساعت از پاریس با A1؛ پارک در خیابان آزاد است." },
      { q: "بچه‌ها هم دعوت‌اند؟", a: "البته. باغ دیوار دارد و جا برای دویدن؛ برای بعدازظهر بازی هم در نظر گرفته‌ایم." },
      { q: "چرا از ما آهنگ می‌پرسید؟", a: "موسیقی آن روز را پاسخ‌های شما می‌سازد. آهنگی که بنویسید، به احتمال زیاد نواخته می‌شود." }
    ],
    fallback: "این پرسشی است که هنوز پاسخی در این صفحه ندارد.",
    fallbackContact: "به {email} بنویسید؛ همان روز پاسخ می‌دهیم."
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
 * The quote stars anchored to one section, with this locale's gloss folded in.
 *
 * The join lives here rather than in Section.svelte because the two halves —
 * the original text and its gloss — are split across SHARED and EXTRA for a
 * content reason, and nothing outside this file should have to know that.
 *
 * @param {string} section  a Section's `seed`
 * @param {Lang} lang
 */
export function starQuotes(section, lang) {
  return SHARED.starQuotes
    .filter((q) => q.section === section)
    .map((q) => ({ text: q.text, lang: q.lang, ...starGloss(q.id, lang) }));
}

/**
 * One quote star's gloss and attribution. The cast is the whole point of the
 * function: SHARED.starQuotes widens `id` to `string`, and only this file knows
 * that the two halves of a quote are keyed on each other — so every caller
 * outside would otherwise have to repeat the same assertion. Same reasoning as
 * the cast in `t()` above.
 *
 * @param {string} id  a SHARED.starQuotes[].id
 * @param {Lang} lang
 */
export function starGloss(id, lang) {
  const g = t(lang).starGloss;
  return g[/** @type {keyof typeof g} */ (id)];
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
    mapCta: 'Voir sur une carte',
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
    // Read by the chatbot only (see chat-prompt.js) — the welcome section used
    // to head its verse card with "Quatre pays. Deux familles. Une histoire.",
    // and no longer names anyone's origins in print.
    origins: [
      { country: 'Maroc', cities: 'Azrou' },
      { country: 'Iran', cities: 'Téhéran' },
      { country: 'Algérie', cities: 'Alger · Chelghoum Laïd' },
      { country: 'France', cities: 'Paris · Chauny' }
    ],
    // The door. `salamGloss` translates what is written on it, so it is EMPTY in
    // ar/fa rather than restated — there is nothing to gloss for someone already
    // reading the script. `doorHint` doubles as the button's aria-label, which is
    // why it is an instruction and not a greeting.
    // `verseGloss` below follows exactly the same rule.
    salamGloss: 'que la paix soit sur vous',
    doorHint: 'touchez pour entrer',
    verseGloss: '« Et Nous vous avons créés par paires. »',
    verseRef: "Sourate An-Naba', 8",
    // Reads straight off the two names above it in the hero — the one line that
    // says what this page is. Everything else up there (names, date, town) is
    // true of a dinner too.
    heroInvite: 'ont la joie de vous convier à leur mariage',
    // Optional, and the label says so rather than a separate hint line: the
    // form is short on purpose and an unexplained address box on a wedding
    // invitation reads as a mailing list. Collected so the couple can send the
    // photos afterwards without chasing numbers through four group chats.
    fEmail: 'Votre e-mail (facultatif)',
    errGoing: 'Choisissez une réponse.',
    errName: "Merci d'indiquer votre nom.",
    errNameLong: 'Ce nom est trop long.',
    // The guest wall. `wallSign` is the label on the one required field: an
    // unsigned card on the projector is a message from nobody.
    wallTitle: 'Le mur des invités',
    // Replaces rsvpCta as the rail's main call to action — there is no
    // answering the night before. The RSVP form stays on the page below.
    wallCta: 'Écrire sur le mur',
    wallClose: 'Fermer',
    wallIntro: 'Un mot, une photo — et cela s’affiche sur le grand écran.',
    wallSign: 'Votre nom',
    wallMessageLabel: 'Votre message',
    // The BUTTON's text, not a caption above one. The native file input has
    // its own label, so a caption beside it said the same thing twice.
    wallPhotoLabel: 'Ajouter une photo',
    wallPhotoChange: 'Changer',
    wallSubmit: 'Envoyer au mur',
    wallPending: 'C’est parti ! Votre mot apparaîtra sur l’écran dans un instant.',
    wallClosed: 'Le mur est fermé pour le moment.',
    wallOffline: 'Impossible d’envoyer pour le moment. Réessayez dans quelques instants.',
    wallBusy: 'Beaucoup d’envois en même temps — réessayez dans quelques secondes.',
    wallTooMany: 'Vous avez déjà beaucoup partagé — laissez la place aux autres un instant !',
    errWallAuthor: 'Merci de signer votre message.',
    errWallAuthorLong: 'Ce nom est trop long.',
    errWallMessageLong: 'Ce message est trop long pour l’écran.',
    errWallEmpty: 'Écrivez un mot ou ajoutez une photo.',
    errWallPhotoBig: 'Cette photo est trop lourde.',
    errWallPhotoBad: 'Cette image n’a pas pu être lue. Essayez une autre photo.',
    themeToLight: 'Passer au thème clair',
    themeToDark: 'Passer au thème sombre',
    // Gloss and attribution for each quote star, keyed on SHARED.starQuotes[].id.
    // `gloss` is EMPTY when the quote is already in this locale's own language —
    // the same rule salamGloss and verseGloss follow, generalised. `ref` always
    // shows, and is always localised.
    starGloss: {
      rum30: {
        gloss: '« Et Il a mis entre vous affection et miséricorde. »',
        ref: 'Sourate Ar-Rûm, 30:21'
      },
      stex: { gloss: '', ref: 'Antoine de Saint-Exupéry' },
      hafez: {
        gloss:
          "« Je le dis ouvertement, et de mes propres mots je me réjouis : je suis l'esclave de l'amour, et libre des deux mondes. »",
        ref: 'Hafez de Chiraz, Divan, ghazal 317'
      },
      bazin: { gloss: '', ref: 'Hervé Bazin' },
      darija: {
        gloss: '« Ouvre les yeux avant le mariage ; après, tu ne peux plus que les fermer. »',
        ref: 'Proverbe marocain'
      },
      augustin: { gloss: '', ref: 'attribué à saint Augustin' },
      rumi: {
        gloss:
          "« Au-delà de l'incroyance et de l'islam s'étend une plaine ; c'est vers cet espace que va notre désir. »",
        ref: 'Roumi, quatrain'
      },
      dzkalam: {
        gloss: '« Ne dis que le bien, sinon le silence vaut mieux. »',
        ref: 'Proverbe algérien'
      },
      hugo: { gloss: '', ref: 'Victor Hugo' },
      libas: {
        gloss: '« Elles sont un vêtement pour vous et vous êtes un vêtement pour elles. »',
        ref: 'Sourate Al-Baqara, 2:187'
      }
    },
    // The quote star's accessible name. The stars carry no visible label on
    // purpose — a screen reader still needs one, and "button" alone is not it.
    starHint: 'une pensée',
    langLabel: 'Langue'
  },
  en: {
    editReply: 'Change my reply',
    photoCta: 'Share your photographs',
    mapCta: 'View on a map',
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
    origins: [
      { country: 'Morocco', cities: 'Azrou' },
      { country: 'Iran', cities: 'Tehran' },
      { country: 'Algeria', cities: 'Algiers · Chelghoum Laïd' },
      { country: 'France', cities: 'Paris · Chauny' }
    ],
    salamGloss: 'peace be upon you',
    doorHint: 'tap to enter',
    verseGloss: '“And We created you in pairs.”',
    verseRef: "Sūrat an-Naba', 8",
    heroInvite: 'invite you, with joy, to their wedding',
    fEmail: 'Your email (optional)',
    errGoing: 'Please choose an answer.',
    errName: 'Please tell us your name.',
    errNameLong: 'That name is too long.',
    wallTitle: 'The guest wall',
    wallCta: 'Write on the wall',
    wallClose: 'Close',
    wallIntro: 'A word, a photo — and it goes up on the big screen.',
    wallSign: 'Your name',
    wallMessageLabel: 'Your message',
    wallPhotoLabel: 'Add a photo',
    wallPhotoChange: 'Change',
    wallSubmit: 'Send to the wall',
    wallPending: 'Sent! Your card will appear on the screen in a moment.',
    wallClosed: 'The wall is closed for now.',
    wallOffline: 'Cannot send right now. Please try again in a moment.',
    wallBusy: 'Lots of people sending at once — try again in a few seconds.',
    wallTooMany: 'You have shared plenty already — let others have a turn!',
    errWallAuthor: 'Please sign your message.',
    errWallAuthorLong: 'That name is too long.',
    errWallMessageLong: 'That message is too long for the screen.',
    errWallEmpty: 'Write a word or add a photo.',
    errWallPhotoBig: 'That photo is too large.',
    errWallPhotoBad: 'That image could not be read. Try another photo.',
    themeToLight: 'Switch to the light theme',
    themeToDark: 'Switch to the dark theme',
    starGloss: {
      rum30: {
        gloss: '“And He placed between you affection and mercy.”',
        ref: 'Sūrat ar-Rūm, 30:21'
      },
      stex: {
        gloss:
          '“To love is not to gaze at one another, but to look together in the same direction.”',
        ref: 'Antoine de Saint-Exupéry'
      },
      hafez: {
        gloss:
          '“Openly I speak, and of my own words I am glad: I am love’s slave, and free of both worlds.”',
        ref: 'Hafez of Shiraz, Divan, ghazal 317'
      },
      bazin: { gloss: '“A life without love is a life without sun.”', ref: 'Hervé Bazin' },
      darija: {
        gloss: '“Open your eyes before marriage; afterwards, all you can do is close them.”',
        ref: 'Moroccan proverb'
      },
      augustin: {
        gloss: '“True love is never spent: the more you give, the more you have.”',
        ref: 'attributed to Saint Augustine'
      },
      rumi: {
        gloss:
          '“Beyond disbelief and Islam there lies an open plain; it is towards that expanse our longing goes.”',
        ref: 'Rumi, quatrain'
      },
      dzkalam: { gloss: '“Speak only kindly, or silence is better.”', ref: 'Algerian proverb' },
      hugo: { gloss: '“We must love one another, and then we must say so.”', ref: 'Victor Hugo' },
      libas: {
        gloss: '“They are a garment for you and you are a garment for them.”',
        ref: 'Sūrat al-Baqara, 2:187'
      }
    },
    starHint: 'a thought',
    langLabel: 'Language'
  },
  ar: {
    editReply: 'تعديل ردّي',
    photoCta: 'شاركونا صوركم',
    mapCta: 'الموقع على الخريطة',
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
    doorHint: 'انقروا للدخول',
    verseGloss: '',
    verseRef: 'سورة النبأ، ٨',
    heroInvite: 'يتشرّفان بدعوتكم إلى حفل زفافهما',
    fEmail: 'بريدكم الإلكتروني (اختياري)',
    errGoing: 'اختاروا أحد الجوابين.',
    errName: 'نرجو كتابة اسمكم.',
    errNameLong: 'هذا الاسم طويل أكثر من اللازم.',
    wallTitle: 'جدار المدعوّين',
    wallCta: 'اكتبوا على الجدار',
    wallClose: 'إغلاق',
    wallIntro: 'كلمة أو صورة — وتظهر على الشاشة الكبيرة.',
    wallSign: 'اسمكم',
    wallMessageLabel: 'رسالتكم',
    wallPhotoLabel: 'أضيفوا صورة',
    wallPhotoChange: 'تغيير',
    wallSubmit: 'أرسلوا إلى الجدار',
    wallPending: 'تمّ الإرسال! ستظهر كلمتكم على الشاشة بعد قليل.',
    wallClosed: 'الجدار مغلق في الوقت الحالي.',
    wallOffline: 'تعذّر الإرسال الآن. نرجو المحاولة بعد قليل.',
    wallBusy: 'هناك إرسال كثير في الوقت نفسه — حاولوا بعد ثوانٍ.',
    wallTooMany: 'شاركتم كثيرًا بالفعل — اتركوا المجال لغيركم قليلاً!',
    errWallAuthor: 'نرجو توقيع رسالتكم باسمكم.',
    errWallAuthorLong: 'هذا الاسم طويل أكثر من اللازم.',
    errWallMessageLong: 'هذه الرسالة طويلة على الشاشة.',
    errWallEmpty: 'اكتبوا كلمة أو أضيفوا صورة.',
    errWallPhotoBig: 'هذه الصورة كبيرة الحجم.',
    errWallPhotoBad: 'تعذّرت قراءة هذه الصورة. جرّبوا صورة أخرى.',
    themeToLight: 'التحويل إلى المظهر الفاتح',
    themeToDark: 'التحويل إلى المظهر الداكن',
    // Empty for the four quotes already in Arabic, for the same reason
    // verseGloss is: a paraphrase under the original reads as a correction of it.
    starGloss: {
      rum30: { gloss: '', ref: 'سورة الروم، ٢١' },
      stex: {
        gloss: '«ليس الحبّ أن ينظر أحدنا إلى الآخر، بل أن ننظر معًا في اتجاه واحد.»',
        ref: 'أنطوان دو سانت-إكزوبيري'
      },
      hafez: {
        gloss: '«أقولها جهارًا وأفرح بما أقول: أنا عبدُ العشق، وحرٌّ من العالَمين.»',
        ref: 'حافظ الشيرازي، الديوان، الغزل ٣١٧'
      },
      bazin: { gloss: '«حياةٌ بلا حبّ حياةٌ بلا شمس.»', ref: 'إيرفيه بازان' },
      darija: { gloss: '', ref: 'مثل مغربي' },
      augustin: {
        gloss: '«الحبّ الحقّ لا ينفد؛ كلّما أعطيتَ منه زاد.»',
        ref: 'يُنسب إلى القدّيس أوغسطينوس'
      },
      rumi: {
        gloss: '«وراء الكفر والإسلام صحراء، وإلى ذلك الفضاء يمضي شوقنا.»',
        ref: 'جلال الدين الرومي، رباعية'
      },
      dzkalam: { gloss: '', ref: 'مثل جزائري' },
      hugo: { gloss: '«علينا أن يحبّ بعضنا بعضًا، ثمّ علينا أن نقول ذلك.»', ref: 'فيكتور هوغو' },
      libas: { gloss: '', ref: 'سورة البقرة، ١٨٧' }
    },
    starHint: 'خاطرة',
    langLabel: 'اللغة'
  },
  fa: {
    editReply: 'ویرایش پاسخم',
    photoCta: 'عکس‌هایتان را به یادگار بگذارید',
    mapCta: 'نمایش روی نقشه',
    rateLimited: 'پرسش‌ها پشت سر هم زیاد شد. کمی درنگ کنید.',
    botNote: 'پاسخ‌ها خودکارند، بر پایهٔ همین صفحه.',
    calendarCta: 'افزودن به تقویم من',
    eventKind: 'جشن پیوند',
    rsvpOffline: 'پاسخ شما الان ثبت نمی‌شود. کمی بعد دوباره بفرستید — بقیهٔ صفحه سر جایش است.',
    icsSummary: 'جشن پیوند لیلا و محمدامین',
    lostTitle: 'این صفحه یافت نشد',
    lostBody: 'این نشانی به جایی نمی‌رسد. هرچه هست، در صفحهٔ نخست است.',
    lostCta: 'بازگشت به دعوت‌نامه',
    closing: 'خوشحال می‌شویم که در روز عروسی‌مان کنارمان باشید.',
    motto: 'رهتوشهٔ ما',
    cdDays: 'روز',
    cdHours: 'ساعت',
    cdMins: 'دقیقه',
    origins: [
      { country: 'مراکش', cities: 'ازرو' },
      { country: 'ایران', cities: 'تهران' },
      { country: 'الجزایر', cities: 'الجزیره · شلغوم‌العید' },
      { country: 'فرانسه', cities: 'پاریس · شونی' }
    ],
    salamGloss: '',
    doorHint: 'برای گشودن در، لمس کنید',
    verseGloss: '«و شما را جفت آفریدیم.»',
    verseRef: 'سورهٔ نبأ، ۸',
    heroInvite: 'شما را به جشن پیوند خود فرا می‌خوانند',
    fEmail: 'پست الکترونیکی شما (اختیاری)',
    errGoing: 'لطفاً یکی از دو گزینه را انتخاب کنید.',
    errName: 'لطفاً نامتان را بنویسید.',
    errNameLong: 'این نام بیش از اندازه بلند است.',
    wallTitle: 'دیوار مهمان‌ها',
    wallCta: 'روی دیوار بنویسید',
    wallClose: 'بستن',
    wallIntro: 'یک کلمه، یک عکس — و روی پردهٔ بزرگ می‌آید.',
    wallSign: 'نامتان',
    wallMessageLabel: 'پیامتان',
    wallPhotoLabel: 'یک عکس اضافه کنید',
    wallPhotoChange: 'تغییر',
    wallSubmit: 'بفرستید روی دیوار',
    wallPending: 'فرستاده شد! پیامتان تا لحظاتی دیگر روی پرده می‌آید.',
    wallClosed: 'دیوار فعلاً بسته است.',
    wallOffline: 'الان نمی‌شود فرستاد. کمی بعد دوباره بفرستید.',
    wallBusy: 'همزمان خیلی‌ها می‌فرستند — چند ثانیه بعد دوباره امتحان کنید.',
    wallTooMany: 'به‌اندازهٔ کافی فرستادید — کمی هم جا برای بقیه!',
    errWallAuthor: 'لطفاً پیامتان را امضا کنید.',
    errWallAuthorLong: 'این نام بیش از اندازه بلند است.',
    errWallMessageLong: 'این پیام برای پرده بیش از اندازه بلند است.',
    errWallEmpty: 'چند کلمه بنویسید یا عکسی اضافه کنید.',
    errWallPhotoBig: 'این عکس بیش از اندازه سنگین است.',
    errWallPhotoBad: 'این تصویر خوانده نشد. عکس دیگری امتحان کنید.',
    themeToLight: 'تغییر به پوستهٔ روشن',
    themeToDark: 'تغییر به پوستهٔ تیره',
    // Empty for the two Persian quotes. Persian DOES gloss the Arabic ones —
    // exactly as verseGloss above already does, unlike ar.
    starGloss: {
      rum30: { gloss: '«و میان شما دوستی و مهربانی نهاد.»', ref: 'سورهٔ روم، ۲۱' },
      stex: {
        gloss: '«عشق آن نیست که به یکدیگر بنگریم، بلکه آن است که با هم به یک سو بنگریم.»',
        ref: 'آنتوان دو سنت‌اگزوپری'
      },
      hafez: { gloss: '', ref: 'حافظ شیرازی، دیوان، غزل ۳۱۷' },
      bazin: { gloss: '«زندگی بی‌عشق، زندگی بی‌آفتاب است.»', ref: 'اروه بازن' },
      darija: {
        gloss: '«پیش از ازدواج چشم‌هایت را باز کن؛ پس از آن جز بستنشان کاری نمی‌توانی.»',
        ref: 'ضرب‌المثل مراکشی'
      },
      augustin: {
        gloss: '«عشق راستین هرگز تمام نمی‌شود؛ هرچه بیشتر ببخشی، بیشتر داری.»',
        ref: 'منسوب به آگوستین قدیس'
      },
      rumi: { gloss: '', ref: 'مولانا، رباعی' },
      dzkalam: { gloss: '«جز نیکو مگو، وگرنه خاموشی بهتر است.»', ref: 'ضرب‌المثل الجزایری' },
      hugo: { gloss: '«باید یکدیگر را دوست بداریم، و سپس باید آن را بگوییم.»', ref: 'ویکتور هوگو' },
      libas: { gloss: '«آنان پوشش شمایند و شما پوشش آنان.»', ref: 'سورهٔ بقره، ۱۸۷' }
    },
    starHint: 'اندیشه‌ای',
    langLabel: 'زبان'
  }
};

for (const lang of LANGS) Object.assign(STR[lang], EXTRA[lang]);
