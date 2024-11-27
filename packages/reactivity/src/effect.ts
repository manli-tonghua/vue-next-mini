import { ComputedRefImpl } from "./computed"
import { createDep, Dep } from "./dep"

type KeyToDepMap = Map<any, Dep>

const targetMap = new WeakMap<any, KeyToDepMap>()

export type EffectScheduler = (...args: any[]) => any

export function track(target: object, key: unknown){
    // 如果当前不存在执行函数，则直接返回
    if(!activeEffect) return
    // 尝试从targetMap中，根据target获取map
    let depsMap = targetMap.get(target)
    // 如果获取到的 map 不存在，则生成新的 map 对象，并把该对象赋值给对应的value
    if(!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if(!dep) {
        depsMap.set(key, (dep = createDep()))
    }
    trackEffects(dep)
}

/**利用 dep 依次跟踪指定key的所有effect */
export function trackEffects(dep: Dep) {
    dep.add(activeEffect!)
}

/**
 * 触发依赖的方法
 * @param target  WeakMap 的 key
 * @param key 代理对象的key,当依赖被触发时， 需要根据该key获取
 */
export function trigger(target: object, key: unknown){
    // 依据 target 获取存储的map实例
    const depsMap = targetMap.get(target)
    if(!depsMap) return
    // 依据 key, 从depsMap中取出value，该value是一个ReactiveEffect类型的数据
    const dep: Dep | undefined = depsMap.get(key)
    if(!dep) {
        return
    }
    triggerEffects(dep)
}

/**
 * 
 * @param 依次触发dep中保存的依赖
 */
export function triggerEffects(dep: Dep) {
    const effects = Array.isArray(dep) ? dep : Array.from(dep)
    // 依次触发依赖
    for(const effect of effects) {
        if(effect.computed) {
            triggerEffect(effect)
        }
    }
    for (const effect of effects) {
        if(!effect.computed) {
            triggerEffect(effect)
        }
    }
}

export function triggerEffect(effect: ReactiveEffect) {
    if(effect.scheduler) {
        effect.scheduler()
    }else {
        effect.run()
    }
}

export let activeEffect: ReactiveEffect | undefined

export class ReactiveEffect<T = any> {
    computed?: ComputedRefImpl<T>
    constructor(public fn: () => T, public scheduler: EffectScheduler | null = null) {}
    run() {
        activeEffect = this
        return this.fn()
    }

}
export function effect<T = any>(fn: () => T) {
    const _effect = new ReactiveEffect(fn)
    _effect.run()
}