const encoder = new TextEncoder()
const decoder = new TextDecoder()

export async function generateEcdhKeyPair() {
  return crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveBits'],
  )
}

export async function exportPublicKey(publicKey: CryptoKey) {
  const raw = await crypto.subtle.exportKey('spki', publicKey)
  return arrayBufferToBase64(raw)
}

export async function importPublicKey(publicKeyBase64: string) {
  const raw = base64ToArrayBuffer(publicKeyBase64)
  return crypto.subtle.importKey(
    'spki',
    raw,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    [],
  )
}

export async function deriveSharedKey(privateKey: CryptoKey, remotePublicKeyBase64: string) {
  const remotePublicKey = await importPublicKey(remotePublicKeyBase64)
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: remotePublicKey,
    },
    privateKey,
    256,
  )
  const hash = await crypto.subtle.digest('SHA-256', bits)
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function encryptText(text: string, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(text),
  )

  return {
    iv: arrayBufferToBase64(iv),
    cipherText: arrayBufferToBase64(cipher),
  }
}

export async function decryptText(cipherText: string, iv: string, key: CryptoKey) {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToUint8Array(iv) },
    key,
    base64ToArrayBuffer(cipherText),
  )

  return decoder.decode(plain)
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}

function base64ToUint8Array(base64: string) {
  return new Uint8Array(base64ToArrayBuffer(base64))
}
