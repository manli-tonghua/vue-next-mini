import { hasChanged } from "packages/shared/src/index"
import { activeEffect, trackEffects, triggerEffects } from "./effect"
import { toReactive } from "./reactive"
import { createDep, Dep } from "./dep"

export function ref (value: unknown) {
    return createRef(value, false)
}
function createRef(rawValue: unknown, shallow: boolean) {
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
    constructor(value : T, public readonly  __v_isShallow: boolean) {
        this._rawValue = value
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

export function trackRefValue(ref) {
    if(activeEffect) {
        trackEffects(ref.dep || (ref.dep = createDep()))
    }
}

export function triggerRefValue(ref) {
    if(ref.dep) {
        triggerEffects(ref.dep)
    }
}

// 是否为ref
export function isRef(r: any): boolean {
    return !!(r && r.__v_isRef === true)
}