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
        cmd = "run -privileged "+port_list+volumes+" -d zimski/nahl-terminal-ubuntu";
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
    var child = spawn("docker",cmd_ip.split(' '));
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
//
//  iptables DNAT add rules
//
function dnat_port_redirect_add(host_port,bee_ip,bee_port,callback){
      cmd = "-t nat -A DOCKER -p tcp --dport "+host_port+" -j DNAT --to-destination "+bee_ip+':'+bee_port;
      var child = spawn("iptables",cmd.split(' '));
        child.stdout.on("data", function (data) {
            console.log("spawnSTDOUT: iptables ID "+ data)
            // Parse JSON
            callback(data);
        // callback
        });

        child.stderr.on("data", function (data) {
            console.log("spawnSTDERR:"+ data)
            callback(data); 
        });
        child.stderr.on("close", function (data) {
            console.log("ip tabes close:"+ data)
            callback(data); 
        });

}
// 
// iptables DNAT del rules
//
function dnat_port_redirect_add(host_port,bee_ip,bee_port,callback){
      cmd = "-t nat -A DOCKER -p tcp --dport "+host_port+" -j DNAT --to-destination "+bee_ip+':'+bee_port;
      var child = spawn("iptables",cmd.split(' '));
        child.stdout.on("data", function (data) {
            console.log("spawnSTDOUT: iptables ID "+ data)
            // Parse JSON
            callback(data);
        // callback
        });

        child.stderr.on("data", function (data) {
            console.log("spawnSTDERR:"+ data)
            callback(data); 
        });
        child.stderr.on("close", function (data) {
            console.log("ip tabes close:"+ data)
            callback(data); 
        });

}
// hot port binding
// need to be restarted after stop-start container ==> ip change !
// callback (new port list)
exports.hot_port_bind = function (ports_before,bee_id,bee_port,callback){
   data = docker_inspect(bee_id,function(info){
        console.log("IP of Container "+ info[0].NetworkSettings.IPAddress);
        //
        // hot bind port 
        //
        if(info[0].NetworkSettings.IPAddress =='')
            console.log('need to start container');
        else
        get_free_port(1,function(host_port){
            console.log("call iptables !!");
            dnat_port_redirect_add(host_port,info[0].NetworkSettings.IPAddress,bee_port,function(data){
                console.log('iptables success');
                var new_bind = {}
                new_bind.h_port = host_port; 
                new_bind.b_port = bee_port;
                ports_before.push(new_bind);
                callback(ports_before,host_port);
        });
        });
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
