var http = require('http'),
    util = require('util');
http.createServer(function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write(req.method + ' ' +  req.url + ' HTTP/' + req.httpVersion + '\n');
    res.write(util.inspect(req.headers));
    res.end('\n');
}).listen(3001, '127.0.0.1');
console.log("listening on http://localhost:3001");
