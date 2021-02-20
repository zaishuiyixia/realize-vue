(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
}(this, (function () { 'use strict';

    var defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g; // {{aaaaa}} 匹配双大括号语法
    // html字符串 =》 字符串  _c('div',{id:'app',a:1},'hello')

    function genProps(attrs) {
      // [{name:'xxx',value:'xxx'},{name:'xxx',value:'xxx'}]
      var str = '';

      for (var i = 0; i < attrs.length; i++) {
        var attr = attrs[i];

        if (attr.name === 'style') {
          (function () {
            // color:red;background:blue
            var styleObj = {};
            attr.value.replace(/([^;:]+)\:([^;:]+)/g, function () {
              styleObj[arguments[1]] = arguments[2];
            });
            attr.value = styleObj;
          })();
        }

        str += "".concat(attr.name, ":").concat(JSON.stringify(attr.value), ",");
      }

      return "{".concat(str.slice(0, -1), "}");
    }

    function gen(el) {
      if (el.type == 1) {
        // element = 1 元素； text = 3 文本
        return generate(el);
      } else {
        var text = el.text;

        if (!defaultTagRE.test(text)) {
          return "_v('".concat(text, "')");
        } else {
          // 'hello' + arr + 'world'    hello {{arr}} {{aa}} world 需要匹配文本中是否有双大括号，双大括号里面的是变量不是文本
          var tokens = [];
          var match;
          var lastIndex = defaultTagRE.lastIndex = 0; // reg.exec和/g有冲突，导致只会第一次匹配的时候捕获到，所以每次执行的时候要把lastIndex重置

          while (match = defaultTagRE.exec(text)) {
            // 看有没有匹配到
            var index = match.index; // 开始索引

            if (index > lastIndex) {
              tokens.push(JSON.stringify(text.slice(lastIndex, index)));
            }

            tokens.push("_s(".concat(match[1].trim(), ")")); // 'hello' + arr + 'world'变量和字符串拼接的话未导致对象是[Object, Object]，所以用_s去处理，作用和JSON.Stringify类型

            lastIndex = index + match[0].length;
          }

          if (lastIndex < text.length) {
            tokens.push(JSON.stringify(text.slice(lastIndex)));
          }

          return "_v(".concat(tokens.join('+'), ")");
        }
      }
    }

    function genChildren(el) {
      var children = el.children; // 获取儿子

      if (children) {
        return children.map(function (c) {
          return gen(c);
        }).join(',');
      }

      return false;
    }

    function generate(el) {
      // 遍历树 将树拼接成字符串： _c('div',{id:'app',a:1},_c('span',{},'world'),_v()) 拼接成这种形式的字符串，最后在new Function(code)把拼接的字符串变成可执行的函数
      // _c创建元素的虚拟节点，_v创建文本的虚拟节点，_s用来处理{{ arr }}变量
      var children = genChildren(el);
      var code = "_c('".concat(el.tag, "',").concat(el.attrs.length ? genProps(el.attrs) : 'undefined').concat(children ? ",".concat(children) : '', ")");
      return code;
    }

    var ncname = "[a-zA-Z_][\\-\\.0-9_a-zA-Z]*"; // 标签名 

    var qnameCapture = "((?:".concat(ncname, "\\:)?").concat(ncname, ")"); //  用来获取的标签名的 match后的索引为1的

    var startTagOpen = new RegExp("^<".concat(qnameCapture)); // 匹配开始标签的 

    var endTag = new RegExp("^<\\/".concat(qnameCapture, "[^>]*>")); // 匹配闭合标签的

    var attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/; // 匹配属性单引号、双引号、没有引号 a=b  a="b"  a='b'

    var startTagClose = /^\s*(\/?)>/; // 匹配标签的关闭    />   <div/>
    // ast抽象语法树 (语法层面的描述,可以描述js、css、html) vdom：用来描述dom节点，不能用来描述js、css、html结构
    // vue的模板解析主要是使用了正则匹配，<div id="app"> {{name}}</div>匹配出标签名、标签属性、闭合标签...
    // 将解析后的结果 组装成一个树结构  栈

    function createAstElement(tagName, attrs) {
      return {
        tag: tagName,
        type: 1,
        // 1 元素 2 文本
        children: [],
        parent: null,
        attrs: attrs
      };
    }

    var root = null; //根元素

    var stack = []; //存放元素的栈

    function start(tagName, attributes) {
      var parent = stack[stack.length - 1];
      var element = createAstElement(tagName, attributes);

      if (!root) {
        root = element;
      }

      if (parent) {
        element.parent = parent; // 当放入栈中时 记录父节点是谁

        parent.children.push(element);
      }

      stack.push(element);
    }

    function end(tagName) {
      var last = stack.pop();

      if (last.tag !== tagName) {
        //标签闭合有问题
        throw new Error('标签闭合有误');
      }
    }

    function chars(text) {
      text = text.replace(/\s/g, "");
      var parent = stack[stack.length - 1];

      if (text) {
        parent.children.push({
          type: 3,
          text: text
        });
      }
    }

    function parserHTML(html) {
      function advance(len) {
        //解析过的模板字符串截取掉
        html = html.substring(len);
      }

      function parseStartTag() {
        //解析开始标签函数
        var start = html.match(startTagOpen);

        if (start) {
          var match = {
            tagName: start[1],
            attrs: []
          };
          advance(start[0].length);

          var _end;

          var attr; // 如果没有遇到标签结尾就不停的解析

          while (!(_end = html.match(startTagClose)) && (attr = html.match(attribute))) {
            match.attrs.push({
              name: attr[1],
              value: attr[3] || attr[4] || attr[5]
            }); // 有可能属性是带单引号、双引号或者没有引号 attr[3] attr[4] attr[5]

            advance(attr[0].length); //截取掉匹配过的属性
          }

          if (_end) {
            //删除结尾标签: >
            advance(_end[0].length);
          }

          return match;
        }

        return false; // 不是开始标签，则跳过
      }

      while (html) {
        // 看要解析的内容是否存在，如果存在就不停的解析，正则循环解析模板字符串
        var textEnd = html.indexOf('<'); // 当前解析的开头  

        if (textEnd == 0) {
          //有可能是开始标签或者是结束标签
          var startTagMatch = parseStartTag(); // 解析开始标签

          if (startTagMatch) {
            //如果匹配到了则是开始标签
            start(startTagMatch.tagName, startTagMatch.attrs);
            continue;
          }

          var endTagMatch = html.match(endTag);

          if (endTagMatch) {
            //如果匹配到了则是结束标签
            end(endTagMatch[1]);
            advance(endTagMatch[0].length);
            continue;
          }
        }

        var text = void 0;

        if (textEnd > 0) {
          //匹配文本内容
          text = html.substring(0, textEnd);
        }

        if (text) {
          chars(text);
          advance(text.length);
        }
      }

      return root;
    } // 看一下用户是否传入了render函数（如果用户传入了render函数则不需要接下来的对模板template词法解析生成可执行的代码这一系列步骤了，性能更高）, 没传入可能传入的是 template, template如果也没有传递，则将最外层的html
    //（<div id="app" a=1 style="color:red;background:blue">hello {{arr}} world</div>）当做template进行词法解析
    // 将我们的html =》 词法解析  （解析出开始标签，结束标签，属性，文本）
    // 解析出来的结果=> ast语法树（用来描述html语法的，stack=[]，使用栈结构push、pop） 
    // 通过codegen 将<div>hello</div> 转化为 =>   _c('div',{},'hello')  => 让字符串执行
    // 字符串如果转成代码
    // 通过new Function + with 来实现（不使用eval是因为耗性能，还会有作用域问题）=> 生成render函数
    // render函数返回 => 虚拟dom（虚拟dom里可以扩展额外的属性） => 生成真实dom

    function compileToFunction(template) {
      var root = parserHTML(template); // 生成代码 

      var code = generate(root);
      var render = new Function("with(this){return ".concat(code, "}")); // code 中会用到数据 数据在vm上
      // console.log('render', render)

      return render; // html 通过正则匹配解析成 => ast（只能描述语法 语法不存在的属性无法描述） ，ast转化成=> render函数 + (with + new Function)，render函数返回 => 虚拟dom（虚拟dom里可以扩展额外的属性） => 生成真实dom
    }

    function patch(oldVnode, vnode) {
      if (oldVnode.nodeType == 1) {
        // 用vnode  来生成真实dom 替换原本的dom元素
        var parentElm = oldVnode.parentNode; // 找到他的父亲

        var elm = createElm(vnode); //根据虚拟节点 创建元素

        parentElm.insertBefore(elm, oldVnode.nextSibling);
        parentElm.removeChild(oldVnode);
      }
    }

    function createElm(vnode) {
      var tag = vnode.tag,
          data = vnode.data,
          children = vnode.children,
          text = vnode.text,
          vm = vnode.vm;

      if (typeof tag === 'string') {
        // 元素
        vnode.el = document.createElement(tag); // 虚拟节点会有一个el属性 对应真实节点

        children.forEach(function (child) {
          vnode.el.appendChild(createElm(child));
        });
      } else {
        vnode.el = document.createTextNode(text);
      }

      return vnode.el;
    }

    function lifecycleMixin(Vue) {
      //vnode：虚拟dom
      Vue.prototype._update = function (vnode) {
        //初始化和更新的时候都会调用这个方法
        // 既有初始化 又有更新 
        var vm = this;
        patch(vm.$el, vnode);
      };
    }
    function mountComponent(vm, el) {
      // 更新函数 数据变化后 会再次调用此函数
      var updateComponent = function updateComponent() {
        // 更新方法里主要有两个逻辑
        // 1.调用render函数，生成虚拟dom：vm._render
        // 2.用虚拟dom，生成真实dom，挂载到页面上：vm._render方法返回虚拟dom，然后再调用vm._update方法生成真实dom
        vm._update(vm._render()); // 后续更新可以调用updateComponent方法

      };

      updateComponent();
    }

    function _typeof(obj) {
      "@babel/helpers - typeof";

      if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
        _typeof = function (obj) {
          return typeof obj;
        };
      } else {
        _typeof = function (obj) {
          return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
        };
      }

      return _typeof(obj);
    }

    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }

    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      return Constructor;
    }

    function isFunction(val) {
      return typeof val === 'function';
    }
    function isObject(val) {
      return _typeof(val) === 'object' && val !== null;
    }

    var oldArrayPrototype = Array.prototype;
    var arrayMethods = Object.create(oldArrayPrototype); // arrayMethods.__proto__ = Array.prototype 继承

    var methods = ['push', 'shift', 'unshift', 'pop', 'reverse', 'sort', 'splice'];
    methods.forEach(function (method) {
      // 用户调用的如果是以上七个方法 会用重写的方法，做了一层劫持，否则用原来的数组方法
      arrayMethods[method] = function () {
        var _oldArrayPrototype$me;

        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        //  args 是参数列表 arr.push(1,2,3)
        //内部继续调用原有的数组方法
        (_oldArrayPrototype$me = oldArrayPrototype[method]).call.apply(_oldArrayPrototype$me, [this].concat(args)); // arr.push(1,2,3);


        var inserted;
        var ob = this.__ob__; // 根据当前数组获取到observer实例

        switch (method) {
          case 'push':
          case 'unshift':
            inserted = args; // 就是新增的内容

            break;

          case 'splice':
            inserted = args.slice(2);
        } // 如果新增的内容是对象或者数组（arr.push({name: 1})）则要对新增的对象和数组继续进行劫持, 需要观测的数组里的每一项，而不是数组
        // 所以要对有新增内容功能的数组方法push、unshift、splice进一步处理
        // 更新操作.... todo...


        if (inserted) ob.observeArray(inserted); // arr.push(1,2)
        // arr.splice(0,1,xxxx)
      };
    });

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

    var Observer = /*#__PURE__*/function () {
      function Observer(data) {
        _classCallCheck(this, Observer);

        // 对对象中的所有属性 进行劫持
        Object.defineProperty(data, '__ob__', {
          //对已经被观察的属性添加一个__ob__属性，用来判断是否被观察过
          value: this,
          //__ob__属性的值为Observer实例
          enumerable: false // __ob__要设置成不可枚举的，否则会陷入死循环，因为__ob__是对象，执行observeArray方法里面的observe方法就会陷入死循环，会陷入循环引用

        }); // data.__ob__ = this; // 所有被劫持过的属性都有__ob__ 

        if (Array.isArray(data)) {
          // 数组劫持的逻辑
          // 对数组原来的方法进行改写：使用 切片编程 高阶函数
          data.__proto__ = arrayMethods; // 如果数组中的数据是对象类型，需要监控对象的变化: 如果data中有个arr属性，值是[{name: 1}]对象，那么vm.arr[0].name = 2应该触发更新
          // arr = [1,2,3] arr[0] = xxx不触发更新的是这种，数组中的索引值不是对象

          this.observeArray(data);
        } else {
          this.walk(data); //对象劫持的逻辑 
        }
      }

      _createClass(Observer, [{
        key: "observeArray",
        value: function observeArray(data) {
          // 对数组中的数组 和 数组中的对象再次劫持 递归处理
          // [{a:1},{b:2}]
          data.forEach(function (item) {
            return observe(item);
          });
        }
      }, {
        key: "walk",
        value: function walk(data) {
          // 对象
          Object.keys(data).forEach(function (key) {
            //Object.keys遍历对象私有属性，而不会去遍历原型上的属性
            defineReactive(data, key, data[key]);
          });
        }
      }]);

      return Observer;
    }(); // vue2 会对对象进行遍历 将每个属性 用defineProperty 重新定义，所以性能差


    function defineReactive(data, key, value) {
      // value有可能是对象
      observe(value); // 如果是对象套对象 需要递归处理 （性能差）

      Object.defineProperty(data, key, {
        get: function get() {
          return value;
        },
        set: function set(newV) {
          // todo... 更新视图
          observe(newV); // 如果用户赋值一个新对象 ，需要将这个对象进行劫持

          value = newV;
        }
      });
    }

    function observe(data) {
      // 如果是对象才观测
      if (!isObject(data)) {
        return;
      }

      if (data.__ob__) {
        //如果有__ob__这个属性，说明这个属性已经被观察过了，可以跳过
        return;
      } // 默认最外层的data必须是一个对象


      return new Observer(data);
    }

    function initState(vm) {
      // 状态的初始化
      var opts = vm.$options;

      if (opts.data) {
        // 数据的初始化
        initData(vm);
      } // if(opts.computed){ // 初始化计算属性
      //     initComputed();
      // }
      // if(opts.watch){ // 初始化监听属性
      //     initWatch();
      // }

    }

    function proxy(vm, source, key) {
      Object.defineProperty(vm, key, {
        get: function get() {
          return vm[source][key];
        },
        set: function set(newValue) {
          vm[source][key] = newValue;
        }
      });
    }

    function initData(vm) {
      //初始化data数据
      var data = vm.$options.data; // vm.$el  vue 内部会对属性检测如果是以$开头 不会进行代理
      // vue2中会将data中的所有数据 进行数据劫持 ，使用Object.defineProperty方法
      //data可以写成对象或者函数，如果是对象则直接取对象，如果是函数则取返回值，并且当data是函数的时候通过call方法让data里的this是vm实例

      data = vm._data = isFunction(data) ? data.call(vm) : data; // vm._data.xxx这样取值太麻烦，做一层代理，使用户可以通过vm.xxx取值，取的还是vm._data.xxx的值，vm.xxx => vm._data.xxx

      for (var key in data) {
        proxy(vm, '_data', key);
      } //对数据进行响应式观测


      observe(data);
    }

    function initMixin(Vue) {
      // 表示在vue的基础上做一次混合操作
      Vue.prototype._init = function (options) {
        //主要做了把用户的选项放在了当前的实例上，并且对用户的数据进行了初始化
        // el,data
        var vm = this; // 原型中的this指向实例

        vm.$options = options; // 后面会对options进行扩展操作
        // vm上包含了所有的数据，对数据进行初始化 watch computed props data ...

        initState(vm); // 数据劫持 vm.$options.data

        if (vm.$options.el) {
          // 如果用户传入了el，自动将数据挂载到这个模板上，如果没有传el则用户还可以手动处理：vm.$mount('#app)
          vm.$mount(vm.$options.el);
        }
      };

      Vue.prototype.$mount = function (el) {
        var vm = this;
        var options = vm.$options;
        el = document.querySelector(el);
        vm.$el = el; // 把模板转化成 对应的渲染函数render =》 虚拟dom概念 通过渲染函数产生vnode虚拟节点 =》 用户更新数据 diff算法 更新虚拟dom =》 产生真实节点，更新

        if (!options.render) {
          // 用户没有传render渲染函数则用template，render的优先级更高
          var template = options.template;

          if (!template && el) {
            // 用户也没有传递template 就取el的内容作为模板
            template = el.outerHTML; //通过模板生成render渲染函数

            var render = compileToFunction(template);
            options.render = render;
          }
        } // options.render 就是渲染函数
        // 调用render方法 渲染成真实dom 替换掉页面的内容


        mountComponent(vm); // 组件的挂载流程，把组件挂载到el上，组件的挂载：根据render生成dom元素，把#app里面的内容替换掉就是组件的挂载
      };
    }

    function createElement(vm, tag) {
      var data = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      for (var _len = arguments.length, children = new Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
        children[_key - 3] = arguments[_key];
      }

      return vnode(vm, tag, data, data.key, children, undefined);
    }
    function createTextElement(vm, text) {
      return vnode(vm, undefined, undefined, undefined, undefined, text);
    } //生成虚拟节点，虚拟节点就是一个对象用来描述dom结构

    function vnode(vm, tag, data, key, children, text) {
      return {
        vm: vm,
        tag: tag,
        data: data,
        key: key,
        children: children,
        text: text // .....

      };
    }

    function renderMixin(Vue) {
      Vue.prototype._c = function () {
        // createElement，生成标签元素
        return createElement.apply(void 0, [this].concat(Array.prototype.slice.call(arguments)));
      };

      Vue.prototype._v = function (text) {
        // createTextElement，生成文本元素
        return createTextElement(this, text);
      };

      Vue.prototype._s = function (val) {
        // stringify 
        if (_typeof(val) == 'object') return JSON.stringify(val);
        return val;
      };

      Vue.prototype._render = function () {
        var vm = this;
        var render = vm.$options.render; // 当用户没传入render时是通过template模板解析出来的render方法，也有可能是用户传入的

        var vnode = render.call(vm);
        return vnode;
      };
    }

    function Vue(options) {
      // options 为用户传入的选项
      this._init(options); // 初始化操作

    } // 扩展Vue原型上的方法


    initMixin(Vue);
    renderMixin(Vue); // vm._render

    lifecycleMixin(Vue); // vm._update
    // $mount 找render方法  （template-> render函数  ast => codegen =>字符串）
    // render = with + new Function(codegen) 产生虚拟dom的方法 
    // 虚拟dom -> 真实dom 
    // vm._update(vm._render()); 先生成虚拟dom  -》 生成真实的DOM元素
    // 初次渲染

    return Vue;

})));
//# sourceMappingURL=vue.js.map
