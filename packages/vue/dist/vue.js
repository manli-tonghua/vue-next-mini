var Vue = (function (exports) {
    'use strict';

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
        constructor(fn) {
            this.fn = fn;
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
    }
    // 触发指定依赖
    function triggerEffect(effect) {
        effect.run();
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

    exports.effect = effect;
    exports.reactive = reactive;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=vue.js.map
