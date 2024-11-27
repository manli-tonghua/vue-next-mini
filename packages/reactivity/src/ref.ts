import { hasChanged } from "packages/shared/src/index"
import { createDep, Dep } from "./dep"
import { activeEffect, trackEffects, triggerEffects } from "./effect"
import { toReactive } from "./reactive"

export interface Ref<T = any> {
    value: T
}

export function ref (value?: unknown) {
    return createRef(value, false)
}

export function createRef(rawValue: unknown, shallow: boolean) {
    if(isRef(rawValue)) {
        return rawValue
    }
    return new RefImpl(rawValue, shallow)
}

class RefImpl<T> {
    private _value: T
    private _rawValue: T

    public dep?: Dep = undefined

    public readonly __v_isRef = true
    constructor (value: T, public readonly __v_isShallow: boolean) {
        this._rawValue = value
        // 如果 __v_isShallow 为 true，则 value 不会被转化为 reactive 数据，即如果当前 value 为复杂数据类型，则会失去响应性。对应官方文档 shallowRef ：https://cn.vuejs.org/api/reactivity-advanced.html#shallowref
        this._value = __v_isShallow ? value : toReactive(value)
    }
    get value() {
        trackRefValue(this)
        return this._value
    }

    set value(newVal) {
        if(hasChanged(newVal, this._rawValue)) {
            this._rawValue = newVal
            this._value = toReactive(newVal)
            triggerRefValue(this)
        }
    }
}

export function triggerRefValue(ref) {
    if(ref.dep) {
        triggerEffects(ref.dep)
    }
}

export function trackRefValue (ref) {
    if(activeEffect) {
        trackEffects(ref.dep || (ref.dep = createDep()))
    }
}

export function isRef(r: any): r is Ref {
    return !!(r && (r as any).__v_isRef === true)
}