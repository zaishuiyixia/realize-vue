import { patch } from "./vdom/patch";
export function lifecycleMixin(Vue) {
    //vnode：虚拟dom
    Vue.prototype._update = function(vnode) { //初始化和更新的时候都会调用这个方法
        // 既有初始化 又有更新 
        const vm = this;
        patch(vm.$el, vnode);
    }
}
export function mountComponent(vm, el) {
    // 更新函数 数据变化后 会再次调用此函数
    let updateComponent = () => {
        // 更新方法里主要有两个逻辑
        // 1.调用render函数，生成虚拟dom：vm._render
        // 2.用虚拟dom，生成真实dom，挂载到页面上：vm._render方法返回虚拟dom，然后再调用vm._update方法生成真实dom
        vm._update(vm._render()); // 后续更新可以调用updateComponent方法
    }
    updateComponent();
}