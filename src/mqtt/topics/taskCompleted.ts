// A worker completed a task
function taskCompleted(workerId: string){
    return "master/taskCompleted/"+workerId.toString();
};

export default taskCompleted;