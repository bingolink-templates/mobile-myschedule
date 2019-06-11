// 入口*.vue文件，对象命名为"App"，在编译文件"webpack.common.conf.js"里引用
import App from 'src/views/app.vue'
// 引入bui-weex
import buiweex from 'bui-weex';
import lang from 'src/js/lang.js'
Vue.prototype.$window = lang
Vue.use(buiweex);