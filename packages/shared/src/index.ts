export const isArray  = Array.isArray

export const isObject = (val: unknown) : boolean => val !== null && typeof val === 'object'
export const hasChanged = (value: any, oldValue: any) => !Object.is(value, oldValue)
export const isFunction = (val: unknown) : boolean => typeof val === 'function'