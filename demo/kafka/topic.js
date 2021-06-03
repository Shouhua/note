const { Kafka } = require('kafkajs')
run()
async function run() {
  try {
    const kafka = new Kafka({
      "clientId": 'myapp',
      "brokers": ['runner:9092']
    }) 
    const admin = kafka.admin()
    console.log("Connecting...")
    await admin.connect()
    console.log("Connected!")
    // await admin.listTopics()
    // A-M, N-Z
    await admin.createTopics({
      "topics": [{
          "topic": "Users",
          "numPartitions": 2
        }]
    })
    console.log('Create Successfully!') 
    await admin.disconnect()
  } catch (err) {
    console.log(`bad happened ${err}`) 
  } finally {
    process.exit(0)
  }
}