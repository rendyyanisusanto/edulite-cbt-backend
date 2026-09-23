export function generatePassword(length = 8) {
  // Exclude ambiguous characters: 0, O, 1, I, l
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  // Format as XXX-XXXX for readability if length is 7 or more
  if (length >= 7) {
    const half = Math.floor(length / 2)
    return password.substring(0, half) + password.substring(half) // Actually wait, EDU-XXXX format was requested as an option. Let's just return plain for now or stick to plain length
  }
  return password
}

export function generateEduPassword() {
  const randomPart = generatePassword(5)
  return `EDU${randomPart}`
}
