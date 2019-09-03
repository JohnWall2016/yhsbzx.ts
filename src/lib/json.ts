/*import { JsonProperty, Serializable, serialize, deserialize} from 'typescript-json-serializer'

export let Json = JsonProperty

export let Jsonable = Serializable

export function toJson<T>(json: T) {
    return JSON.stringify(serialize(json))
}

export function fromJson<T>(json: string, type: new (...params: Array<any>) => T) {
    return deserialize(JSON.parse(json), type)
}
*/

import 'reflect-metadata/Reflect'

const designParamtypes = 'design:paramtypes';
const designType = 'design:type';
const apiMap = 'api:map:';
const apiMapSerializable = apiMap + "serializable";

export function JsonProperty(args?: string | {
    name?: string;
    type: Function;
} | {
    name?: string;
    predicate: Function;
}): Function {
    return function (target: any, key: string, index: any) {
        if (key === undefined && target['prototype']) {
            var type = Reflect.getMetadata(designParamtypes, target, key)[index];
            var keys = getParamNames(target['prototype'].constructor);
            key = keys[index];
            target = target['prototype'];
            Reflect.defineMetadata(designType, type, target, key);
        }
        var map: {[k:string]:any} = {};
        var targetName = target.constructor.name;
        var apiMapTargetName = "" + apiMap + targetName;
        if (Reflect.hasMetadata(apiMapTargetName, target)) {
            map = Reflect.getMetadata(apiMapTargetName, target);
        }
        map[key] = getJsonPropertyValue(key, args);
        Reflect.defineMetadata(apiMapTargetName, map, target);
    };
}

function getParamNames(ctor: Function) {
    // Remove all kind of comments
    var withoutComments = ctor.toString().replace(/(\/\*[\s\S]*?\*\/|\/\/.*$)/gm, '');
    // Parse function body
    var parameterPattern = /(?:this.)([^\s=;]+)\s*=/gm;
    var paramNames = [];
    var match;
    // Get params
    while (match = parameterPattern.exec(withoutComments)) {
        var paramName = match[1];
        if (paramName) {
            paramNames.push(paramName);
        }
    }
    return paramNames;
}

enum Type {
    Array = "array",
    Boolean = "boolean",
    Date = "date",
    Number = "number",
    String = "string"
}

function getJsonPropertyValue(key: any, args: any) {
    if (!args) {
        return {
            name: key.toString(),
            type: undefined
        };
    }
    var name = typeof args === Type.String ? args : args['name'] ? args['name'] : key.toString();
    return args['predicate'] ? { name: name, predicate: args['predicate'] } : { name: name, type: args['type'] };
}

export function Serializable(baseClassName?: string): Function {
    return function (target: any) {
        Reflect.defineMetadata(apiMapSerializable, baseClassName, target);
    };
}

export function deserialize(json: any, type: any) {
    var instance = new type();
    var instanceName = instance.constructor.name;
    var baseClassName = Reflect.getMetadata(apiMapSerializable, type);
    var apiMapInstanceName = "" + apiMap + instanceName;
    var hasMap = Reflect.hasMetadata(apiMapInstanceName, instance);
    var instanceMap: {[k: string]: any} = {};
    if (!hasMap) {
        return instance;
    }
    instanceMap = Reflect.getMetadata(apiMapInstanceName, instance);
    if (baseClassName) {
        var baseClassMap = Reflect.getMetadata("" + apiMap + baseClassName, instance);
        instanceMap = Object.assign({}, instanceMap, baseClassMap);
    }
    var keys = Object.keys(instanceMap);
    keys.forEach(function (key) {
        if (json[instanceMap[key].name] !== undefined) {
            instance[key] = convertDataToProperty(instance, key, instanceMap[key], json[instanceMap[key].name]);
        }
    });
    return instance;
}

function convertPropertyToData(instance: any, key: any, value: any, removeUndefined: any) {
    var property = instance[key];
    var type = Reflect.getMetadata(designType, instance, key);
    var isArray = type.name.toLocaleLowerCase() === Type.Array;
    var predicate = value['predicate'];
    var propertyType = value['type'] || type;
    var isSerializableProperty = isSerializable(propertyType);
    if (isSerializableProperty || predicate) {
        if (isArray) {
            var array_1: any = [];
            property.forEach(function (d: any) {
                array_1.push(serialize(d, removeUndefined));
            });
            return array_1;
        }
        return serialize(property, removeUndefined);
    }
    if (propertyType.name.toLocaleLowerCase() === Type.Date) {
        return property.toISOString();
    }
    return property;
}

function convertDataToProperty(instance: any, key: any, value: any, data: any) {
    var type = Reflect.getMetadata(designType, instance, key);
    var isArray = type.name.toLowerCase() === Type.Array;
    var predicate = value['predicate'];
    var propertyType = value['type'] || type;
    var isSerializableProperty = isSerializable(propertyType);
    if (!isSerializableProperty && !predicate) {
        return castSimpleData(propertyType.name, data);
    }
    if (isArray) {
        var array_2: any = [];
        data.forEach(function (d: any) {
            if (predicate) {
                propertyType = predicate(d);
            }
            array_2.push(deserialize(d, propertyType));
        });
        return array_2;
    }
    propertyType = predicate ? predicate(data) : propertyType;
    return deserialize(data, propertyType);
}

function castSimpleData(type: any, data: any) {
    type = type.toLowerCase();
    if ((typeof data).toLowerCase() === type) {
        return data;
    }
    switch (type) {
        case Type.String:
            return data.toString();
        case Type.Number:
            var number = +data;
            if (isNaN(number)) {
                console.error(data + ": Type " + typeof data + " is not assignable to type " + type + ".");
                return undefined;
            }
            return number;
        case Type.Boolean:
            console.error(data + ": Type " + typeof data + " is not assignable to type " + type + ".");
            return undefined;
        case Type.Date:
            if (isNaN(Date.parse(data))) {
                console.error(data + ": Type " + typeof data + " is not assignable to type " + type + ".");
                return undefined;
            }
            return new Date(data);
        default:
            return data;
    }
}

function isSerializable(type: any) {
    return Reflect.hasOwnMetadata(apiMapSerializable, type);
}

export function serialize(instance: any, removeUndefined: any) {
    if (removeUndefined === void 0) { removeUndefined = true; }
    var json: {[k: string]: any} = {};
    var instanceName = instance.constructor.name;
    var baseClassName = Reflect.getMetadata(apiMapSerializable, instance.constructor);
    var apiMapInstanceName = "" + apiMap + instanceName;
    var hasMap = Reflect.hasMetadata(apiMapInstanceName, instance);
    var instanceMap: {[k: string]: any} = {};
    if (!hasMap) {
        return json;
    }
    instanceMap = Reflect.getMetadata(apiMapInstanceName, instance);
    if (baseClassName !== undefined) {
        var baseClassMap = Reflect.getMetadata("" + apiMap + baseClassName, instance);
        instanceMap = Object.assign({}, instanceMap, baseClassMap);
    }
    var instanceKeys = Object.keys(instance);
    Object.keys(instanceMap).forEach(function (key) {
        if (!instanceKeys.includes(key)) {
            return;
        }
        var data = convertPropertyToData(instance, key, instanceMap[key], removeUndefined);
        if (!removeUndefined || removeUndefined && data !== undefined) {
            json[instanceMap[key].name] = data;
        }
    });
    return json;
}
