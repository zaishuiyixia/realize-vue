import babel from 'rollup-plugin-babel'
export default {
    input:'./src/index.js',
    output:{
        format:'umd', // 支持amd 和 commonjs规范 ，指定name后导出的结果会挂载到window上，就可以通过window.Vue来使用
        name:'Vue',
        file:'dist/vue.js',
        sourcemap: true, // 打包出来的结果和源代码能做代码映射，es5 -> es6源代码，打包出来的是es5代码，可以对应找到es6源代码
    },
    plugins:[
        babel({ // 在打包的过程中使用babel进行转化 但是排出node_modules文件夹下的所有文件
            exclude:'node_modules/**', // glob 语法，**表示任意目录下的任意文件
        })
    ]
}


// 后续 需要打包不同的类型 可以写个列表，循环打包