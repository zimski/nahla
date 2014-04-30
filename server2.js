var http = require('http'),
    util = require('util'),
    formidable = require('formidable'),
    server;

server = http.createServer(function(req, res) {
  if ( req.method = 'OPTIONS'){
  var header = {};
  header["Access-Control-Allow-Origin"]= "*";
  header['Access-Control-Allow-Methods']='PUT, GET, POST, DELETE, OPTIONS';
  header['Access-Control-Allow-Headers']= 'Content-Type';
  header["Access-Control-Allow-Headers"]= "Cache-Control,Origin, X-Requested-With, Content-Type, Accept";
  header['Cache-Control']='no-cache,no-store';
  res.writeHead(200,header);
  res.end();
  }  
  if (req.url == '/') {
    res.writeHead(200, {'content-type': 'text/html'});
    res.end(
      '<form action="/upload" enctype="multipart/form-data" method="post">'+
      '<input type="text" name="title"><br>'+
      '<input type="file" name="upload" multiple="multiple"><br>'+
      '<input type="submit" value="Upload">'+
      '</form>'
    );
  } else if (req.url == '/uploads') {
    var form = new formidable.IncomingForm(),
        files = [],
        fields = [];

    //form.uploadDir = '/var/dropbox';

    form
      .on('field', function(field, value) {
        console.log(field, value);
        fields.push([field, value]);
      })
      .on('file', function(field, file) {
        console.log(field, file);
        files.push([field, file]);
      })
      .on('end', function() {
        console.log('-> upload done');
        res.writeHead(200, {'content-type': 'text/plain'});
        res.write('received fields:\n\n '+util.inspect(fields));
        res.write('\n\n');
        res.end('received files:\n\n '+util.inspect(files));
        var response={}
        response.success = true;
        //res.write(JSON.stringify(response));
        //res.end();
      });
    form.parse(req);
  } else {
    res.writeHead(404, {'content-type': 'text/plain'});
    res.end('404');
  }
});
server.listen(9000);

console.log('listening on http://localhost:9000/');
