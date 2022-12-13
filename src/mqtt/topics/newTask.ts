// is used by the master to give new tasks and check that the worker is alive
let topic: string = "";
function newTask(workerId: string){
    topic = "master/newTask/"+workerId.toString();
    return topic
};

export default newTask;