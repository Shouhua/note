const WebSocket = require('ws')
const http = require('http')


const server = http.createServer((req, res) => {
})

const ws = new WebSocket.Server({
	server
})

ws.on('connection', (client, req) => {
	client.on('message', (data) => {
		console.log(`[ws]: ${data}`)
    client.send(data)
	})	
})
const noop = () => {}
const interval = setInterval(function ping() {
  ws.clients.forEach(function each(ws) {
    // if (ws.isAlive === false) return ws.terminate();

    // ws.isAlive = false;
    ws.ping(noop);
  });
}, 10000);
ws.on('close', function close() {
  clearInterval(interval);
});

server.listen(3000, () => {
	console.log('Server is listening on 3000...');
})

// const client = new WebSocket('ws://localhost:5000/ws')
// client.on('pong', (data) => {
//   console.log(`pong received, ${data}`);
// }) 
// setInterval(() => {
//   client.ping('hello')
// }, 2000);
