import crypto from 'crypto';

/**
 * Valida la firma criptográfica leída de la tarjeta NFC para prevenir clonación.
 * 
 * @param cardId ObjectId de MongoDB (24 caracteres hex)
 * @param cardUid UID físico de fábrica (8 o 14 caracteres hex)
 * @param signature firma leída de la tarjeta (32 caracteres hex / 16 bytes)
 * @returns boolean indicando si la tarjeta es auténtica
 */
export function verifyNFCCardSignature(cardId: string, cardUid: string, signature: string): boolean {
  const secret = process.env.NFC_SIGNING_KEY;
  if (!secret) {
    // Si la clave no está configurada en las variables de entorno,
    // permitimos el paso por defecto (modo desarrollo/retrocompatibilidad)
    return true;
  }

  if (!cardId || !cardUid || !signature) {
    return false;
  }

  try {
    // Generamos el payload para el hash combinando el ObjectId y el UID físico en minúsculas
    const payload = `${cardId.toLowerCase()}:${cardUid.toLowerCase()}`;

    // Calculamos el HMAC-SHA256
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const calculatedSignatureFull = hmac.digest('hex');

    // Truncamos la firma calculada a los primeros 16 bytes (32 caracteres hexadecimales)
    // para que coincida con el espacio disponible en el Bloque 5 de la tarjeta
    const calculatedSignatureTruncated = calculatedSignatureFull.substring(0, 32);

    // Comparación en tiempo constante para evitar ataques de canal lateral (timing attacks)
    return crypto.timingSafeEqual(
      new Uint8Array(Buffer.from(signature.toLowerCase(), 'hex')),
      new Uint8Array(Buffer.from(calculatedSignatureTruncated, 'hex'))
    );
  } catch (err) {
    console.error('[NFC Cryptography] Error calculating or comparing signature:', err);
    return false;
  }
}

/**
 * Valida un token dinámico NFC/QR móvil basado en tiempo y firma HMAC.
 * 
 * @param cardId ObjectId de MongoDB del usuario (24 caracteres hex)
 * @param mobileToken token en formato "timestamp:firma" o "card_id:timestamp:firma"
 * @returns boolean indicando si el token es válido y no ha expirado
 */
export function verifyDynamicMobileToken(cardId: string, mobileToken: string): boolean {
  const secret = process.env.NFC_SIGNING_KEY;
  if (!secret) {
    // Si la clave no está configurada en las variables de entorno,
    // permitimos el paso por defecto (modo desarrollo/retrocompatibilidad)
    return true;
  }

  if (!cardId || !mobileToken) {
    return false;
  }

  try {
    const parts = mobileToken.split(':');
    let timestampStr = '';
    let tokenSignature = '';

    if (parts.length === 3) {
      // Formato completo: card_id:timestamp:signature
      const [tokenCardId, tStr, sig] = parts;
      if (tokenCardId.toLowerCase() !== cardId.toLowerCase()) {
        console.warn('[NFC Security] Token card_id no coincide con el card_id enviado.');
        return false;
      }
      timestampStr = tStr;
      tokenSignature = sig;
    } else if (parts.length === 2) {
      // Formato compacto: timestamp:signature
      const [tStr, sig] = parts;
      timestampStr = tStr;
      tokenSignature = sig;
    } else {
      console.warn('[NFC Security] Formato de token móvil inválido.');
      return false;
    }

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);

    // Ventana de expiración: máximo 60 segundos de antigüedad o 60 segundos de adelanto (reloj desincronizado)
    const timeDifference = Math.abs(now - timestamp);
    if (timeDifference > 60) {
      console.warn(`[NFC Security] Token móvil expirado por tiempo. Dif: ${timeDifference}s. Now: ${now}, Token: ${timestamp}`);
      return false;
    }

    // Recalcular firma para verificar integridad
    const payload = `${cardId.toLowerCase()}:${timestampStr}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex').substring(0, 32);

    return crypto.timingSafeEqual(
      new Uint8Array(Buffer.from(tokenSignature.toLowerCase(), 'hex')),
      new Uint8Array(Buffer.from(expectedSignature.toLowerCase(), 'hex'))
    );
  } catch (err) {
    console.error('[NFC Cryptography] Error validating dynamic mobile token:', err);
    return false;
  }
}

