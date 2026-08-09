import type { CultureLocale } from "./types";

/** Every user-facing string used by the Capital experience. */
export interface CultureStrings {
  capitalTitle: string;
  capitalSubtitle: string;
  computingOffer: string;
  preApprovedFor: string;
  totalRepayment: string;
  applyCta: string;
  notEligible: string;
  score: string;
  monthlyGmv: string;
  businessAge: string;
  revenueShare: string;
  activeAdvance: string;
  disbursedOn: string;
  repaid: string;
  balance: string;
  recordRepayment: string;
  record: string;
  repaymentHistory: string;
  statusHeading: string;
  stepSubmitted: string;
  stepUnderReview: string;
  stepApproved: string;
  stepDisbursed: string;
  disbursement: string;
  mpesaRef: string;
  disbursementFailed: string;
  repaymentActivity: string;
  lastSynced: string;
  noPartnerActivity: string;
  applicationHistory: string;
  // journey
  journeyTitle: string;
  journeySubtitle: string;
  nextAction: string;
  journeyStages: { title: string; body: string; action: string }[];
  requiredDocs: string;
  docsList: string[];
  // voice
  voiceTitle: string;
  voiceHint: string;
  voiceHold: string;
  voiceListening: string;
  voiceThinking: string;
  voiceTypeInstead: string;
  voiceAsk: string;
  voiceUnsupported: string;
  voiceConfirmTitle: string;
  voiceConfirmRetry: string;
  voiceConfirmDetails: string;
  voiceConfirm: string;
  voiceCancel: string;
  voiceGreeting: string;
  // notifications
  notifTitle: string;
  notifSubtitle: string;
  channelEmail: string;
  channelSlack: string;
  channelInApp: string;
  freqImmediate: string;
  freqHourly: string;
  freqDaily: string;
  freqOff: string;
  saved: string;
  language: string;
  tone: string;
}

const en: CultureStrings = {
  capitalTitle: "SmartReach Capital",
  capitalSubtitle:
    "Revenue-based financing tied to your SmartReach Score. No fixed monthly payments — repay a small share of your daily M-Pesa income.",
  computingOffer: "Computing your offer…",
  preApprovedFor: "You're pre-approved for up to",
  totalRepayment: "Total repayment",
  applyCta: "Apply for advance",
  notEligible: "Not eligible yet",
  score: "SmartReach Score",
  monthlyGmv: "30-day M-Pesa GMV",
  businessAge: "Business age",
  revenueShare: "Revenue share",
  activeAdvance: "Active advance",
  disbursedOn: "Disbursed",
  repaid: "Repaid",
  balance: "Balance",
  recordRepayment: "Record a manual repayment (KES)",
  record: "Record",
  repaymentHistory: "Repayment history",
  statusHeading: "Application & disbursement status",
  stepSubmitted: "Application submitted",
  stepUnderReview: "Under review",
  stepApproved: "Approved",
  stepDisbursed: "Funds disbursed",
  disbursement: "Disbursement",
  mpesaRef: "M-Pesa reference",
  disbursementFailed: "We couldn't send your funds yet",
  repaymentActivity: "Repayment activity",
  lastSynced: "Last synced with our lending partners",
  noPartnerActivity: "no partner activity yet",
  applicationHistory: "Application history",
  journeyTitle: "Your Capital journey",
  journeySubtitle: "Four steps from eligibility to funds in your M-Pesa.",
  nextAction: "Next step",
  journeyStages: [
    { title: "Check eligibility", body: "We read your SmartReach Score, M-Pesa turnover and business age. Nothing to fill in.", action: "See my offer" },
    { title: "Understand your offer", body: "Amount, factor and daily revenue share are all shown up front. No hidden interest.", action: "Review terms" },
    { title: "Sign and submit", body: "Type your legal name to e-sign and authorize daily collection from your till.", action: "Apply now" },
    { title: "Get funded and repay", body: "Funds land in your M-Pesa. We collect a small share of daily income until fully repaid.", action: "Track my advance" },
  ],
  requiredDocs: "Documents you should have ready",
  docsList: [
    "National ID or passport of the business owner",
    "Active M-Pesa till or paybill number",
    "Business registration certificate (if registered)",
    "Last 3 months of M-Pesa statements (we auto-read what's already in SmartReach)",
  ],
  voiceTitle: "Ask about your advance",
  voiceHint: "Ask about disbursement, repayments, or the last partner sync.",
  voiceHold: "Hold to talk",
  voiceListening: "Listening…",
  voiceThinking: "Thinking…",
  voiceTypeInstead: "Or type your question",
  voiceAsk: "Ask",
  voiceUnsupported: "Voice input isn't supported on this browser — type your question instead.",
  voiceConfirmTitle: "Confirm this action",
  voiceConfirmRetry: "Refresh your advance status now?",
  voiceConfirmDetails: "Open your application details so you can check and confirm them?",
  voiceConfirm: "Confirm",
  voiceCancel: "Cancel",
  voiceGreeting: "Hello. Ask me anything about your advance.",
  notifTitle: "Notification preferences",
  notifSubtitle: "Choose how you hear about sync, disbursement and repayment events.",
  channelEmail: "Email",
  channelSlack: "Slack",
  channelInApp: "In-app",
  freqImmediate: "Immediately",
  freqHourly: "Hourly digest",
  freqDaily: "Daily digest",
  freqOff: "Off",
  saved: "Preferences saved",
  language: "Language",
  tone: "Tone",
};

