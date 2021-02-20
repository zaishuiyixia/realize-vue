const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g; // {{aaaaa}} 匹配双大括号语法


// html字符串 =》 字符串  _c('div',{id:'app',a:1},'hello')

function genProps(attrs) { // [{name:'xxx',value:'xxx'},{name:'xxx',value:'xxx'}]
    let str = '';
    for (let i = 0; i < attrs.length; i++) {
        let attr = attrs[i];
        if (attr.name === 'style') { // color:red;background:blue
            let styleObj = {};
            attr.value.replace(/([^;:]+)\:([^;:]+)/g, function() {
                styleObj[arguments[1]] = arguments[2]
            })
            attr.value = styleObj
        }
        str += `${attr.name}:${JSON.stringify(attr.value)},`;
    }
    return `{${str.slice(0,-1)}}`
}

function gen(el) {
    if (el.type == 1) { // element = 1 元素； text = 3 文本
        return generate(el);
    } else {
        let text = el.text;
        if (!defaultTagRE.test(text)) {
            return `_v('${text}')`;
        } else {
            // 'hello' + arr + 'world'    hello {{arr}} {{aa}} world 需要匹配文本中是否有双大括号，双大括号里面的是变量不是文本
            let tokens = [];
            let match;
            let lastIndex = defaultTagRE.lastIndex = 0; // reg.exec和/g有冲突，导致只会第一次匹配的时候捕获到，所以每次执行的时候要把lastIndex重置
            while (match = defaultTagRE.exec(text)) { // 看有没有匹配到
                let index = match.index; // 开始索引
                if (index > lastIndex) {
                    tokens.push(JSON.stringify(text.slice(lastIndex, index)))
                }
                tokens.push(`_s(${match[1].trim()})`); // 'hello' + arr + 'world'变量和字符串拼接的话未导致对象是[Object, Object]，所以用_s去处理，作用和JSON.Stringify类型
                lastIndex = index + match[0].length;
            }
            if (lastIndex < text.length) {
                tokens.push(JSON.stringify(text.slice(lastIndex)))
            }
            return `_v(${tokens.join('+')})`
        }
    }
}

function genChildren(el) {
    let children = el.children; // 获取儿子
    if (children) {
        return children.map(c => gen(c)).join(',')
    }
    return false;
}

export function generate(el) { 
    // 遍历树 将树拼接成字符串： _c('div',{id:'app',a:1},_c('span',{},'world'),_v()) 拼接成这种形式的字符串，最后在new Function(code)把拼接的字符串变成可执行的函数
    // _c创建元素的虚拟节点，_v创建文本的虚拟节点，_s用来处理{{ arr }}变量
    let children = genChildren(el);
    let code = `_c('${el.tag}',${
        el.attrs.length? genProps(el.attrs): 'undefined'
    }${
        children? `,${children}`:''
    })`;
    return code;
}