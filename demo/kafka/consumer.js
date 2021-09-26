const { Kafka } = require('kafkajs')
const msg = process.argv[2];
run()
async function run() {
  try {
    const kafka = new Kafka({
      "clientId": 'myapp',
      "brokers": ['runner:9092']
    }) 
    const consumer = kafka.consumer({
      "groupId": "test"
    })
    console.log("Connecting...")
    await consumer.connect()
    console.log("Connected!")

    await consumer.subscribe({
      "topic": "Users",
      "fromBeginning": true
    })
    await consumer.run({
      "eachMessage": async (payload) => {
        console.log(`Received message ${payload.message.value} on partition ${payload.partition}`)
      }
    })
    // await consumer.disconnect() // 消费者应该是long polling
  } catch (err) {
    console.log(`bad happened ${err}`) 
  } finally {
    // process.exit(0)
  }
}