import {MqttClient} from "mqtt";
import mqttConnection from "../mqtt/mqttConnection";
const Dispatcher = require("mqtt-dispatcher");
import { clearTimeout, clearInterval } from "timers";
// topics imports
import alive from "../mqtt/topics/alive";
import newTransaction from "../mqtt/topics/newTransaction";
import newTask from "../mqtt/topics/newTask";
import taskCompleted from "../mqtt/topics/taskCompleted";
import transactionCompleted from "../mqtt/topics/transactionCompleted";



export class Master{

    protected clientMqtt: MqttClient;
    protected dispatcher;
    protected workersID: any[][]; // list of tuples [workerID, status] status = {0: free, 1: busy}
    protected lastWorker: number; // lastWorker allows me to not iterate from the beginning of the list every time
    protected timerList: NodeJS.Timeout[];
    protected result: number;
    
    constructor(){
        this.clientMqtt = mqttConnection();
        this.dispatcher = new Dispatcher(this.clientMqtt);
        this.workersID = [];
        this.lastWorker = 0;
        this.timerList = [];
        this.result = 1;
    };

    start(){
        // when master recei5es a message in "alive" adds a new worker
        this.dispatcher.addRule(alive, this.handleNewWorker.bind(this));
        

        // new transaction
        this.dispatcher.addRule(newTransaction, this.handleNewTransaction.bind(this));
    };

    // since we don't need "topic" we substitute it with "_"
    protected async handleNewTransaction(_: any,  message: Buffer){
        if(!message) return console.log("Transaction not valid ");
        if (this.workersID.length == 0) return console.log("There are no workers for this transaction");
        console.log("New transaction from the boss: "+message.toString());
        
        // parsing the message
        const payload: string = JSON.parse(message.toString());

        /*
            * this loop selects a task, selects a free worker with status == 0
            * adds a rule and sets a timer, if there is no response, the timer will eliminate
            * the worker from the available workers
        */
        
        let i = 0;
        const loop = setInterval(() => {
            if(i === payload.length-1)  {
                this.handleTransactionCompleted();
                clearInterval(loop);
            };
            let task = payload.slice(i, i+1);
            let index: number = this.findFreeWorker();

            // if a worker were found
            if (index !== -1){        
                // master linstens when the worker completes a task

                let timer = setTimeout(() => {delete this.workersID[index]}, 5000);
                this.timerList.push(timer);

                this.clientMqtt.publish(newTask(this.workersID[index][0]), JSON.stringify(task));
                i++;
            };
        }, 1)
    };

    protected handleNewWorker(_: any, message: string){
        // adds a new worker and a status in a tuple
        if (!message) return "Worker not valid";
        this.workersID.push([message.toString(), 0]);
        this.dispatcher.addRule(taskCompleted(message.toString()), this.handleTaskCompleted.bind(this));
        console.log("Worker added succesfully: "+message.toString());
    };

    protected handleTaskCompleted(_: any, message: string, timer: NodeJS.Timeout){
        clearTimeout(this.timerList[0]);
        this.timerList.shift();
        const taskResult = JSON.parse(message.toString())[0];
        const workerID = JSON.parse(message.toString())[1];
        // free the worker that completed the task
        for (let i = 0; i<this.workersID.length; i++){
            if (workerID.toString() === this.workersID[i][0]){
                this.workersID[i][1] = 0;
            };
        };

        this.result = this.result*parseInt(taskResult);
        console.log("task completed by "+workerID.toString()+" "+taskResult.toString());
    };

    protected handleTransactionCompleted(){
        this.clientMqtt.publish(transactionCompleted, JSON.stringify(this.result.toString()));
        this.result = 0;
    };

    protected findFreeWorker(){
        let count = 0;
        while (count<this.workersID.length){
            if (this.lastWorker>=this.workersID.length) this.lastWorker = 0; // starts over if is bigger than the workersID
            
            if (this.workersID[this.lastWorker][1] == 0){
                this.workersID[this.lastWorker][1] = 1; // sets worker = busy
                return this.lastWorker;
            };
            this.lastWorker++;
            count++;
        };
        return -1 // no free worker found
    };
};

