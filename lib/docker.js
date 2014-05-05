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
exports.stop_bee = function(id_bee,callback){
    cmd = "stop "+id_bee;
    cmd_ =cmd.split(' ');
    var child = spawn("docker",cmd_);

        child.stdout.on("data", function (data) {
            console.log("spawnSTDOUT: docker Stop ID"+ data)
            // store ID
            
        // callback
        callback(0,data);
        });

        child.stderr.on("data", function (data) {
            console.log("spawnSTDERR:"+ data)
            callback(1,data); 
        });
        child.on("close",function(code){
            console.log("exit code: "+code);
        });

}
exports.kill_bee = function(id_bee,callback){
    cmd = "kill "+id_bee;
    cmd_ =cmd.split(' ');
    var child = spawn("docker",cmd_);

        child.stdout.on("data", function (data) {
            console.log("spawnSTDOUT: docker kill ID"+ data)
            // store ID
            
        // callback
        callback(0,data);
        });

        child.stderr.on("data", function (data) {
            console.log("spawnSTDERR:"+ data)
            callback(1,data); 
        });
        child.on("close",function(code){
            console.log("exit code: "+code);
        });

}
exports.start_bee = function(id_bee,callback){
    cmd = "start "+id_bee;
    cmd_ =cmd.split(' ');
    var child = spawn("docker",cmd_);

        child.stdout.on("data", function (data) {
            console.log("spawnSTDOUT: docker start ID"+ data)
            // store ID
            
        // callback
        callback(0,data);
        });

        child.stderr.on("data", function (data) {
            console.log("spawnSTDERR:"+ data)
            callback(1,data); 
        });
        child.on("close",function(code){
            console.log("exit code: "+code);
        });

}

exports.initialise_ports_list = function (redis){
    redis.llen('NAHLA:PORT:FREE',function(err,len){
        console.log('NAHLA PORT FREE',len);
        if(len == 0){
            for(i=50000;i<60000;i++)
                redis.rpush('NAHLA:PORT:FREE',i,redis.print);
        } 
    });
}
function docker_inspect(id, callback){
// inspect container ... get his IP
    //
    cmd_ip = "inspect "+id;
    var child1 = spawn("docker",cmd_ip.split(' '));
    child.stdout.on("data", function (data) {
            console.log("spawnSTDOUT: docker inspect  ID "+ data)
            // Parse JSON
            callback(JSON.parse(data));
        // callback
        });

    child.stderr.on("data", function (data) {
            console.log("spawnSTDERR:"+ data)
            callback({}); 
        });
 


}
// hot port binding
// need to be restarted after stop-start container ==> ip change !
exports.hot_ports_bind = function (redis,bee_id,host_port,bee_port){
   data = docker_inspect(bee_id,function(info){
        console.log("IP of Container "+ info.IPAddress);
        //
        // get hots ports from redis
        //
        
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
