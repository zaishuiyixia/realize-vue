import { compileToFunction } from "./compiler/index";
import { mountComponent } from "./lifecycle";
import { initState } from "./state";
export function initMixin(Vue) { // 表示在vue的基础上做一次混合操作
    Vue.prototype._init = function(options) { //主要做了把用户的选项放在了当前的实例上，并且对用户的数据进行了初始化
        // el,data
        const vm = this; // 原型中的this指向实例
       
        vm.$options = options; // 后面会对options进行扩展操作

        // vm上包含了所有的数据，对数据进行初始化 watch computed props data ...
        initState(vm); // 数据劫持 vm.$options.data

        if(vm.$options.el){
            // 如果用户传入了el，自动将数据挂载到这个模板上，如果没有传el则用户还可以手动处理：vm.$mount('#app)
            vm.$mount(vm.$options.el);
        }
    }
    Vue.prototype.$mount = function (el) {
        const vm = this;
        const options = vm.$options
        el = document.querySelector(el);
        vm.$el = el;
        // 把模板转化成 对应的渲染函数render =》 虚拟dom概念 通过渲染函数产生vnode虚拟节点 =》 用户更新数据 diff算法 更新虚拟dom =》 产生真实节点，更新
        if(!options.render){ // 用户没有传render渲染函数则用template，render的优先级更高
            let template = options.template;
            if(!template && el){ // 用户也没有传递template 就取el的内容作为模板
                template = el.outerHTML;
                //通过模板生成render渲染函数
                let render = compileToFunction(template);
                options.render = render;
            }
        }
        // options.render 就是渲染函数
        // 调用render方法 渲染成真实dom 替换掉页面的内容
        mountComponent(vm,el); // 组件的挂载流程，把组件挂载到el上，组件的挂载：根据render生成dom元素，把#app里面的内容替换掉就是组件的挂载
    }
}

