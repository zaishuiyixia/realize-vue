import { nextTick } from "../utils";

let queue = [];
let has = {}; // 做列表的 列表维护存放了哪些watcher

// 批处理
function flushSchedulerQueue(){
    for(let i =0 ; i < queue.length; i++){
        queue[i].run()
    }
    queue = [];
    has = {};
    pending = false;
}

let pending = false;

// 要等待同步代码执行完毕后 才执行异步逻辑
export function queueWatcher(watcher) { // 当前执行栈中代码执行完毕后，会先清空微任务，在清空宏任务， 我希望尽早更新页面
    const id = watcher.id; // name 和 age的id 是同一个
    if (has[id] == null) {
        queue.push(watcher);
        has[id] = true;
        // 开启一次更新操作 => 批处理（防抖）
        if(!pending){
            nextTick(flushSchedulerQueue, 0);
            pending = true;
        }
    }
}