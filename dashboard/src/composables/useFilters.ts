export function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export function includesKeyword(value: string, keyword: string) {
  if (!keyword.trim()) return true
  return normalizeText(value).includes(normalizeText(keyword))
}
