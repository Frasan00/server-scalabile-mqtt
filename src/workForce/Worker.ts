import {MqttClient} from "mqtt";
import mqttConnection from "../mqtt/mqttConnection";
// transactions imports
import newTask from "../mqtt/topics/newTask";
import alive from "../mqtt/topics/alive";
import taskCompleted from "../mqtt/topics/taskCompleted";

const Dispatcher = require("mqtt-dispatcher");
import {v4 as uuid} from "uuid";

export class Worker{

    protected clientMqtt: MqttClient;
    protected dispatcher: any;
    protected workerID: string;
 

    constructor(){
        this.clientMqtt = mqttConnection();
        this.dispatcher = new Dispatcher(this.clientMqtt);
        this.workerID = uuid().toString();
    };

    async start(){
        // when a worker receives a message "newTask" with is id, he handles it
        this.dispatcher.addRule(newTask(this.workerID), this.handleNewTask.bind(this));
        
        // worker sends a message to the master telling he is alive after 1 sec
        setTimeout(() => {this.clientMqtt.publish(alive, this.workerID.toString())}, 1000);
    };

    protected handleNewTask(_: any, message: string){
        // receives a task and publishes a response
        console.log("task received from the master: "+message.toString());
        const payload = JSON.parse(message.toString())[0];
        const result = parseInt(payload.slice(0,1))*parseInt(payload.slice(1,2));

        this.clientMqtt.publish(taskCompleted(this.workerID), JSON.stringify([result.toString(), this.workerID.toString()]));
    };
};