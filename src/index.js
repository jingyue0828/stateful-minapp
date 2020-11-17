/* eslint-disable @typescript-eslint/no-this-alias */
const _toString = Object.prototype.toString;

/**
 * is function
 * @param {*} obj
 * @return {Boolean}
 */
function isFunction(obj) {
  return typeof obj === 'function' || false;
}

/**
 * is object
 * @param {*} obj
 * @return {Boolean}
 */
function isObject(obj) {
  return _toString.call(obj) === '[object Object]' || false;
}

/**
 * console warn
 * @param {String} str
 */
function warn(str) {
  console.warn(str);
}

/**
 * throw error
 * @param {String} str
 */
function err(str) {
  throw new Error(str);
}

/**
 * 浅比较当前date和新的stateMap，并返回更小粒度的更新
 * @param {String} data
 * @param {String} stateMap
 * @return {Object | false}
 */

function shallowDiffData(data, stateMap) {
  if (!isObject(stateMap)) return false;
  const newMap = {};
  let hasDiff = false;
  for (const key in stateMap) {
    if (stateMap[key] !== data[key]) {
      hasDiff = true;
      newMap[key] = stateMap[key];
    }
  }
  return hasDiff && newMap;
}

// 解析path到数组
function parsePath(str = '') {
  let list = [];
  const reg = /\[\d+\]/g;
  str.split('.').forEach((item) => {
    let arr = item.split(reg).concat(item.match(reg));
    arr = arr.filter((item) => !!item);
    arr = arr.map((item) => {
      if (item.charAt(0) === '[' && item.charAt(item.length - 1) === ']') {
        return parseInt(item.slice(1, -1));
      } else {
        return item;
      }
    });
    list = list.concat(arr);
  });
  return list;
}

// 设置value到对象路径
function setPath(obj, path, value) {
  const segs = parsePath(path);
  segs.reduce((deep, seg, i) => {
    return (deep[seg] = segs.length - 1 === i ? (deep[seg] = value) : deep[seg] || {});
  }, obj);
  return obj;
}

/**
 * redux store实例
 */
let _store = null;

/**
 * Page连接器
 * @return {Function}
 */
function connect() {
  const registerStore = !!_store;
  if (!registerStore) {
    throw new Error(`must register Store in app.js,like use(Store)`);
  }
  return function (pageObject) {
    if (!isObject(pageObject)) {
      err(`page object connect accept a page object, but got a ${typeof pageObject}`);
    }
    if (pageObject.state !== undefined && !isFunction(pageObject.state)) {
      err(`connect first param accept a function, but got a ${typeof pageObject.state}`);
    }
    if (pageObject.actions !== undefined && !isFunction(pageObject.actions)) {
      err(`connect second param accept a function, but got a ${typeof pageObject.actions}`);
    }
    if (!pageObject.data) pageObject.data = {};
    // map state to data
    const dataMap = pageObject.state ? pageObject.state(_store.getState()) : {};
    if (!pageObject.state) {
      pageObject.state = () => {};
    }
    if (!pageObject.actions) {
      pageObject.actions = () => {};
    }
    for (const dataKey in dataMap) {
      if (pageObject.data.hasOwnProperty(dataKey)) {
        warn(`page object had data ${dataKey}, connect map will cover this prop.`);
      }
      pageObject.data[dataKey] = dataMap[dataKey];
    }
    // map method to page
    const methodMap = pageObject.actions
      ? pageObject.actions(_store.dispatch, _store.getState())
      : {};
    for (const methodKey in methodMap) {
      if (pageObject.hasOwnProperty(methodKey)) {
        warn(`page object had method ${methodKey}, connect map will cover this method.`);
      }
      pageObject[methodKey] = methodMap[methodKey];
    }
    const onLoad = pageObject.onLoad;
    const onUnload = pageObject.onUnload;
    let unsubscribe = null;
    pageObject.onLoad = function (options) {
      const _data = pageObject.data;
      const _setData = this.setData;
      const _this = this;
      for (const key in _data) {
        Object.defineProperty(_this, key, {
          configurable: true,
          enumerable: false,
          set(val) {
            _this.data[key] = val;
          },
          get() {
            return _this.data[key];
          },
        });
      }
      Object.defineProperty(_this, 'setData', {
        configurable: true,
        enumerable: true,
        writable: false,
        value: (d, f) => {
          if (!isObject(d)) {
            throw new TypeError('must be object');
          }
          Object.keys(d).forEach((k) => {
            setPath(_this.data, k, d[k]);
          });
          _setData.call(_this, _this.data, f);
        },
      });
      const updateData = () => {
        const stateMap = shallowDiffData(_this.data, pageObject.state(_store.getState()));
        stateMap && _this.setData(stateMap);
      };
      updateData();
      unsubscribe = _store.subscribe(updateData);
      onLoad && onLoad.call(_this, options);
    };
    pageObject.onUnload = function () {
      unsubscribe && unsubscribe();
      onUnload && onUnload.call(this);
    };
    return pageObject;
  };
}

