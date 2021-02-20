import { isObject } from "../utils";
import { arrayMethods } from "./array";

// 1.如果数据是对象 会将对象不停的递归 进行劫持
// 2.如果是数组，会劫持数组的方法，并对数组中不是基本数据类型的进行检测

// 补充Object.defineProperty是可以对数组的索引进行拦截的，arr[xxx] = xxx是可以出发set方法的,但是arr.length = xxx 通过length改变数组的长度不会触发set方法
//之所以不对数组的索引进行拦截是处于性能考虑，比如arr = new Array(10000).fill(1)，数组有10000条数据，而且若是数组里要是有对象还要递归处理，所以如果对数组的索引拦截则性能消耗太大，第二个方面处于用户的操作习惯
//用户很少通过数组的索引去改变值，而是经常会使用数组的方法去操作数组，所以vue的处理就是对能改变原数组的7个方法进行了改写触发响应式更新，而对没有改变原数组的方法没有处理不会触发响应式更新

//vue官方文档中：由于 JavaScript 的限制，Vue 不能检测数组和对象的变化。这句话的理解，对于对象来讲是指因为对象属性property的添加或移除，不会触发set发放。所以Vue 无法检测新添加属性
//Vue会在初始化实例时对 property 执行 getter/setter 转化，所以 property 必须在 data 对象上存在才能让 Vue 将它转换为响应式的。
//对于数组来讲是指Vue 不能检测以下数组的变动：
//当你利用索引直接设置一个数组项时，例如：vm.items[indexOfItem] = newValue 出于性能考虑vue没有采用对数组索引进行拦截的方式，所以检测不到
//当你修改数组的长度时，例如：vm.items.length = newLength 通过length改变数组的长度不会触发set方法，所以检测不到

// 检测数据变化 看一个对象有没有被监测过只需要看这个对象是不是Observer的实例即可
class Observer {
    constructor(data) { // 对对象中的所有属性 进行劫持
        Object.defineProperty(data,'__ob__',{ //对已经被观察的属性添加一个__ob__属性，用来判断是否被观察过
            value: this, //__ob__属性的值为Observer实例
            enumerable: false // __ob__要设置成不可枚举的，否则会陷入死循环，因为__ob__是对象，执行observeArray方法里面的observe方法就会陷入死循环，会陷入循环引用
        })
        // data.__ob__ = this; // 所有被劫持过的属性都有__ob__ 
        if(Array.isArray(data)){
            // 数组劫持的逻辑
            // 对数组原来的方法进行改写：使用 切片编程 高阶函数
            data.__proto__ = arrayMethods;
            // 如果数组中的数据是对象类型，需要监控对象的变化: 如果data中有个arr属性，值是[{name: 1}]对象，那么vm.arr[0].name = 2应该触发更新
            // arr = [1,2,3] arr[0] = xxx不触发更新的是这种，数组中的索引值不是对象
            this.observeArray(data);
        }else{
            this.walk(data); //对象劫持的逻辑 
        }
    }
    observeArray(data){ // 对数组中的数组 和 数组中的对象再次劫持 递归处理
        // [{a:1},{b:2}]
        data.forEach(item=>observe(item))
    }
    walk(data) { // 对象
        Object.keys(data).forEach(key => { //Object.keys遍历对象私有属性，而不会去遍历原型上的属性
            defineReactive(data, key, data[key]);
        })
    }
}
// vue2 会对对象进行遍历 将每个属性 用defineProperty 重新定义，所以性能差
function defineReactive(data,key,value){ // value有可能是对象
    observe(value); // 如果是对象套对象 需要递归处理 （性能差）
    Object.defineProperty(data,key,{
        get(){
            return value
        },
        set(newV){ 
            // todo... 更新视图
            observe(newV); // 如果用户赋值一个新对象 ，需要将这个对象进行劫持
            value = newV;
        }
    })
}

export function observe(data) {
    // 如果是对象才观测
    if (!isObject(data)) {
        return;
    }
    if(data.__ob__){ //如果有__ob__这个属性，说明这个属性已经被观察过了，可以跳过
        return;
    }
    // 默认最外层的data必须是一个对象
    return new Observer(data)
}