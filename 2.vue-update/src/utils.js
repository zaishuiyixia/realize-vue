export function isFunction(val) {
    return typeof val === 'function';
}

export function isObject(val) {
    return typeof val == 'object' && val !== null

}
const callbacks = [];

function flushCallbacks() {
    callbacks.forEach(cb => cb());
    waiting = false
}
let waiting = false;
function timer(flushCallbacks) {
    let timerFn = () => {}
    //优先级由高到低
    if (Promise) { // 微任务
        timerFn = () => {
            Promise.resolve().then(flushCallbacks)
        }
    } else if (MutationObserver) { // 微任务
        let textNode = document.createTextNode(1);
        let observe = new MutationObserver(flushCallbacks);
        //监听textNode值变化执行flushCallbacks回调
        observe.observe(textNode, {
            characterData: true
        })
        timerFn = () => {
            textNode.textContent = 3;
        }
    } else if (setImmediate) {
        timerFn = () => {
            setImmediate(flushCallbacks)
        }
    } else {
        timerFn = () => {
            setTimeout(flushCallbacks)
        }
    }
    timerFn();
}

// 微任务是在页面渲染前执行，但是取的是内存中的dom，内存中的dom已经更新从而可以取到最新的dom，所以不关心你渲染完毕没有

export function nextTick(cb) {
    callbacks.push(cb); // flushSchedulerQueue / userCallback

    if (!waiting) {
        timer(flushCallbacks); // vue2 中考虑了兼容性问题，逐步降级处理。vue3 里面不在考虑兼容性问题
        waiting = true;
    }
}