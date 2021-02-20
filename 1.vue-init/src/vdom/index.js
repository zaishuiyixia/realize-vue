export function createElement(vm, tag, data = {}, ...children) { 
    return vnode(vm, tag, data, data.key, children, undefined);
}

export function createTextElement(vm, text) {
    return vnode(vm, undefined, undefined, undefined, undefined, text);
}

//生成虚拟节点，虚拟节点就是一个对象用来描述dom结构
function vnode(vm, tag, data, key, children, text) {
    return {
        vm,
        tag,
        data,
        key,
        children,
        text,
        // .....
    }
}