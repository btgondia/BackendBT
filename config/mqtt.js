const mqtt = require('mqtt')
const connectUrl = `mqtts://u822ed90.ala.us-east-1.emqxsl.com:8883`
const client = mqtt.connect(connectUrl, {
	clientId:"admin",
	clean: true,
	connectTimeout: 4000,
	username: 'test',
	password: 'test',
	reconnectPeriod: 1000,
  })
  
  //export the client
    module.exports = client;