
import { WORKFLOW_ACTIONS } from '../../../utils/constants.js';

const INTENT_PATTERNS = [
  {
    intent: WORKFLOW_ACTIONS.CREATE_INVOICE_DRAFT,
    patterns: [
      /\b(create|make|generate|prepare|draft)\b.{0,40}\b(invoice|bill)\b/i,
      /\b(invoice|bill)\b.{0,40}\b(create|make|generate|prepare)\b/i,
      /\b(invoice|bill)\b.{0,30}\b(banao|bana|banado|taiyar)\b/i,
      /\b(banao|bana|banado|taiyar karo)\b.{0,40}\b(invoice|bill)\b/i,
      /इनवॉइस.{0,20}(बनाओ|बनाना|तैयार)/,
      /बिल.{0,20}(बनाओ|बनाना|तैयार)/
    ]
  },
  {
    intent: WORKFLOW_ACTIONS.GET_INVOICE_STATUS,
    patterns: [
      /\b(invoice|bill)\b.{0,30}\b(status|state)\b/i,
      /\b(status|state)\b.{0,30}\b(invoice|bill)\b/i,
      /\b(invoice|bill)\b.{0,30}\b(paid|unpaid|pending|overdue)\b/i,
      /\b(payment|invoice)\b.{0,30}\b(status|hua|huwa)\b/i,
      /इनवॉइस.{0,20}(स्टेटस|स्थिति|भुगतान)/,
      /बिल.{0,20}(स्टेटस|स्थिति|भुगतान)/
    ]
  },
  {
    intent: WORKFLOW_ACTIONS.GET_INVOICE,
    patterns: [
      /\b(show|get|find|open|view|details|fetch)\b.{0,40}\b(invoice|bill)\b/i,
      /\b(invoice|bill)\b.{0,30}\b(details|number|information)\b/i,
      /\b(invoice|bill)\b.{0,30}\b(dikhao|dikha|batao)\b/i,
      /इनवॉइस.{0,20}(दिखाओ|बताओ|जानकारी)/,
      /बिल.{0,20}(दिखाओ|बताओ|जानकारी)/
    ]
  },
  {
    intent: WORKFLOW_ACTIONS.GET_PAYMENT_HISTORY,
    patterns: [
      /\b(payment|transaction)\b.{0,30}\b(history|records|list|details)\b/i,
      /\b(history|records|list)\b.{0,30}\b(payment|transaction)\b/i,
      /\b(payment|transaction)\b.{0,30}\b(history|record|details)\b/i,
      /पेमेंट.{0,20}(हिस्ट्री|इतिहास|रिकॉर्ड)/,
      /भुगतान.{0,20}(हिस्ट्री|इतिहास|रिकॉर्ड)/
    ]
  },
  {
    intent: WORKFLOW_ACTIONS.GET_OUTSTANDING_BALANCE,
    patterns: [
      /\b(outstanding|remaining|unpaid|due)\b.{0,30}\b(balance|amount|payment|money)\b/i,
      /\b(balance|amount)\b.{0,30}\b(outstanding|remaining|unpaid|due)\b/i,
      /\b(kitna|kitne)\b.{0,30}\b(baki|baaki|pending|due)\b/i,
      /कितना.{0,20}(बाकी|बकाया|पेंडिंग)/,
      /बकाया.{0,20}(राशि|पेमेंट|पैसा)/
    ]
  },
  {
    intent: WORKFLOW_ACTIONS.GET_DASHBOARD_SUMMARY,
    patterns: [
      /\b(dashboard|business)\b.{0,30}\b(summary|overview|report)\b/i,
      /\b(summary|overview)\b.{0,30}\b(dashboard|business)\b/i,
      /\b(show|give|get)\b.{0,30}\b(my|business)\b.{0,20}\b(summary|overview)\b/i,
      /डैशबोर्ड.{0,20}(दिखाओ|समरी|रिपोर्ट)/,
      /बिजनेस.{0,20}(समरी|रिपोर्ट|जानकारी)/
    ]
  },
  {
    intent: WORKFLOW_ACTIONS.PREPARE_PAYMENT_FOLLOWUP,
    patterns: [
      /\b(payment|invoice)\b.{0,40}\b(reminder|follow.?up)\b/i,
      /\b(remind|reminder|follow.?up)\b.{0,40}\b(client|customer|payment|invoice)\b/i,
      /\b(payment|invoice)\b.{0,30}\b(remind|reminder|follow.?up)\b/i,
      /\b(client|customer)\b.{0,30}\b(payment|invoice)\b.{0,20}\b(reminder|follow.?up)\b/i,
      /पेमेंट.{0,20}(रिमाइंडर|याद दिलाने)/,
      /क्लाइंट.{0,30}(पेमेंट|भुगतान).{0,20}(याद|रिमाइंडर)/
    ]
  },
  {
    intent: WORKFLOW_ACTIONS.PREPARE_CLIENT_MESSAGE,
    patterns: [
      /\b(draft|write|prepare|compose)\b.{0,40}\b(message|email|reply|text)\b/i,
      /\b(message|email)\b.{0,30}\b(client|customer)\b/i,
      /\b(client|customer)\b.{0,30}\b(message|email)\b/i,
      /\b(client|customer)\b.{0,30}\b(msg|message)\b.{0,20}\b(banao|likho)\b/i,
      /क्लाइंट.{0,20}(मैसेज|संदेश|ईमेल).{0,20}(लिखो|बनाओ)/,
      /मैसेज.{0,20}(लिखो|बनाओ|तैयार)/
    ]
  },
  {
    intent: WORKFLOW_ACTIONS.SEND_INVOICE,
    patterns: [
      /\b(send|email|share|deliver)\b.{0,40}\b(invoice|bill)\b/i,
      /\b(invoice|bill)\b.{0,30}\b(send|email|share)\b/i,
      /\b(invoice|bill)\b.{0,30}\b(bhejo|bhej|send karo)\b/i,
      /इनवॉइस.{0,20}(भेजो|भेजना|सेंड)/,
      /बिल.{0,20}(भेजो|भेजना|सेंड)/
    ]
  },
  {
    intent: WORKFLOW_ACTIONS.CANCEL_INVOICE,
    patterns: [
      /\b(cancel|void|delete)\b.{0,40}\b(invoice|bill)\b/i,
      /\b(invoice|bill)\b.{0,30}\b(cancel|void)\b/i,
      /\b(invoice|bill)\b.{0,30}\b(cancel karo|radd)\b/i,
      /इनवॉइस.{0,20}(रद्द|कैंसल|डिलीट)/,
      /बिल.{0,20}(रद्द|कैंसल|डिलीट)/
    ]
  }
];

const normalizeText = (value = '') =>
  String(value)
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();

export const detectIntent = (input = '') => {
  const message = normalizeText(input);

  if (!message) {
    return {
      intent: null,
      matchedKeywords: []
    };
  }

  for (const entry of INTENT_PATTERNS) {
    for (const pattern of entry.patterns) {
      const match = message.match(pattern);

      if (match) {
        return {
          intent: entry.intent,
          matchedKeywords: [match[0]]
        };
      }
    }
  }

  return {
    intent: null,
    matchedKeywords: []
  };
};
