# minapp-rct &middot; ![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)[![npm version](https://img.shields.io/npm/v/minapp-rct.svg?style=flat)](https://www.npmjs.com/package/minapp-rct)

minapp-rct 是一款小程序的功能扩展插件

- **Redux:** 简单配置便可在小程序中使用 [Redux](https://github.com/reduxjs/redux).
- **计算属性:** 在 `Page` 和 `Component` 中内置了计算属性的功能.
- **this 绑定:** 将 `data`和`properties`中的属性 直接绑定到页面实例中.

##### npm 构建

```bash
npm install minapp-rct
```

在 App.js 中注册,具体配置及使用方式可查看[例子](./tools/demo/app.js).

```Javascript
// app.js
import { use } from 'minapp-rct'
import Store from '../../store/index'

use(Store)

App({})
```

##### API

```Javascript
//注册
use()
//连接页面
connect()
//连接组件
connectComponent()
```

##### Usage

```Javascript
import { connect } from 'minapp-rct';
import { actions } from '../../store/index';

const page = {
  // redux state
  state(state) {
    const { user } = state;
    return {
      userName: user.userInfo.userName,
    };
  },
  // redux actions
  actions(dispatch, state) {
    return {
      updateUserName(name) {
        dispatch(actions.user.setUserInfo({ userName: name }));
      },
    };
  },
  data: {
    example: 'example',
    // 计算属性/computed
    get computedName() {
      return this.example + ' ' + this.userName + ' from Page';
    },
  },
  onLoad() {
    this.updateUserName('nameUpdated');
    //data已挂载到页面实例的this下
    console.log(this.example);
  },
};

Page(connect()(page));

```
