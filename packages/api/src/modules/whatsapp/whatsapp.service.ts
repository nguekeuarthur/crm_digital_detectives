import crypto from 'crypto';

export class WhatsappService {
  /**
   * Nettoie et normalise un numéro de téléphone en ne conservant que les chiffres
   */
  static normalizePhone(phone: string): string {
    if (!phone) return '';
    // Retirer le préfixe "whatsapp:" si présent
    const cleaned = phone.trim().replace(/^whatsapp:/i, '');
    // Conserver uniquement les chiffres
    return cleaned.replace(/\D/g, '');
  }

  /**
   * Compare deux numéros de téléphone de manière robuste.
   * Compare la correspondance exacte ou les 9 derniers chiffres (standards en Europe)
   * pour éviter les écarts d'indicatifs (+41, 0041, 0, etc.).
   */
  static matchPhone(phone1: string, phone2: string): boolean {
    const p1 = this.normalizePhone(phone1);
    const p2 = this.normalizePhone(phone2);
    if (!p1 || !p2) return false;
    
    if (p1.length < 9 || p2.length < 9) {
      return p1 === p2;
    }
    
    return p1.endsWith(p2.slice(-9)) || p2.endsWith(p1.slice(-9));
  }

  /**
   * Valide la signature X-Twilio-Signature envoyée par Twilio pour authentifier le webhook
   */
  static validateSignature(
    authToken: string,
    signature: string,
    url: string,
    params: Record<string, unknown>
  ): boolean {
    const sortedKeys = Object.keys(params).sort();
    let data = url;
    for (const key of sortedKeys) {
      const val = params[key];
      const strVal = Array.isArray(val) ? val.join('') : String(val);
      data += key + strVal;
    }
    
    const expected = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');
      
    return signature === expected;
  }

  /**
   * Envoie un message WhatsApp via l'API REST de Twilio (sans dépendance externe)
   */
  static async sendMessage(options: {
    to: string;
    body: string;
    mediaUrl?: string;
  }): Promise<{ sid: string; status: string; [key: string]: unknown }> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_NUMBER;

    // Mode simulation si les identifiants Twilio ne sont pas configurés
    if (!accountSid || !authToken || !from) {
      console.warn('⚠️ [Twilio] Configuration incomplète (.env). Mode simulation activé.');
      return {
        sid: 'SMmock_' + crypto.randomBytes(16).toString('hex'),
        status: 'queued',
        body: options.body,
        to: options.to,
        from: from || 'whatsapp:+14155238886',
        dateCreated: new Date().toISOString()
      };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const bodyParams = new URLSearchParams();
    bodyParams.append('From', from.startsWith('whatsapp:') ? from : `whatsapp:${from}`);
    bodyParams.append('To', options.to.startsWith('whatsapp:') ? options.to : `whatsapp:${options.to}`);
    bodyParams.append('Body', options.body);
    
    if (options.mediaUrl) {
      bodyParams.append('MediaUrl', options.mediaUrl);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyParams.toString()
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erreur Twilio API (${response.status}) : ${errText}`);
    }

    return response.json() as Promise<{ sid: string; status: string; [key: string]: unknown }>;
  }
}
