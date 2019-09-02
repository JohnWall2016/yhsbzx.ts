import { JsonProperty, Serializable, serialize, deserialize} from 'typescript-json-serializer'

export let Json = JsonProperty

export let Jsonable = Serializable

export function toJson<T>(json: T) {
    return JSON.stringify(serialize(json))
}

export function fromJson<T>(json: string, type: new (...params: Array<any>) => T) {
    return deserialize(JSON.parse(json), type)
}
