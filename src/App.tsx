import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  decryptText,
  deriveSharedKey,
  encryptText,
  exportPublicKey,
  generateEcdhKeyPair,
} from './lib/crypto'

type Message = {
  id: number
  text: string
  from: 'me' | 'peer'
}

function App() {
  const [peerId] = useState('peer-device')
  const [localName, setLocalName] = useState('Me')
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: 'Привет! Это защищённый чат.', from: 'peer' },
  ])
  const [draft, setDraft] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [peerPublicKey, setPeerPublicKey] = useState('')
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null)
  const [status, setStatus] = useState('Готово к обмену ключами')

  useEffect(() => {
    let cancelled = false

    async function init() {
      const pair = await generateEcdhKeyPair()
      if (cancelled) return
      const exported = await exportPublicKey(pair.publicKey)
      setPublicKey(exported)
      setStatus('Ключи сгенерированы. Поделитесь публичным ключом с собеседником.')
      ;(window as Window & { __keyPair?: CryptoKeyPair }).__keyPair = pair
    }

    void init()

    return () => {
      cancelled = true
    }
  }, [])

  const keySummary = useMemo(() => {
    return publicKey ? `${publicKey.slice(0, 32)}…` : 'Не сгенерирован'
  }, [publicKey])

  async function handleExchange() {
    if (!peerPublicKey) {
      setStatus('Введите публичный ключ собеседника')
      return
    }

    const pair = (window as Window & { __keyPair?: CryptoKeyPair }).__keyPair
    if (!pair) {
      setStatus('Ключевая пара ещё не готова')
      return
    }

    const derived = await deriveSharedKey(pair.privateKey, peerPublicKey)
    setSharedKey(derived)
    setStatus('Секретный ключ согласован. Можно отправлять сообщения.')
  }

  async function handleSend() {
    if (!draft.trim()) return
    if (!sharedKey) {
      setStatus('Сначала выполните обмен ключами')
      return
    }

    const payload = await encryptText(draft.trim(), sharedKey)
    const encrypted = `${payload.iv}:${payload.cipherText}`
    const incoming = {
      id: Date.now(),
      text: encrypted,
      from: 'me' as const,
    }

    setMessages((current) => [...current, incoming])
    setDraft('')
    setStatus('Сообщение отправлено и зашифровано')

    const peerReply = {
      id: Date.now() + 1,
      text: `Секретный ответ: ${encrypted.slice(0, 32)}…`,
      from: 'peer' as const,
    }
    setMessages((current) => [...current, peerReply])
  }

  async function handleDecrypt(message: Message) {
    if (!sharedKey) {
      setStatus('Сначала выполните обмен ключами')
      return
    }

    const [iv, cipherText] = message.text.split(':')
    if (!iv || !cipherText) {
      setStatus('Это не зашифрованное сообщение')
      return
    }

    const plain = await decryptText(cipherText, iv, sharedKey)
    setStatus(`Расшифровано: ${plain}`)
  }

  return (
    <main className="app-shell">
      <section className="panel">
        <div className="header">
          <div>
            <p className="eyebrow">Secure Messenger</p>
            <h1>Peer-to-peer чат</h1>
          </div>
          <div className="badge">AES-GCM + ECDH</div>
        </div>

        <div className="card">
          <label>Ваше имя</label>
          <input value={localName} onChange={(event) => setLocalName(event.target.value)} />

          <label>Публичный ключ</label>
          <textarea value={publicKey} readOnly rows={4} />
          <p className="muted">Ключ: {keySummary}</p>

          <label>Публичный ключ собеседника</label>
          <textarea
            value={peerPublicKey}
            onChange={(event) => setPeerPublicKey(event.target.value)}
            rows={4}
            placeholder="Вставьте публичный ключ собеседника"
          />

          <button onClick={() => void handleExchange()}>Согласовать ключ</button>
        </div>

        <div className="card">
          <div className="chat-header">
            <strong>{localName}</strong>
            <span>{peerId}</span>
          </div>

          <div className="messages">
            {messages.map((message) => (
              <div key={message.id} className={`bubble ${message.from}`}>
                <div>{message.text}</div>
                <button onClick={() => void handleDecrypt(message)}>Расшифровать</button>
              </div>
            ))}
          </div>

          <div className="composer">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Введите сообщение"
            />
            <button onClick={() => void handleSend()}>Отправить</button>
          </div>

          <p className="status">{status}</p>
        </div>
      </section>
    </main>
  )
}

export default App
