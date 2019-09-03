import { Json, Jsonable, toJson, fromJson } from '../../dist/lib/json'

class Job {
    constructor(
        @Json('abc003') public company: string,
        @Json('abc004') public position: string
    ) {}
}

type Sex = '男'|'女'

@Jsonable()
class Human {
    constructor(
        @Json() public sex: Sex
    ) {}
}

@Jsonable('Human')
class Person extends Human {
    @Json('abc002')
    name: string

    @Json()
    age: number

    constructor(name: string, age: number, sex: Sex) {
        super(sex)
        this.name = name
        this.age = age
    }
}

@Jsonable('Person')
class Worker extends Person {
    @Json()
    job: Job

    constructor(params: { name: string, age: number, sex: Sex, company: string, position: string }) {
        super(params.name, params.age, params.sex)
        this.job = new Job(params.company, params.position)
    }
}

let worker = new Worker({name: 'Bonde', age: 34, sex: '男', company: 'AIC', position: 'COO'})
console.log(toJson(worker))
