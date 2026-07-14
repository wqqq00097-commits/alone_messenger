# Messenger with P2P encryption and relay server

This project includes:
- React + TypeScript web client
- Capacitor Android wrapper
- WebSocket relay server for remote chat
- ECDH key exchange and AES-GCM message encryption

## Server setup

1. Install dependencies:
   ```powershell
   npm install
   cd server
   npm install
   ```

2. Run the relay server:
   ```powershell
   cd server
   node index.js
   ```

3. To use the server from remote clients, run it on a public IP or cloud VM and open TCP port `3000`.

## Client setup

1. Install dependencies from project root:
   ```powershell
   npm install
   ```

2. Set server URL in `.env` (default is `ws://192.168.0.152:3000`):
   ```text
   VITE_WS_SERVER=ws://your-server-ip:3000
   ```

3. Run the web client:
   ```powershell
   npm run dev
   ```

## Windows server installer

Run from the project root:
```powershell
cd server
./install-server.ps1
```

Then launch the server:
```powershell
node index.js
```

## Notes

- For production, host the server on a public IP or cloud VM.
- Use HTTPS/WSS and proper SSL certs for public deployments.
- If you want real P2P without server relay, add WebRTC signaling and direct peer connection.