const sw: CultureStrings = {
  ...en,
  capitalTitle: "SmartReach Capital",
  capitalSubtitle:
    "Mkopo unaotegemea mapato yako na SmartReach Score. Hakuna malipo ya kila mwezi — unarejesha sehemu ndogo ya mapato yako ya M-Pesa kila siku.",
  computingOffer: "Tunahesabu ofa yako…",
  preApprovedFor: "Umeidhinishwa mapema hadi",
  totalRepayment: "Marejesho yote",
  applyCta: "Omba mkopo",
  notEligible: "Hujafikia vigezo bado",
  score: "SmartReach Score",
  monthlyGmv: "Mapato ya M-Pesa (siku 30)",
  businessAge: "Umri wa biashara",
  revenueShare: "Sehemu ya mapato",
  activeAdvance: "Mkopo unaoendelea",
  disbursedOn: "Ilitolewa",
  repaid: "Imerejeshwa",
  balance: "Salio",
  recordRepayment: "Weka marejesho ya mkono (KES)",
  record: "Weka",
  repaymentHistory: "Historia ya marejesho",
  statusHeading: "Hali ya maombi na utoaji wa fedha",
  stepSubmitted: "Maombi yamewasilishwa",
  stepUnderReview: "Yanapitiwa",
  stepApproved: "Yamekubaliwa",
  stepDisbursed: "Fedha zimetolewa",
  disbursement: "Utoaji wa fedha",
  mpesaRef: "Kumbukumbu ya M-Pesa",
  disbursementFailed: "Hatuwezi kutuma fedha zako bado",
  repaymentActivity: "Shughuli za marejesho",
  lastSynced: "Usawazishaji wa mwisho na washirika wetu",
  noPartnerActivity: "hakuna shughuli ya mshirika bado",
  applicationHistory: "Historia ya maombi",
  journeyTitle: "Safari yako ya mkopo",
  journeySubtitle: "Hatua nne kutoka vigezo hadi fedha kwenye M-Pesa yako.",
  nextAction: "Hatua inayofuata",
  journeyStages: [
    { title: "Angalia vigezo", body: "Tunaangalia SmartReach Score, mapato ya M-Pesa na umri wa biashara. Hakuna fomu.", action: "Ona ofa yangu" },
    { title: "Elewa ofa yako", body: "Kiasi, kizidishi na sehemu ya mapato ya kila siku yanaonyeshwa wazi. Hakuna riba iliyofichwa.", action: "Pitia masharti" },
    { title: "Saini na wasilisha", body: "Andika jina lako kamili kusaini na kuruhusu ukusanyaji wa kila siku kutoka till yako.", action: "Omba sasa" },
    { title: "Pokea na urejeshe", body: "Fedha zinaingia M-Pesa yako. Tunakusanya sehemu ndogo ya mapato hadi umalize.", action: "Fuatilia mkopo wangu" },
  ],
  requiredDocs: "Nyaraka unazopaswa kuwa nazo",
  docsList: [
    "Kitambulisho au pasipoti ya mmiliki wa biashara",
    "Namba ya till au paybill ya M-Pesa inayotumika",
    "Cheti cha usajili wa biashara (kama umesajili)",
    "Taarifa za M-Pesa za miezi 3 iliyopita (tunasoma zilizopo SmartReach)",
  ],
  voiceTitle: "Uliza kuhusu mkopo wako",
  voiceHint: "Uliza kuhusu utoaji wa fedha, marejesho au usawazishaji wa mwisho.",
  voiceHold: "Bonyeza na useme",
  voiceListening: "Nasikiliza…",
  voiceThinking: "Nafikiri…",
  voiceTypeInstead: "Au andika swali lako",
  voiceAsk: "Uliza",
  voiceUnsupported: "Kipaza sauti hakitumiki kwenye kivinjari hiki — andika swali lako.",
  voiceConfirmTitle: "Thibitisha hatua hii",
  voiceConfirmRetry: "Ungependa tuangalie upya hali ya mkopo wako sasa?",
  voiceConfirmDetails: "Tufungue maelezo ya maombi yako uyathibitishe?",
  voiceConfirm: "Thibitisha",
  voiceCancel: "Ghairi",
  voiceGreeting: "Habari. Niulize kuhusu mkopo wako.",
  notifTitle: "Mapendeleo ya taarifa",
  notifSubtitle: "Chagua unavyotaka kupata taarifa za usawazishaji, utoaji na marejesho.",
  channelEmail: "Barua pepe",
  channelSlack: "Slack",
  channelInApp: "Ndani ya app",
  freqImmediate: "Mara moja",
  freqHourly: "Muhtasari wa kila saa",
  freqDaily: "Muhtasari wa kila siku",
  freqOff: "Imezimwa",
  saved: "Mapendeleo yamehifadhiwa",
  language: "Lugha",
  tone: "Toni",
};