/**
 * 组件连接器
 * @return {Function}
 */
function connectComponent() {
  const registerStore = !!_store;
  if (!registerStore) {
    throw new Error(`must register Store in app.js,like use(Store)`);
  }
  return function (componentObject) {
    if (!isObject(componentObject)) {
      err(
        `component object connect accept a component object, but got a ${typeof componentObject}`,
      );
    }
    if (componentObject.state !== undefined && !isFunction(componentObject.state)) {
      err(`connect first param accept a function, but got a ${typeof componentObject.state}`);
    }
    if (componentObject.actions !== undefined && !isFunction(componentObject.actions)) {
      err(`connect second param accept a function, but got a ${typeof componentObject.actions}`);
    }
    if (!componentObject.data) componentObject.data = {};
    // map state to data
    const dataMap = componentObject.state ? componentObject.state(_store.getState()) : {};
    if (!componentObject.state) {
      componentObject.state = () => {};
    }
    if (!componentObject.actions) {
      componentObject.actions = () => {};
    }
    for (const dataKey in dataMap) {
      if (componentObject.data.hasOwnProperty(dataKey)) {
        warn(`component object had data ${dataKey}, connect map will cover this prop.`);
      }
      componentObject.data[dataKey] = dataMap[dataKey];
    }
    // map method to component
    const methodMap = componentObject.actions
      ? componentObject.actions(_store.dispatch, _store.getState())
      : {};
    if (!componentObject.methods) componentObject.methods = {};
    for (const methodKey in methodMap) {
      if (componentObject.hasOwnProperty(methodKey)) {
        warn(`component object had method ${methodKey}, connect map will cover this method.`);
      }
      componentObject.methods[methodKey] = methodMap[methodKey];
    }
    const attached =
      (componentObject.hasOwnProperty('lifetimes') && componentObject.lifetimes.attached) ||
      componentObject.attached;
    const detached =
      (componentObject.hasOwnProperty('lifetimes') && componentObject.lifetimes.detached) ||
      componentObject.detached;
    let unsubscribe = null;
    const attachedCache = function () {
      const _this = this;
      const _data = componentObject.data;
      const _setData = this.setData;
      const _properties = componentObject.properties;
      for (const key in _data) {
        Object.defineProperty(_this, key, {
          configurable: true,
          enumerable: false,
          set(val) {
            _this.data[key] = val;
          },
          get() {
            return _this.data[key];
          },
        });
      }
      for (const key in _properties) {
        Object.defineProperty(_this, key, {
          configurable: true,
          enumerable: false,
          // set(val) {
          //   this.properties[key] = val;
          // },
          get() {
            return _this.properties[key];
          },
        });
      }
      Object.defineProperty(_this, 'setData', {
        configurable: true,
        enumerable: true,
        writable: false,
        value: (d, f) => {
          if (!isObject(d)) {
            throw new TypeError('must be object');
          }
          Object.keys(d).forEach((k) => {
            setPath(_this.data, k, d[k]);
          });
          _setData.call(_this, _this.data, f);
        },
      });
      const updateData = () => {
        const stateMap = shallowDiffData(_this.data, componentObject.state(_store.getState()));
        stateMap && _this.setData(stateMap);
      };
      updateData();
      unsubscribe = _store.subscribe(updateData);
      attached && attached.call(_this);
    };
    const detachedCache = function () {
      unsubscribe && unsubscribe();
      detached && detached.call(this);
    };

    /**
     * 兼容2.2.3以下版本
     */
    if (componentObject.hasOwnProperty('lifetimes') && componentObject.lifetimes.attached) {
      componentObject.lifetimes.attached = attachedCache;
    } else {
      componentObject.attached = attachedCache;
    }
    if (componentObject.hasOwnProperty('lifetimes') && componentObject.lifetimes.detached) {
      componentObject.lifetimes.detached = detachedCache;
    } else {
      componentObject.detached = detachedCache;
    }
    return componentObject;
  };
}

