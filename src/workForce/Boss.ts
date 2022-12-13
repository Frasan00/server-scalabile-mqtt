/*
 Boss is an entity that sends transactions to the master and pays workers
*/

import {v4 as uuid} from "uuid";
import db from "../database/db";
const Dispatcher = require("mqtt-dispatcher");
import {MqttClient} from "mqtt";
import newTransactionTopic from "../mqtt/topics/newTransaction";
import TransactionType from "../customTypes/TransactionType";
import mqttConnection from "../mqtt/mqttConnection";
import transactionCompleted from "../mqtt/topics/transactionCompleted";

export class Boss{

    protected clientMqtt: MqttClient;
    protected dispatcher: any;
    protected transaction: TransactionType;

    constructor(){
        this.clientMqtt = mqttConnection(); // onConnection already in mqttConnection
        this.dispatcher = new Dispatcher(this.clientMqtt);
        this.transaction = {
            transactionId: "0",
            payload: [[]],
            reward: 0
        };
    };

    start(){
        // listens when the transaction is completed
        this.dispatcher.addRule(transactionCompleted, this.handleTransactionCompleted.bind(this));

        // every 10 seconds sends a new transaction
        const timer = setInterval(() => {

            const array: Number[][] = this.generateArray();
            this.transaction = {
                transactionId: uuid(),
                payload: array,
                reward: array.length
            };

            // publish a new transaction to the master
            this.clientMqtt.publish(newTransactionTopic, JSON.stringify(this.transaction.payload)); 
            console.log("New transaction sent to the master");
        }, 10000);
    };
   

    protected generateArray(){
        // generates random array of number arrays
        const lenght = Math.floor(Math.random() * (20 - 10) ) + 10;
        let array: number[][] = [];
        for (let i = 0; i<lenght; i++){
            let temp = [Math.floor(Math.random() * (10 - 1) ) + 1, Math.floor(Math.random() * (10 - 1) ) + 1];
            array.push(temp)
        };
        return array;
    };

    protected handleTransactionCompleted(_: any, message: string){
        const result = JSON.parse(message.toString());
        db.push([this.transaction.transactionId, this.transaction.reward, this.transaction.reward]);

        console.log("Result received by the boss "+result.toString());
        console.log("Transazione aggiunta al db: "+
        [this.transaction.transactionId, this.transaction.reward, this.transaction.reward]);
    };
};
