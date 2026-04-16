export function normalizePlateInput(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim()
}

export function isValidPlate(value: string): boolean {
  const normalized = normalizePlateInput(value)
  return normalized.length >= 5 && normalized.length <= 8
}

export function isValidEmail(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

export function isValidPassword(value: string): boolean {
  if (value.length < 8 || value.length > 72) return false
  const hasLetter = /[A-Za-z]/.test(value)
  const hasNumber = /\d/.test(value)
  return hasLetter && hasNumber
}

export function isValidFirmware(value: string): boolean {
  const normalized = value.trim()
  if (!normalized) return true
  if (normalized.length > 40) return false
  return /^[A-Za-z0-9._-]+$/.test(normalized)
}

export function validateRequiredText(
  value: string,
  label: string,
  options?: { min?: number; max?: number },
): string | null {
  const normalized = value.trim()
  const min = options?.min ?? 1
  const max = options?.max

  if (!normalized) return `${label} es obligatorio.`
  if (normalized.length < min) return `${label} debe tener al menos ${min} caracteres.`
  if (typeof max === 'number' && normalized.length > max) {
    return `${label} no puede superar ${max} caracteres.`
  }
  return null
}

export function validateNumberInRange(
  value: unknown,
  label: string,
  min: number,
  max: number,
): string | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return `${label} debe ser un numero valido.`
  if (parsed < min || parsed > max) {
    return `${label} debe estar entre ${min} y ${max}.`
  }
  return null
}

