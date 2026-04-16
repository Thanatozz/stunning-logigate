export function normalizeAccessPointKey(value: string | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function formatAccessPointLabel(key: string): string {
  const normalized = normalizeAccessPointKey(key)
  if (!normalized) return 'Punto de acceso'

  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