function connectBase() {
  return function (pageObject) {
    if (!isObject(pageObject)) {
      err(`component object connect accept a page object, but got a ${typeof pageObject}`);
    }
    const onLoad = pageObject.onLoad;
    pageObject.onLoad = function (options) {
      const _data = pageObject.data;
      const _setData = this.setData;
      const _this = this;
      for (const key in _data) {
        Object.defineProperty(_this, key, {
          configurable: true,
          enumerable: false,
          set(val) {
            _this.data[key] = val;
          },
          get() {
            return _this.data[key];
          },
        });
      }
      Object.defineProperty(_this, 'setData', {
        configurable: true,
        enumerable: true,
        writable: false,
        value: (d, f) => {
          if (!isObject(d)) {
            throw new TypeError('must be object');
          }
          Object.keys(d).forEach((k) => {
            setPath(_this.data, k, d[k]);
          });
          _setData.call(_this, _this.data, f);
        },
      });
      onLoad && onLoad.call(_this, options);
    };
    return pageObject;
  };
}

function connectComponentBase() {
  return function (componentObject) {
    if (!isObject(componentObject)) {
      err(
        `component object connect accept a component object, but got a ${typeof componentObject}`,
      );
    }
    const attached =
      (componentObject.hasOwnProperty('lifetimes') && componentObject.lifetimes.attached) ||
      componentObject.attached;
    const attachedCache = function () {
      const _data = componentObject.data;
      const _setData = this.setData;
      const _properties = componentObject.properties;
      const _this = this;
      for (const key in _data) {
        Object.defineProperty(_this, key, {
          configurable: true,
          enumerable: false,
          set(val) {
            _this.data[key] = val;
          },
          get() {
            return _this.data[key];
          },
        });
      }
      for (const key in _properties) {
        Object.defineProperty(_this, key, {
          configurable: true,
          enumerable: false,
          get() {
            return _this.properties[key];
          },
        });
      }
      Object.defineProperty(_this, 'setData', {
        configurable: true,
        enumerable: true,
        writable: false,
        value: (d, f) => {
          if (!isObject(d)) {
            throw new TypeError('must be object');
          }
          Object.keys(d).forEach((k) => {
            setPath(_this.data, k, d[k]);
          });
          _setData.call(_this, _this.data, f);
        },
      });
      attached && attached.call(_this);
    };

    /**
     * 兼容2.2.3以下版本
     */
    if (componentObject.hasOwnProperty('lifetimes') && componentObject.lifetimes.attached) {
      componentObject.lifetimes.attached = attachedCache;
    } else {
      componentObject.attached = attachedCache;
    }
    return componentObject;
  };
}

/**
 * use Store
 * @param {Object} Store
 */
function use(Store) {
  if (!isObject(Store)) err(`init state accept a redux instance, but got a ${typeof Store}`);
  if (_store) {
    warn('there are multiple store active. This might lead to unexpected results.');
  }
  _store = Store;
}

module.exports = {
  connect,
  connectComponent,
  connectBase,
  connectComponentBase,
  use,
};
