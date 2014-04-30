var fs = require('fs');
var docker = require ('../lib/docker.js');

module.exports = function(app,client_redis,__dirname){
    app.get('/', function(req,res){
        // get all containers bee
        //
        client_redis.LRANGE('NAHLA:LIST',0,-1,function(err,data_l){
            console.log(data_l);
            var list_machine=[];
            if(data_l.length==0)
            res.render('home',{'data':list_machine});
            else
            data_l.sort().forEach(function(item){
                client_redis.hgetall(item,function(err,data)
                    {
                        list_machine.push(data);
                        console.log(data);
                        //console.log("list "+list_machine.length+" vs data "+length(data));
                        if(list_machine.length == data_l.length)
                    res.render('home',{'data':list_machine});
                    }); 
            });
        });
    });
    app.get('/cloud/:port', function (req,res){
     //res.header('Access-Control-Allow-Origin', "*")
     res.render('cloud',{port:req.params.port});
    });
    app.get('/create', function(req,res){
        //if(!req.session.authentificated)
        //res.redirect('/');

        //client_redis.LRANGE('shell_list',0,-1,function(err,data_l){
        //  console.log(data_l);
        res.render('create_bee',{});

    });
    app.get('/refresh_cloud/:port', function(req,res){
        var list_files = [];
        var port = req.params.port;
        fs.readdir(__dirname+'/public/honey/'+port,function(err,files){
            var len = files.length
            files.forEach(function(file){
                len -=1;
                var fileC = __dirname+'/public/honey/'+port+'/'+file;
                if (fs.lstatSync(fileC).isFile())
                {
                    console.log('file found : '+file);
                    list_files.push(file);
                    if(err) 
                      console.log('erreur'+err);
                }
                if(len <=0)
                    res.render("_files",{'files':list_files,'port':port});
            });
        });
    });

    app.post('/create', function(req,res){
        //if(!req.session.authentificated)
        //res.redirect('/');
        /*
           var path_sc = __dirname+"/config_files/" ;
           fs.writeFile(path_sc+req.body.conf_name,req.body.conf_content);

           client_redis.lrem('conf_list',1,req.body.conf_name);
           client_redis.rpush('conf_list',req.body.conf_name,function(err){
           if(err) 
           console.log('erreur'+err);
           else
           res.redirect('/show_config_file')
           });*/
        var hostname = req.body.hostname;
        var os = req.body.os;
        var ports = req.body.ports;

        docker.lunch_bee(os,ports,hostname,function(data){
            data.id = (data.id+'').replace('\n','');
            client_redis.rpush('NAHLA:LIST','NAHLA:ID:'+data.id,gestion_err);
            client_redis.HMSET('NAHLA:ID:'+data.id,{'id':data.id,'hostname':hostname,'os':os,'port_web':data.port_web,'port':JSON.stringify(data.port)},gestion_err);
            console.log("REDIS SAVED ID "+data.id);
            // create folder to download files
            fs.symlink("/var/dropfiles/"+data.port_web,__dirname+"/public/honey/"+data.port_web,function(err){
                console.log("folder symlink created")
            });
            res.redirect('/');
        });

    }); 
    }
    function gestion_err(err){
        if(err)
            console.log('ERROR REDIS '+err);
    }

