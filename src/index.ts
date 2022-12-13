import {Boss} from "./workForce/Boss";
import {Master} from "./workForce/Master";
import {Worker} from "./workForce/Worker";

const boss = new Boss();
const master = new Master();
const worker1 = new Worker();
const worker2 = new Worker();

boss.start();
master.start();
worker1.start();
worker2.start();


