var Vue = (function (exports) {
    'use strict';

    const isObject = (val) => val !== null && typeof val === 'object';
    const hasChanged = (value, oldValue) => !Object.is(value, oldValue);
    const isFunction = (val) => typeof val === 'function';

    const createDep = (effects) => {
        const dep = new Set(effects);
        return dep;
    };

    // effect
    const targetMap = new WeakMap();
    function effect(fn) {
        const _effect = new ReactiveEffect(fn);
        _effect.run();
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
    // 收集依赖
    function track(target, key) {
        if (!activeEffect)
            return;
        let depsMap = targetMap.get(target);
        if (!depsMap) {
            targetMap.set(target, (depsMap = new Map()));
        }
        // depsMap.set(key, activeEffect)
        // console.log(targetMap)
        let dep = depsMap.get(key);
        if (!dep) {
            depsMap.set(key, (dep = createDep()));
        }
        trackEffects(dep);
    }
    // 利用 dep 依次跟踪指定 key 的 所有 effect
    function trackEffects(dep) {
        dep.add(activeEffect);
    }
    // 触发依赖
    function trigger(target, key, newValue) {
        const depsMap = targetMap.get(target);
        if (!depsMap)
            return;
        const dep = depsMap.get(key);
        if (!dep) {
            return;
        }
        triggerEffects(dep);
    }
    // 依次触发 dep 中保存的依赖
    function triggerEffects(dep) {
        const effects = Array.isArray(dep) ? dep : Array.from(dep);
        // 依次触发依赖
        for (const effect of effects) {
            triggerEffect(effect);
        }
        // for(const effect of effects) {
        //    if(effect.computed) {
        //       triggerEffect(effect)
        //    }
        // }
        // for(const effect of effects) {
        //     if(!effect.computed) {
        //         triggerEffect(effect)
        //     }
        // }
    }
    // 触发指定依赖
    function triggerEffect(effect) {
        console.log(effect, '0000');
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.fn();
        }
    }

    const get = createGetter();
    function createGetter() {
        return function get(target, key, receiver) {
            const res = Reflect.get(target, key, receiver);
            // 依赖收集
            track(target, key);
            return res;
        };
    }
    const set = createSetter();
    function createSetter() {
        return function set(target, key, value, receiver) {
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

    const reactiveMap = new WeakMap();
    function reactive(target) {
        return createReactiveObject(target, mutableHandlers, reactiveMap);
    }
    function createReactiveObject(target, baseHandlers, proxyMap) {
        const existingProxy = proxyMap.get(target);
        if (existingProxy)
            return existingProxy;
        const proxy = new Proxy(target, baseHandlers);
        proxyMap.set(target, proxy);
        return proxy;
    }
    const toReactive = (value) => isObject(value) ? reactive(value) : value;

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
    function trackRefValue(ref) {
        if (activeEffect) {
            trackEffects(ref.dep || (ref.dep = createDep()));
        }
    }
    function triggerRefValue(ref) {
        if (ref.dep) {
            triggerEffects(ref.dep);
        }
    }
    // 是否为ref
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