const sheng: CultureStrings = {
  ...sw,
  capitalSubtitle:
    "Doh ya biashara based on SmartReach Score yako. Hakuna monthly stress — unarejesha kidogo kutoka kwa M-Pesa yako kila siku.",
  computingOffer: "Tunapiga hesabu ya offer yako…",
  preApprovedFor: "Uko pre-approved mpaka",
  applyCta: "Apply doh",
  notEligible: "Bado hauko ready",
  activeAdvance: "Doh iko active",
  repaid: "Umerejesha",
  balance: "Balance",
  recordRepayment: "Weka repayment mwenyewe (KES)",
  statusHeading: "Story ya application na doh",
  stepUnderReview: "Inacheckiwa",
  disbursementFailed: "Doh haijatoka bado",
  journeyTitle: "Safari yako ya doh",
  journeySubtitle: "Hatua nne kutoka check mpaka doh iingie M-Pesa.",
  journeyStages: [
    { title: "Check kama unaqualify", body: "Tunacheck score yako, M-Pesa flow na muda wa biashara. Hakuna fomu ndefu.", action: "Ona offer yangu" },
    { title: "Elewa offer", body: "Kiasi, factor na share ya kila siku ziko wazi. Hakuna riba fiche.", action: "Check terms" },
    { title: "Sign na tuma", body: "Andika jina lako full ndio usign na uruhusu collection ya daily kutoka till.", action: "Apply saa hii" },
    { title: "Pata doh, urejeshe", body: "Doh inaingia M-Pesa. Tunachukua kidogo daily mpaka umalize.", action: "Track doh yangu" },
  ],
  voiceTitle: "Uliza kuhusu doh yako",
  voiceHint: "Uliza kuhusu doh, repayment ama sync ya mwisho.",
  voiceHold: "Hold useme",
  voiceGreeting: "Sasa. Niulize kuhusu doh yako.",
  notifTitle: "Settings za notification",
  notifSubtitle: "Chagua vipi unataka kujua kuhusu sync, doh na repayment.",
};

const kenglish: CultureStrings = {
  ...en,
  capitalSubtitle:
    "Revenue-based financing tied to your SmartReach Score. Hakuna fixed monthly payments — you repay a small share of your daily M-Pesa income.",
  computingOffer: "Tunahesabu your offer…",
  preApprovedFor: "You're pre-approved up to",
  applyCta: "Apply for advance",
  notEligible: "Bado you're not eligible",
  statusHeading: "Application & disbursement status",
  stepUnderReview: "Under review — inapitiwa",
  disbursementFailed: "Fedha haijatoka yet",
  journeyTitle: "Your Capital journey",
  journeySubtitle: "Four steps from eligibility mpaka funds ziingie M-Pesa yako.",
  journeyStages: [
    { title: "Check eligibility", body: "We read your SmartReach Score, M-Pesa turnover na business age. Hakuna forms.", action: "See my offer" },
    { title: "Understand your offer", body: "Amount, factor na daily revenue share ziko wazi. No hidden interest.", action: "Review terms" },
    { title: "Sign and submit", body: "Type your legal name to e-sign na uruhusu daily collection from your till.", action: "Apply now" },
    { title: "Get funded and repay", body: "Funds zinaingia M-Pesa yako. We collect a small share daily mpaka umalize.", action: "Track my advance" },
  ],
  voiceGreeting: "Sasa. Ask me anything about your advance.",
  voiceHint: "Ask about disbursement, repayments ama the last partner sync.",
};

export const DICTIONARY: Record<CultureLocale, CultureStrings> = { en, sw, sheng, kenglish };
