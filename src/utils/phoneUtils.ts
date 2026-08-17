/**
 * Phone and contact utility functions
 * Supports single or multiple phone numbers separated by '/', ',', ';', '|', 'et', 'ou', or spaces.
 * Example inputs: "45469898 / 71301515", "45 46 98 98 / 71 30 15 15", "+226 72567606"
 */

export interface ParsedPhone {
  raw: string;
  clean: string; // 8 digits (or full national digits)
  formatted: string; // "+226 45 46 98 98"
  telHref: string; // "tel:+22645469898"
  waHref: string; // "https://wa.me/22645469898"
}

/**
 * Extracts and cleans each individual phone number from a raw input string.
 */
export function extractPhoneNumbers(input: string | undefined | null): string[] {
  if (!input || typeof input !== 'string') return [];
  
  // Split by common delimiters (slash, comma, semicolon, pipe, "et", "ou", newlines)
  const parts = input.split(/[/,;|]|\bet\b|\bou\b|\n+/gi);
  const results: string[] = [];

  for (const part of parts) {
    // Keep only digits
    let digits = part.replace(/\D/g, '');
    if (!digits) continue;

    // If starts with 226 country code and has more than 8 digits, strip 226
    if (digits.startsWith('226') && digits.length >= 11) {
      digits = digits.substring(3);
    }
    // If digits string is long (e.g. 16 digits pasted together "4546989871301515"), split into 8-digit chunks
    if (digits.length === 16) {
      results.push(digits.substring(0, 8));
      results.push(digits.substring(8, 16));
      continue;
    }

    if (digits.length >= 6) {
      results.push(digits);
    }
  }

  return results.length > 0 ? results : (input.replace(/\D/g, '') ? [input.replace(/\D/g, '')] : []);
}

/**
 * Formats an 8-digit Burkinabé phone number into standard "XX XX XX XX" or "+226 XX XX XX XX"
 */
export function formatSinglePhoneNumber(digits: string, withPrefix = true): string {
  if (!digits) return '';
  const clean = digits.replace(/\D/g, '');
  
  // Format as XX XX XX XX if length is 8
  let formattedDigits = clean;
  if (clean.length === 8) {
    formattedDigits = `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)} ${clean.slice(6, 8)}`;
  } else if (clean.length > 8) {
    // Format in pairs of 2 as much as possible
    formattedDigits = clean.match(/.{1,2}/g)?.join(' ') || clean;
  }

  return withPrefix ? `+226 ${formattedDigits}` : formattedDigits;
}

/**
 * Returns a comprehensive array of parsed phone objects for UI rendering & multi-button click actions
 */
export function getParsedPhoneList(input: string | undefined | null, defaultFallback = '72567606'): ParsedPhone[] {
  const rawInput = (input && input.trim()) ? input.trim() : defaultFallback;
  const numbers = extractPhoneNumbers(rawInput);

  if (numbers.length === 0) {
    numbers.push('72567606');
  }

  return numbers.map(digits => {
    // Burkina phone is 8 digits; remove any leading 226 for clean representation
    let clean = digits;
    if (clean.startsWith('226') && clean.length >= 11) {
      clean = clean.substring(3);
    }
    return {
      raw: digits,
      clean,
      formatted: formatSinglePhoneNumber(clean, true),
      telHref: `tel:+226${clean}`,
      waHref: `https://wa.me/226${clean}`
    };
  });
}

/**
 * Formats a combined phone string for UI display (e.g. "+226 45 46 98 98 / +226 71 30 15 15")
 */
export function formatPhoneDisplay(input: string | undefined | null, defaultFallback = '72567606'): string {
  const parsed = getParsedPhoneList(input, defaultFallback);
  return parsed.map(p => p.formatted).join(' / ');
}

/**
 * Returns the primary (first) clean phone number for single tel: or wa.me links
 */
export function getPrimaryCleanPhone(input: string | undefined | null, defaultFallback = '72567606'): string {
  const parsed = getParsedPhoneList(input, defaultFallback);
  return parsed[0]?.clean || defaultFallback;
}

/**
 * Builds a valid WhatsApp direct chat URL with an optional pre-filled message
 */
export function buildWhatsAppLink(input: string | undefined | null, message?: string, defaultFallback = '72567606'): string {
  const primary = getPrimaryCleanPhone(input, defaultFallback);
  const baseUrl = `https://wa.me/226${primary}`;
  if (message) {
    return `${baseUrl}?text=${encodeURIComponent(message)}`;
  }
  return baseUrl;
}

/**
 * Builds a valid direct phone call `tel:+226...` URL
 */
export function buildTelLink(input: string | undefined | null, defaultFallback = '72567606'): string {
  const primary = getPrimaryCleanPhone(input, defaultFallback);
  return `tel:+226${primary}`;
}
