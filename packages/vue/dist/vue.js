var Vue = (function (exports) {
    'use strict';

    const isObject = (val) => val !== null && typeof val === 'object';
    const hasChanged = (value, oldValue) => !Object.is(value, oldValue);
    const isFunction = (val) => typeof val === 'function';

    const createDep = (effects) => {
        const dep = new Set(effects);
        return dep;
    };

    const targetMap = new WeakMap();
    function track(target, key) {
        // 如果当前不存在执行函数，则直接返回
        if (!activeEffect)
            return;
        // 尝试从targetMap中，根据target获取map
        let depsMap = targetMap.get(target);
        // 如果获取到的 map 不存在，则生成新的 map 对象，并把该对象赋值给对应的value
        if (!depsMap) {
            targetMap.set(target, (depsMap = new Map()));
        }
        let dep = depsMap.get(key);
        if (!dep) {
            depsMap.set(key, (dep = createDep()));
        }
        trackEffects(dep);
    }
    /**利用 dep 依次跟踪指定key的所有effect */
    function trackEffects(dep) {
        dep.add(activeEffect);
    }
    /**
     * 触发依赖的方法
     * @param target  WeakMap 的 key
     * @param key 代理对象的key,当依赖被触发时， 需要根据该key获取
     */
    function trigger(target, key) {
        // 依据 target 获取存储的map实例
        const depsMap = targetMap.get(target);
        if (!depsMap)
            return;
        // 依据 key, 从depsMap中取出value，该value是一个ReactiveEffect类型的数据
        const dep = depsMap.get(key);
        if (!dep) {
            return;
        }
        triggerEffects(dep);
    }
    /**
     *
     * @param 依次触发dep中保存的依赖
     */
    function triggerEffects(dep) {
        const effects = Array.isArray(dep) ? dep : Array.from(dep);
        // 依次触发依赖
        for (const effect of effects) {
            if (effect.computed) {
                triggerEffect(effect);
            }
        }
        for (const effect of effects) {
            if (!effect.computed) {
                triggerEffect(effect);
            }
        }
    }
    function triggerEffect(effect) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
    let activeEffect;
    class ReactiveEffect {
        constructor(fn, scheduler = null) {
            this.fn = fn;
            this.scheduler = scheduler;
        }
        run() {
            activeEffect = this;
            return this.fn();
        }
    }
    function effect(fn) {
        const _effect = new ReactiveEffect(fn);
        _effect.run();
    }

    /**
     * getter回调方法
     */
    const get = createGetter();
    /**
     * 创建getter回调方法
     */
    function createGetter() {
        return function get(target, key, receiver) {
            // 利用 Reflect 得到返回值
            const res = Reflect.get(target, key, receiver);
            // 收集依赖
            track(target, key);
            return res;
        };
    }
    const set = createSetter();
    function createSetter() {
        return function set(target, key, value, receiver) {
            // 利用 Reflect 设置新值
            const res = Reflect.set(target, key, value, receiver);
            // 触发依赖
            trigger(target, key);
            return res;
        };
    }
    const mutableHandlers = {
        get,
        set
    };

    /**
     * 响应性 Map缓存对象
     * key target
     * val proxy
     */
    const reactiveMap = new WeakMap();
    /**
     * 为复杂数据类型，创建响应性对象
     * @param target 被代理对象
     * @returns 代理对象
     */
    function reactive(target) {
        return createReactiveObject(target, mutableHandlers, reactiveMap);
    }
    function createReactiveObject(target, baseHandlers, proxyMap) {
        // 如果该实例已经被代理，则直接返回
        const existingProxy = proxyMap.get(target);
        if (existingProxy) {
            return existingProxy;
        }
        // 未被代理则生成proxy实例
        const proxy = new Proxy(target, baseHandlers);
        // 缓存代理对象
        proxyMap.set(target, proxy);
        return proxy;
    }
    const toReactive = (value) => {
        return isObject(value) ? reactive(value) : value;
    };

    function ref(value) {
        return createRef(value, false);
    }
    function createRef(rawValue, shallow) {
        if (isRef(rawValue)) {
            return rawValue;
        }
        return new RefImpl(rawValue, shallow);
    }
    class RefImpl {
        constructor(value, __v_isShallow) {
            this.__v_isShallow = __v_isShallow;
            this.dep = undefined;
            this.__v_isRef = true;
            this._rawValue = value;
            // 如果 __v_isShallow 为 true，则 value 不会被转化为 reactive 数据，即如果当前 value 为复杂数据类型，则会失去响应性。对应官方文档 shallowRef ：https://cn.vuejs.org/api/reactivity-advanced.html#shallowref
            this._value = __v_isShallow ? value : toReactive(value);
        }
        get value() {
            trackRefValue(this);
            return this._value;
        }
        set value(newVal) {
            if (hasChanged(newVal, this._rawValue)) {
                this._rawValue = newVal;
                this._value = toReactive(newVal);
                triggerRefValue(this);
            }
        }
    }
    function triggerRefValue(ref) {
        if (ref.dep) {
            triggerEffects(ref.dep);
        }
    }
    function trackRefValue(ref) {
        if (activeEffect) {
            trackEffects(ref.dep || (ref.dep = createDep()));
        }
    }
    function isRef(r) {
        return !!(r && r.__v_isRef === true);
    }

    class ComputedRefImpl {
        constructor(getter) {
            this.dep = undefined;
            this.__v_isRef = true;
            this._dirty = true;
            this.effect = new ReactiveEffect(getter, () => {
                if (!this._dirty) {
                    this._dirty = true;
                    triggerRefValue(this);
                }
            });
            this.effect.computed = this;
        }
        get value() {
            trackRefValue(this);
            if (this._dirty) {
                this._dirty = false;
                this._value = this.effect.run();
            }
            return this._value;
        }
    }
    function computed(getterOrOptions) {
        let getter;
        const onlyGetter = isFunction(getterOrOptions);
        if (onlyGetter) {
            getter = getterOrOptions;
        }
        const cRef = new ComputedRefImpl(getter);
        return cRef;
    }

    exports.computed = computed;
    exports.effect = effect;
    exports.reactive = reactive;
    exports.ref = ref;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=vue.js.map
