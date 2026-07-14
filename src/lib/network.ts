export type ServerMessage = {
  type: 'chat'
  payload: string
}

export async function connectWebSocket(serverUrl: string, onMessage: (message: ServerMessage) => void) {
  return new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(serverUrl)

    socket.addEventListener('open', () => {
      console.log('WebSocket connected to', serverUrl)
      resolve(socket)
    })

    socket.addEventListener('message', (event) => {
      try {
        const parsed: ServerMessage = JSON.parse(event.data)
        onMessage(parsed)
      } catch (error) {
        console.error('Invalid message from server', error)
      }
    })

    socket.addEventListener('close', () => {
      console.log('WebSocket closed')
    })

    socket.addEventListener('error', (event) => {
      reject(new Error('WebSocket connection failed'))
      console.error('WebSocket error', event)
    })
  })
}
