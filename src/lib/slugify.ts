/**
 * Converts any string (Russian or English) to a clean, URL-safe slug.
 * Examples:
 *  "AquaDrive" -> "aquadrive"
 *  "Apex Автомойка" -> "apex-avtomoyka"
 *  "Мойка & Детейлинг №1" -> "moyka-deteyling-1"
 */
export function slugify(text: string): string {
  if (!text || typeof text !== 'string') return 'carwash';

  const ruMap: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
    з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
    п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
    ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };

  const transliterated = text
    .toLowerCase()
    .split('')
    .map((char) => (ruMap[char] !== undefined ? ruMap[char] : char))
    .join('');

  const slug = transliterated
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || 'carwash';
}
