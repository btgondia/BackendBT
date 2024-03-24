const mqtt = require('mqtt')
const connectUrl = process.env.MQTT_URL || 'mqtt://localhost:1883'
const client = mqtt.connect(connectUrl, {
	clientId:"admin",
	clean: true,
	connectTimeout: 4000,
	username: 'wasi',
	password: 'wasi123',
	reconnectPeriod: 1000,
  })
  
  //export the client
    module.exports = client;