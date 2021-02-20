import { observe } from "./observer/index"; // 使用node_resolve_plugin插件，引用的时候就不用写后面的index了，没配置的话需要补全index不能省略
import { isFunction } from "./utils";

export function initState(vm) { // 状态的初始化
    const opts = vm.$options;
    if (opts.data) { // 数据的初始化
        initData(vm);
    }
    // if(opts.computed){ // 初始化计算属性
    //     initComputed();
    // }
    // if(opts.watch){ // 初始化监听属性
    //     initWatch();
    // }
}

function proxy(vm,source,key){
    Object.defineProperty(vm,key,{
        get(){
            return vm[source][key];
        },
        set(newValue){
            vm[source][key] = newValue
        }
    })
}
function initData(vm) { //初始化data数据
    let data = vm.$options.data; // vm.$el  vue 内部会对属性检测如果是以$开头 不会进行代理
    // vue2中会将data中的所有数据 进行数据劫持 ，使用Object.defineProperty方法

    //data可以写成对象或者函数，如果是对象则直接取对象，如果是函数则取返回值，并且当data是函数的时候通过call方法让data里的this是vm实例
    data = vm._data = isFunction(data) ? data.call(vm) : data;

    // vm._data.xxx这样取值太麻烦，做一层代理，使用户可以通过vm.xxx取值，取的还是vm._data.xxx的值，vm.xxx => vm._data.xxx
    for(let key in data){
        proxy(vm,'_data',key); 
    }
    //对数据进行响应式观测
    observe(data);
}