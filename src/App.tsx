import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  decryptText,
  deriveSharedKey,
  encryptText,
  exportPublicKey,
  generateEcdhKeyPair,
} from './lib/crypto'
import { connectWebSocket, ServerMessage } from './lib/network'

type Message = {
  id: number
  text: string
  from: 'me' | 'peer'
}

function App() {
  const [localName, setLocalName] = useState('Me')
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: 'Привет! Это защищённый чат.', from: 'peer' },
  ])
  const [draft, setDraft] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [peerPublicKey, setPeerPublicKey] = useState('')
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null)
  const [status, setStatus] = useState('Готово к обмену ключами и со связью с сервером')
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)

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
      socketRef.current?.close()
    }
  }, [])

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_WS_SERVER || 'ws://192.168.0.152:3000'

    void connectWebSocket(serverUrl, (message) => {
      if (message.type === 'chat') {
        setMessages((current) => [
          ...current,
          { id: Date.now(), text: message.payload, from: 'peer' },
        ])
        setStatus('Получено сообщение от сервера')
      }
    }).then((socket) => {
      socketRef.current = socket
      setConnected(true)
      setStatus(`Подключено к серверу ${serverUrl}`)
    }).catch((error) => {
      console.error('WebSocket connect error', error)
      setStatus('Не удалось подключиться к серверу')
    })
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
    if (!connected || !socketRef.current) {
      setStatus('Нет соединения с сервером')
      return
    }

    const payload = await encryptText(draft.trim(), sharedKey)
    const encrypted = `${payload.iv}:${payload.cipherText}`
    const messagePayload = JSON.stringify({ type: 'chat', payload: encrypted })

    socketRef.current.send(messagePayload)
    setMessages((current) => [...current, { id: Date.now(), text: encrypted, from: 'me' }])
    setDraft('')
    setStatus('Сообщение отправлено на сервер и доставлено участнику')
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
            <span>{connected ? 'Сервер online' : 'Сервер offline'}</span>
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
