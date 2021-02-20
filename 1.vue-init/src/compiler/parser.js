const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`; // 标签名 
const qnameCapture = `((?:${ncname}\\:)?${ncname})`; //  用来获取的标签名的 match后的索引为1的
const startTagOpen = new RegExp(`^<${qnameCapture}`); // 匹配开始标签的 
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); // 匹配闭合标签的
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/; // 匹配属性单引号、双引号、没有引号 a=b  a="b"  a='b'
const startTagClose = /^\s*(\/?)>/; // 匹配标签的关闭    />   <div/>
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g; // Vue数据绑定最常见的形式就是使用“Mustache”语法 (双大括号) 的文本插值，匹配双大括号的文本插值：{{aaaaa}}


// ast抽象语法树 (语法层面的描述,可以描述js、css、html) vdom：用来描述dom节点，不能用来描述js、css、html结构

// vue的模板解析主要是使用了正则匹配，<div id="app"> {{name}}</div>匹配出标签名、标签属性、闭合标签...
// 将解析后的结果 组装成一个树结构  栈
function createAstElement(tagName, attrs) {
    return {
        tag: tagName,
        type: 1, // 1 元素 2 文本
        children: [],
        parent: null,
        attrs
    }
}
let root = null; //根元素
let stack = []; //存放元素的栈
function start(tagName, attributes) {
    let parent = stack[stack.length - 1];
    let element = createAstElement(tagName, attributes);
    if (!root) {
        root = element;
    }
    if(parent){
        element.parent = parent;// 当放入栈中时 记录父节点是谁
        parent.children.push(element)
    }
    stack.push(element);
}
function end(tagName) {
    let last = stack.pop();
    if (last.tag !== tagName) { //标签闭合有问题
        throw new Error('标签闭合有误');
    }
}
function chars(text) {
    text = text.replace(/\s/g, "");
    let parent = stack[stack.length - 1];
    if (text) {
        parent.children.push({
            type: 3,
            text
        })
    }
}

export function parserHTML(html) {
    function advance(len) { //解析过的模板字符串截取掉
        html = html.substring(len);
    }

    function parseStartTag() { //解析开始标签函数
        const start = html.match(startTagOpen);
        if (start) {
            const match = {
                tagName: start[1],
                attrs: []
            }
            advance(start[0].length);
            let end;
            let attr;
            // 如果没有遇到标签结尾就不停的解析
            while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) { 
                match.attrs.push({ name: attr[1], value: attr[3] || attr[4] || attr[5] }) // 有可能属性是带单引号、双引号或者没有引号 attr[3] attr[4] attr[5]
                advance(attr[0].length) //截取掉匹配过的属性
            }
            if (end) { //删除结尾标签: >
                advance(end[0].length);
            }
            return match;
        }
        return false; // 不是开始标签，则跳过
    }
    while (html) { // 看要解析的内容是否存在，如果存在就不停的解析，正则循环解析模板字符串
        let textEnd = html.indexOf('<'); // 当前解析的开头  
        if (textEnd == 0) {//有可能是开始标签或者是结束标签
            const startTagMatch = parseStartTag(html); // 解析开始标签
            if (startTagMatch) { //如果匹配到了则是开始标签
                start(startTagMatch.tagName, startTagMatch.attrs)
                continue;
            }
            const endTagMatch = html.match(endTag);
            if (endTagMatch) { //如果匹配到了则是结束标签
                end(endTagMatch[1]);
                advance(endTagMatch[0].length);
                continue;
            }
        }
        let text;
        if (textEnd > 0) { //匹配文本内容
            text = html.substring(0, textEnd)
        }
        if (text) {
            chars(text);
            advance(text.length);
        }
    }
    return root;
}


// 看一下用户是否传入了render函数（如果用户传入了render函数则不需要接下来的对模板template词法解析生成可执行的代码这一系列步骤了，性能更高）, 没传入可能传入的是 template, template如果也没有传递，则将最外层的html
//（<div id="app" a=1 style="color:red;background:blue">hello {{arr}} world</div>）当做template进行词法解析
// 将我们的html =》 词法解析  （解析出开始标签，结束标签，属性，文本）
// 解析出来的结果=> ast语法树（用来描述html语法的，stack=[]，使用栈结构push、pop） 
// 通过codegen 将<div>hello</div> 转化为 =>   _c('div',{},'hello')  => 让字符串执行
// 字符串如果转成代码
// 通过new Function + with 来实现（不使用eval是因为耗性能，还会有作用域问题）=> 生成render函数
// render函数返回 => 虚拟dom（虚拟dom里可以扩展额外的属性） => 生成真实dom