import { AIProvider } from './provider.js';
import { ENV } from '../../config/env.js';

export class GeminiProvider extends AIProvider {
  constructor(apiKey = ENV.GEMINI_API_KEY, model = ENV.GEMINI_MODEL) {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }

  async processQuery(prompt, context) {
    // If Gemini API key is configured, call Gemini API
    if (this.apiKey && this.apiKey.trim().length > 10) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `You are the BizPilot AI business assistant.
Available Workspace Clients: ${JSON.stringify(context.clients || [])}
Workspace Currency: ${context.workspace?.currency || 'INR'}
Current Date: ${new Date().toISOString().split('T')[0]}

User Input: "${prompt}"

Analyze the user's intent. Supported intents:
- CREATE_INVOICE
- UPDATE_INVOICE_DRAFT
- GET_INVOICES
- GET_PENDING_INVOICES
- GET_OVERDUE_INVOICES
- GET_PAYMENT_HISTORY
- GET_COLLECTION_SUMMARY
- GET_CLIENT_DETAILS
- GENERATE_REMINDER
- ANALYZE_REVENUE
- FORECAST_COLLECTIONS
- GENERAL_QUERY

Return ONLY a valid JSON object with the following structure:
{
  "intent": "INTENT_NAME",
  "message": "Friendly response in the user's language (English/Hindi/Hinglish)",
  "missingFields": ["client", "amount", "dueDate", "description"], // empty if none
  "requiresConfirmation": true, // true if creating or updating an invoice
  "parameters": {
    "clientQuery": "extracted client name or username",
    "clientId": "matched client ID if resolved from client list",
    "amount": 15000,
    "currency": "INR",
    "description": "Website development",
    "dueDate": "YYYY-MM-DD",
    "taxRate": 18,
    "items": [
      { "description": "Website development", "quantity": 1, "unitPrice": 15000 }
    ]
  }
}`
                    }
                  ]
                }
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
              }
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            return JSON.parse(rawText);
          }
        }
      } catch (err) {
        console.warn('Gemini API call failed, falling back to local NLP parser:', err.message);
      }
    }

    // High precision local Multilingual NLP extractor for English, Hindi, and Hinglish
    return this.parseLocally(prompt, context);
  }

  parseLocally(prompt, context) {
    const p = prompt.trim();
    const lower = p.toLowerCase();
    const clients = context.clients || [];

    // 1. Intent Detection
    let intent = 'GENERAL_QUERY';
    if (
      lower.includes('invoice') && 
      (lower.includes('banao') || lower.includes('create') || lower.includes('generate') || lower.includes('make') || lower.includes('new') || lower.includes('tayyar karo'))
    ) {
      intent = 'CREATE_INVOICE';
    } else if (lower.includes('pending') || lower.includes('baki') || lower.includes('unpaid')) {
      intent = 'GET_PENDING_INVOICES';
    } else if (lower.includes('overdue') || lower.includes('late') || lower.includes('expired')) {
      intent = 'GET_OVERDUE_INVOICES';
    } else if (lower.includes('collected') || lower.includes('collection') || lower.includes('received') || lower.includes('how much money') || lower.includes('kitna paisa') || lower.includes('kamaya')) {
      intent = 'GET_COLLECTION_SUMMARY';
    } else if (lower.includes('reminder') || lower.includes('yaad dilao') || lower.includes('remind')) {
      intent = 'GENERATE_REMINDER';
    } else if (lower.includes('revenue') || lower.includes('analyze') || lower.includes('analysis') || lower.includes('top client')) {
      intent = 'ANALYZE_REVENUE';
    } else if (lower.includes('forecast') || lower.includes('expect') || lower.includes('next month')) {
      intent = 'FORECAST_COLLECTIONS';
    } else if (lower.includes('invoices') || lower.includes('bill')) {
      intent = 'GET_INVOICES';
    }

    // 2. Client Extraction
    let matchedClient = null;
    let clientQuery = null;

    for (const c of clients) {
      const cName = (c.name || '').toLowerCase();
      const cUser = (c.username || '').toLowerCase();
      if (lower.includes(cName) || lower.includes(cUser) || (cName.split(' ')[0] && lower.includes(cName.split(' ')[0]))) {
        matchedClient = c;
        clientQuery = c.name;
        break;
      }
    }

    // Fallback client extraction from regex (e.g. "Rahul ke liye", "for Rahul", "to Rahul")
    if (!matchedClient) {
      const clientRegex = /(?:for|to|ke liye)\s+([a-zA-Z0-9_\s]+?)(?:\s+(?:for|ka|ki|ke|rs|rupees|inr|\d|₹|$))/i;
      const match = p.match(clientRegex);
      if (match && match[1]) {
        clientQuery = match[1].trim();
        // check partial match
        matchedClient = clients.find(c => 
          c.name.toLowerCase().includes(clientQuery.toLowerCase()) || 
          c.username.toLowerCase().includes(clientQuery.toLowerCase())
        );
      }
    }

    // 3. Amount Extraction (Numbers, Hindi words, e.g., 15000, 15,000, pandrah hazaar, 1.5 lakh)
    let amount = null;
    const amountRegex = /(?:rs\.?|rupees|inr|₹)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rs|rupees|inr|₹|ka|hazaar|thousand|lakh)?/i;
    const amountMatch = lower.match(amountRegex);

    if (amountMatch && amountMatch[1]) {
      amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    // Word based amount checks (Hinglish / Hindi)
    if (!amount || isNaN(amount)) {
      if (lower.includes('pandrah hazaar') || lower.includes('15 hazaar') || lower.includes('fifteen thousand')) amount = 15000;
      else if (lower.includes('dus hazaar') || lower.includes('10 hazaar') || lower.includes('ten thousand')) amount = 10000;
      else if (lower.includes('bees hazaar') || lower.includes('20 hazaar') || lower.includes('twenty thousand')) amount = 20000;
      else if (lower.includes('pachas hazaar') || lower.includes('50 hazaar') || lower.includes('fifty thousand')) amount = 50000;
      else if (lower.includes('ek lakh') || lower.includes('one lakh')) amount = 100000;
      else if (lower.includes('paanch hazaar') || lower.includes('5 hazaar') || lower.includes('five thousand')) amount = 5000;
    }

    // 4. Service / Description Extraction
    let description = 'Professional Services';
    if (lower.includes('website development') || lower.includes('web development')) {
      description = 'Website Development';
    } else if (lower.includes('seo') || lower.includes('marketing')) {
      description = 'Digital Marketing & SEO';
    } else if (lower.includes('consulting') || lower.includes('advisory')) {
      description = 'Business Consulting';
    } else if (lower.includes('design') || lower.includes('ui/ux')) {
      description = 'UI/UX Design Services';
    } else {
      const descRegex = /(?:for|service|kaam|work)\s+([a-zA-Z0-9\s]+)$/i;
      const descMatch = p.match(descRegex);
      if (descMatch && descMatch[1] && !descMatch[1].toLowerCase().includes('rupees') && !descMatch[1].toLowerCase().includes('invoice')) {
        description = descMatch[1].trim();
      }
    }

    // 5. Due date (default 14 days from today)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Missing fields check for CREATE_INVOICE
    const missingFields = [];
    if (intent === 'CREATE_INVOICE') {
      if (!matchedClient && !clientQuery) missingFields.push('client');
      if (!amount) missingFields.push('amount');
    }

    let message = '';
    let draft = null;

    if (intent === 'CREATE_INVOICE') {
      if (missingFields.length > 0) {
        message = `I understand you want to create an invoice. Please specify ${missingFields.join(' and ')} so I can prepare the draft.`;
      } else {
        const clientName = matchedClient ? matchedClient.name : (clientQuery || 'Client');
        message = `I have prepared a draft invoice for **${clientName}** for **₹${amount.toLocaleString('en-IN')}** (${description}). Please review the draft preview below and confirm to save.`;
        draft = {
          clientName,
          clientId: matchedClient?.id || null,
          amount,
          currency: 'INR',
          description,
          dueDate: dueDateStr,
          taxRate: 18,
          taxAmount: Math.round(amount * 0.18),
          totalAmount: Math.round(amount * 1.18),
          items: [
            {
              description,
              quantity: 1,
              unitPrice: amount,
              total: amount,
            }
          ]
        };
      }
    } else if (intent === 'GET_COLLECTION_SUMMARY') {
      message = 'Here is your real-time collection summary fetched directly from your verified financial records:';
    } else if (intent === 'GET_PENDING_INVOICES') {
      message = 'Fetching all pending and outstanding client invoices...';
    } else if (intent === 'GET_OVERDUE_INVOICES') {
      message = 'Fetching overdue invoices that need immediate attention...';
    } else {
      message = `I am ready to assist your business. You can ask me to create invoices, track collections, or review client payments.`;
    }

    return {
      intent,
      message,
      missingFields,
      requiresConfirmation: intent === 'CREATE_INVOICE' && missingFields.length === 0,
      parameters: {
        clientQuery,
        clientId: matchedClient?.id || null,
        amount,
        currency: 'INR',
        description,
        dueDate: dueDateStr,
        taxRate: 18,
        items: amount ? [{ description, quantity: 1, unitPrice: amount }] : [],
      },
      draft,
    };
  }
}
