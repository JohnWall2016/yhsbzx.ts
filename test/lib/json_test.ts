import { Json, Jsonable, toJson, fromJson } from '../../dist/lib/json'

class Job {
    constructor(
        @Json('abc003') public company: string,
        @Json('abc004') public position: string
    ) {}
}

@Jsonable()
class Male {
    @Json()
    sex: string = '男'
}

class Person extends Male {
    @Json('abc001')
    id: string

    @Json('abc002')
    name: string

    @Json()
    job: Job

    @Json()
    age: number

    constructor(id: string, name: string, age: number) {
        super()
        this.id = id
        this.name = name
        this.age = age
        this.job = new Job('abc', 'CTO')
    }
}

const str = toJson(new Person('007', 'Bonde', 32))
console.log(typeof str)
console.log(str)

let test = fromJson(str, Person)
console.log(test)

test = fromJson('{"abc001":"008","abc002":"Bonde2","job":{"company":"abcd","position":"COO"},"age":33,"sex":"女"}', Person)
console.log(test)
