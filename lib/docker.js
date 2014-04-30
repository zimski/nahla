var exec = require('child_process').exec;
var redis = require('redis')
var spawn = require("child_process").spawn;
var client_redis = redis.createClient();


exports.lunch_bee = function(os,ports,hostname,store){

    var retour = {};
    retour.port = [];
    port_ar = ports.split(',');

    // get free port function
    get_free_port(port_ar.length+1,function (ports_free){
        p__ = ports_free[0];
        port_list ='-p '+p__+':8000';
        retour.port.push({'p_host':p__,'c_port':8000});
        retour.port_web = p__;
        i=1;
        port_ar.forEach(function(p){
            p__ = ports_free[i];
            i+=1;
            port_list = port_list + " -p "+p__+':'+p
            retour.port.push({'p_host':p__,'c_port':p});
        });
        volumes =" -v /var/dropfiles/"+retour.port_web+":/mnt/dropfile:rw";
        cmd = "run "+port_list+volumes+" -d zimski/nahl-terminal-ubuntu";
        console.log(cmd);
        cmd_ = cmd.split(' ');
        // run chil process 
        //
        var child = spawn("docker",cmd_);

        child.stdout.on("data", function (data) {
            console.log("spawnSTDOUT: docker ID"+ data)
            // store ID
            retour.id= data;
        // callback
        store(retour);
        });

        child.stderr.on("data", function (data) {
            console.log("spawnSTDERR:"+ data)
        });
        child.on("close",function(code){
            console.log("exit code: "+code);
        });
    });
} 
exports.initialise_ports_list = function initialise_list_port(redis){
    redis.llen('NAHLA:PORT:FREE',function(err,len){
        console.log('NAHLA PORT FREE',len);
        if(len == 0){
            for(i=50000;i<60000;i++)
                redis.rpush('NAHLA:PORT:FREE',i,redis.print);
        } 
    });
}
function get_free_port(nb_port,callback){
    var ports = [];
    for(i=0;i<nb_port;i++){
        client_redis.lpop('NAHLA:PORT:FREE',function(err,port){
            client_redis.rpush('NAHLA:PORT:USED',port,client_redis.print);
            ports.push(port);
            if(ports.length == nb_port)
                callback(ports);
        });
    }

}
