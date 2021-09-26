const { Kafka } = require('kafkajs')
const msg = process.argv[2];
run()
async function run() {
  try {
    const kafka = new Kafka({
      "clientId": 'myapp',
      "brokers": ['runner:9092']
    }) 
    const producer = kafka.producer()
    console.log("Connecting...")
    await producer.connect()
    console.log("Connected!")
    const result = await producer.send({
      "topic": "Users",
      "messages": [
        {
          "value": msg,
          "partition": msg[0] < 'N' ? 0 : 1
        }
      ]
    })
    console.log(`Create Successfully, result is ${JSON.stringify(result)}`);
    await producer.disconnect()
  } catch (err) {
    console.log(`bad happened ${err}`) 
  } finally {
    process.exit(0)
  }
}