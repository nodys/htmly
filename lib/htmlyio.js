// Export a basic live-reload (lrio) client instance for htmly
var client = module.exports = require('lrio')('htmly')
client.on('message', function(data) {
  client.emit(data.type + ':' + data.uid, data.src);
})
