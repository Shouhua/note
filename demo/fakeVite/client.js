const socketUrl = `ws://${location.hostname}:3030`
const socket = new WebSocket(socketUrl)
socket.addEventListener('message', async ({data}) => {
  const payload = JSON.parse(data)
  console.log(payload)
  if(payload.type === 'full-reload') {
    location.reload()
  }
})