import { createElement, createTextElement } from "./vdom/index"

export function renderMixin(Vue){
    Vue.prototype._c = function(){ // createElement，生成标签元素
        return createElement(this,...arguments)
    }  
    Vue.prototype._v = function (text) { // createTextElement，生成文本元素
        return createTextElement(this,text)
    }
    Vue.prototype._s = function(val){ // stringify 
        if(typeof val == 'object') return JSON.stringify(val)
        return val;
    }
    Vue.prototype._render = function(){
       const vm = this;
       let render =  vm.$options.render; // 当用户没传入render时是通过template模板解析出来的render方法，也有可能是用户传入的
       let vnode =  render.call(vm);
       return vnode;
    }
}