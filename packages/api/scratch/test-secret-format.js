import { generateSecret } from 'otplib'
const secret = generateSecret()
console.log('Secret généré:', secret)
console.log('Longueur:', secret.length)
