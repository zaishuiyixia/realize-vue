let id = 0; //用来区分不同的dep
class Dep{ // 每个属性我都给他分配一个dep，dep可以来存放watcher， watcher中还要存放这个dep
    constructor(){
        this.id = id++;
        this.subs = []; // 用来存放watcher
    }
    depend(){
        // Dep.target  dep里要存放这个watcher，同时watcher也要存放dep  多对多的关系
        if(Dep.target){
            Dep.target.addDep(this); //把dep传给了watcher
        }
    }
    addSub(watcher){
        this.subs.push(watcher);
    }
    notify(){
        this.subs.forEach(watcher=>watcher.update());
    }
}
Dep.target = null; // 一份

export function pushTarget(watcher) {
    Dep.target = watcher;
}

export function popTarget(){
    Dep.target = null
}


export default Dep