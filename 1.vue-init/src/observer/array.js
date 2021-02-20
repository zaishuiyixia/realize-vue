let oldArrayPrototype = Array.prototype
export let arrayMethods = Object.create(oldArrayPrototype);
// arrayMethods.__proto__ = Array.prototype 继承

let methods = [
    'push',
    'shift',
    'unshift',
    'pop',
    'reverse',
    'sort',
    'splice'
]

methods.forEach(method =>{
    // 用户调用的如果是以上七个方法 会用重写的方法，做了一层劫持，否则用原来的数组方法
    arrayMethods[method] = function (...args) { //  args 是参数列表 arr.push(1,2,3)
        //内部继续调用原有的数组方法
        oldArrayPrototype[method].call(this,...args); // arr.push(1,2,3);
        let inserted;
        let ob = this.__ob__; // 根据当前数组获取到observer实例
        switch (method) {
            case 'push':
            case 'unshift':
                inserted = args ; // 就是新增的内容
                break;
            case 'splice':
                inserted = args.slice(2)
            default:
                break;
        }
        // 如果新增的内容是对象或者数组（arr.push({name: 1})）则要对新增的对象和数组继续进行劫持, 需要观测的数组里的每一项，而不是数组
        // 所以要对有新增内容功能的数组方法push、unshift、splice进一步处理
        // 更新操作.... todo...
        if(inserted)  ob.observeArray(inserted)

        // arr.push(1,2)
        // arr.splice(0,1,xxxx)
    }
})
