var express = require('express')
, http = require('http')
, path = require('path')
, mime = require('mime')
, sys  = require('sys')
, os   = require('os')
, redis = require('redis')
, io = require('socket.io')
, docker = require('./lib/docker.js');
//, terminal = require('web-terminal');

var sanitizer = require('sanitizer');
var app = express();var sanitizer = require('sanitizer');
var client_redis = redis.createClient();

app.configure(function(){
    app.set('port', process.env.PORT || 5000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.multipart())
    app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.cookieSession({store: '/',
    secret: 'BBQ12345AHHH////',
    cookie: {httpOnly: false},
    key: 'cookie.sid' }));
app.use(express.static(path.join(__dirname, 'public')));
});
//
// add routes
//
require('./routes/nahla')(app,client_redis,__dirname)
//require('./routes/cms')(app,client_redis,__dirname)
//require('./routes/script')(app,client_redis,__dirname)
//require('./routes/compilateur')(app,client_redis,__dirname)
//require('./routes/loginHome')(app,client_redis,__dirname)

//---------------------------------------------------------------------
var op= http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});
//--------------------------------------------------------------------

//*************************************************************
//*                  socket IO                                *  
//*************************************************************
app.get('/halt',function(req,res){
io.sockets.emit('halt',{});
res.send('OK');
});
io = io.listen(op,{log : false});

//---------------    Terminal --------------------
//
//------------------------------------------------
//terminal(op);
//console.log('Terminal lunched !!')
docker.initialise_ports_list(client_redis);
// get memory usage
//
var ram_usage;
var cpu_usage;

setInterval(function(){
    var loads = os.loadavg();
    cpu_usage = loads[0];
// cpu
    var spawn = require('child_process').spawn;
    var prc = spawn('free',  []);
    
    prc.stdout.setEncoding('utf8');
    prc.stdout.on('data', function (data) {
    var str = data.toString()
    var lines = str.split(/\n/g);
    for(var i = 0; i < lines.length; i++) {
     lines[i] = lines[i].split(/\s+/);
        }
    console.log('your real memory usage is', lines[2][2]);
    console.log('CPU avrage: ',cpu_usage);
    ram_usage = lines[2][2];
    });
    
    io.sockets.emit('load_cpu',cpu_usage);
    io.sockets.emit('load_ram',ram_usage);
},1000);
io.sockets.on('connection', function (socket) {
    //socket.emit('faitUneAlerte');
    console.log('client connecté');
    
    //socket.emit('load_cpu',loads);
   //console.log(loads[0].toFixed(2));
        socket.on('disconnect',function()
        {
            console.log("disconnect user from ");

        });
});


