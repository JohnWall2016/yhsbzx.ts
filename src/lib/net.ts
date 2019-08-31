import * as stream from 'stream'
import * as net from 'net'

interface ReadableStream extends NodeJS.ReadableStream {
    closed?: boolean
    destroyed?: boolean
    destroy?(): void
}

export class Readable<T extends ReadableStream> {
    _err?: Error

    constructor(readonly stream: T) {
        stream.on("error", this.errorHandler)
    }

    private readonly errorHandler = (err: Error): void => {
        this._err = err
    }

    read(size?: number): Promise<Buffer | string | undefined> {
        const stream = this.stream

        return new Promise((resolve, reject) => {
            if (this._err) {
                const err = this._err
                this._err = undefined
                return reject(err)
            }

            if (!stream.readable || stream.closed || stream.destroyed) {
                return resolve()
            }

            const readableHandler = () => {
                const chunk = stream.read(size)

                if (chunk) {
                    removeListeners()
                    resolve(chunk)
                }
            }

            const closeHandler = () => {
                removeListeners()
                resolve()
            }

            const endHandler = () => {
                removeListeners()
                resolve()
            }

            const errorHandler = (err: Error) => {
                this._err = undefined
                removeListeners()
                reject(err)
            }

            const removeListeners = () => {
                stream.removeListener("close", closeHandler)
                stream.removeListener("error", errorHandler)
                stream.removeListener("end", endHandler)
                stream.removeListener("readable", readableHandler)
            }

            stream.on("close", closeHandler)
            stream.on("end", endHandler)
            stream.on("error", errorHandler)
            stream.on("readable", readableHandler)

            readableHandler()
        })
    }

    readAll(): Promise<Buffer | string | undefined> {
        const stream = this.stream
        const bufferArray: Buffer[] = []
        let content = ""

        return new Promise((resolve, reject) => {
            if (this._err) {
                const err = this._err
                this._err = undefined
                return reject(err)
            }

            if (!stream.readable || stream.closed || stream.destroyed) {
                return resolve()
            }

            const dataHandler = (chunk: Buffer | string) => {
                if (typeof chunk === "string") {
                    content += chunk
                } else {
                    bufferArray.push(chunk)
                }
            }

            const closeHandler = () => {
                removeListeners()
                resolve()
            }

            const endHandler = () => {
                removeListeners()

                if (bufferArray.length) {
                    resolve(Buffer.concat(bufferArray))
                } else {
                    resolve(content)
                }
            }

            const errorHandler = (err: Error) => {
                this._err = undefined
                removeListeners()
                reject(err)
            }

            const removeListeners = () => {
                stream.removeListener("close", closeHandler)
                stream.removeListener("data", dataHandler)
                stream.removeListener("error", errorHandler)
                stream.removeListener("end", endHandler)
            }

            stream.on("close", closeHandler)
            stream.on("data", dataHandler)
            stream.on("end", endHandler)
            stream.on("error", errorHandler)

            stream.resume()
        })
    }

    setEncoding(encoding: string): this {
        this.stream.setEncoding(encoding)
        return this
    }

    once(event: "close" | "end" | "error"): Promise<void>
    once(event: "open"): Promise<number>
    once(event: string): Promise<void | number> {
        const stream = this.stream

        return new Promise((resolve, reject) => {
            if (this._err) {
                const err = this._err
                this._err = undefined
                return reject(err)
            }

            if (stream.closed) {
                if (event === "close") {
                    return resolve()
                } else {
                    return reject(new Error(`once ${ event } after close`))
                }
            } else if (stream.destroyed) {
                if (event === "close" || event === "end") {
                    return resolve()
                } else {
                    return reject(new Error(`once ${ event } after destroy`))
                }
            }

            const closeHandler = () => {
                removeListeners()
                resolve()
            }

            const eventHandler =
                event !== "close" && event !== "end" && event !== "error"
                    ? (argument: any) => {
                        removeListeners()
                        resolve(argument)
                    }
                    : undefined

            const endHandler =
                event !== "close"
                    ? () => {
                        removeListeners()
                        resolve()
                    }
                    : undefined

            const errorHandler = (err: Error) => {
                this._err = undefined
                removeListeners()
                reject(err)
            }

            const removeListeners = () => {
                if (eventHandler) {
                    stream.removeListener(event, eventHandler)
                }

                stream.removeListener("error", errorHandler)

                if (endHandler) {
                    stream.removeListener("end", endHandler)
                }

                stream.removeListener("error", errorHandler)
            }

            if (eventHandler) {
                stream.on(event, eventHandler)
            }

            stream.on("close", closeHandler)

            if (endHandler) {
                stream.on("end", endHandler)
            }

            stream.on("error", errorHandler)
        })
    }

    destroy(): void {
        if (this.stream) {
            this.stream.removeListener("error", this.errorHandler)
            if (typeof this.stream.destroy === "function") {
                this.stream.destroy()
            }
        }
    }
}

interface WritableStream extends NodeJS.WritableStream {
    bytesWritten?: number
    closed?: boolean
    destroyed?: boolean
    cork?(): void
    uncork?(): void
    destroy?(): void
}

export class Writable<T extends WritableStream> {
    _err?: Error

    constructor(readonly stream: T) {
        stream.on("error", this.errorHandler)
    }

    private errorHandler = (err: Error): void => {
        this._err = err
    }

    write(chunk: string | Buffer, encoding?: string): Promise<number> {
        const stream = this.stream

        let rejected = false

        return new Promise((resolve, reject) => {
            if (this._err) {
                const err = this._err
                this._err = undefined
                return reject(err)
            }

            if (!stream.writable || stream.closed || stream.destroyed) {
                return reject(new Error("write after end"))
            }

            const writeErrorHandler = (err: Error) => {
                this._err = undefined
                rejected = true
                reject(err)
            }

            stream.once("error", writeErrorHandler)

            const canWrite = typeof chunk === "string" ? stream.write(chunk, encoding) : stream.write(chunk)

            stream.removeListener("error", writeErrorHandler)

            if (canWrite) {
                if (!rejected) {
                    resolve(chunk.length)
                }
            } else {
                const errorHandler = (err: Error) => {
                    this._err = undefined
                    removeListeners()
                    reject(err)
                }

                const drainHandler = () => {
                    removeListeners()
                    resolve(chunk.length)
                }

                const closeHandler = () => {
                    removeListeners()
                    resolve(chunk.length)
                }

                const finishHandler = () => {
                    removeListeners()
                    resolve(chunk.length)
                }

                const removeListeners = () => {
                    stream.removeListener("close", closeHandler)
                    stream.removeListener("drain", drainHandler)
                    stream.removeListener("error", errorHandler)
                    stream.removeListener("finish", finishHandler)
                }

                stream.on("close", closeHandler)
                stream.on("drain", drainHandler)
                stream.on("error", errorHandler)
                stream.on("finish", finishHandler)
            }
        })
    }

    writeAll(content: string | Buffer, chunkSize: number = 64 * 1024): Promise<number> {
        const stream = this.stream

        return new Promise((resolve, reject) => {
            if (this._err) {
                const err = this._err
                this._err = undefined
                return reject(err)
            }

            if (!stream.writable || stream.closed || stream.destroyed) {
                return reject(new Error("writeAll after end"))
            }

            let part = 0

            const closeHandler = () => {
                removeListeners()
                resolve(stream.bytesWritten || 0)
            }

            const drainHandler = () => {
                if (typeof stream.cork === "function") {
                    stream.cork()
                }

                while (stream.writable && !this._err && part * chunkSize < content.length) {
                    const chunk = content.slice(part * chunkSize, ++part * chunkSize)
                    if (part * chunkSize >= content.length) {
                        stream.write(chunk, err => {
                            if (err) reject(err)
                            else resolve(stream.bytesWritten)
                        })
                        break
                    } else {
                        const canWrite = stream.write(chunk)
                        if (!canWrite) {
                            break
                        }
                    }
                }

                if (typeof stream.uncork === "function") {
                    stream.uncork()
                }
            }

            const errorHandler = (err: Error) => {
                this._err = undefined
                removeListeners()
                reject(err)
            }

            const finishHandler = () => {
                removeListeners()
                resolve(stream.bytesWritten || 0)
            }

            const removeListeners = () => {
                stream.removeListener("close", closeHandler)
                stream.removeListener("drain", drainHandler)
                stream.removeListener("error", errorHandler)
                stream.removeListener("finish", finishHandler)
            }

            stream.on("drain", drainHandler)
            stream.on("close", closeHandler)
            stream.on("finish", finishHandler)
            stream.on("error", errorHandler)

            drainHandler()
        })
    }

    once(event: "close" | "error" | "finish"): Promise<void>
    once(event: "open"): Promise<number>
    once(event: "pipe" | "unpipe"): Promise<NodeJS.ReadableStream>
    once(event: string): Promise<void | number | NodeJS.ReadableStream> {
        const stream = this.stream

        return new Promise((resolve, reject) => {
            if (this._err) {
                const err = this._err
                this._err = undefined
                return reject(err)
            }

            if (this._err) {
                return reject(this._err)
            } else if (stream.closed) {
                if (event === "close") {
                    return resolve()
                } else {
                    return reject(new Error(`once ${ event } after close`))
                }
            } else if (stream.destroyed) {
                if (event === "close" || event === "finish") {
                    return resolve()
                } else {
                    return reject(new Error(`once ${ event } after destroy`))
                }
            }

            const closeHandler = () => {
                removeListeners()
                resolve()
            }

            const eventHandler =
                event !== "close" && event !== "finish" && event !== "error"
                    ? (argument: any) => {
                        removeListeners()
                        resolve(argument)
                    }
                    : undefined

            const errorHandler = (err: Error) => {
                this._err = undefined
                removeListeners()
                reject(err)
            }

            const finishHandler =
                event !== "close"
                    ? () => {
                        removeListeners()
                        resolve()
                    }
                    : undefined

            const removeListeners = () => {
                if (eventHandler) {
                    stream.once(event, eventHandler)
                }
                stream.removeListener("close", closeHandler)
                stream.removeListener("error", errorHandler)
                if (finishHandler) {
                    stream.removeListener("finish", finishHandler)
                }
            }

            if (eventHandler) {
                stream.on(event, eventHandler)
            }
            stream.on("close", closeHandler)
            stream.on("error", errorHandler)
            if (finishHandler) {
                stream.on("finish", finishHandler)
            }
        })
    }

    end(): Promise<void> {
        const stream = this.stream

        return new Promise((resolve, reject) => {
            if (this._err) {
                const err = this._err
                this._err = undefined
                return reject(err)
            }

            if (!stream.writable || stream.closed || stream.destroyed) {
                return resolve()
            }

            const finishHandler = () => {
                removeListeners()
                resolve()
            }

            const errorHandler = (err: Error) => {
                this._err = undefined
                removeListeners()
                reject(err)
            }

            const removeListeners = () => {
                stream.removeListener("error", errorHandler)
                stream.removeListener("finish", finishHandler)
            }

            stream.on("finish", finishHandler)
            stream.on("error", errorHandler)

            stream.end()
        })
    }

    destroy(): void {
        if (this.stream) {
            this.stream.removeListener("error", this.errorHandler)
            if (typeof this.stream.destroy === "function") {
                this.stream.destroy()
            }
        }
    }
}

interface DuplexStream extends stream.Duplex {
    closed?: boolean
    destroyed?: boolean
}

export class Duplex<T extends DuplexStream> extends Readable<T> {
    readonly readable: Readable<T>
    readonly writable: Writable<T>

    constructor(readonly stream: T) {
        super(stream)
        this.readable = new Readable(stream)
        this.writable = new Writable(stream)
    }

    // Promise Readable
    read(size?: number): Promise<string | Buffer | undefined> {
        return this.readable.read(size)
    }

    readAll(): Promise<string | Buffer | undefined> {
        return this.readable.readAll()
    }

    setEncoding(encoding: string): this {
        this.readable.setEncoding(encoding)
        return this
    }

    // Promise Writable
    write(chunk: string | Buffer, encoding?: string): Promise<number> {
        return this.writable.write(chunk, encoding)
    }

    writeAll(content: string | Buffer, chunkSize?: number): Promise<number> {
        return this.writable.writeAll(content, chunkSize)
    }

    end(): Promise<void> {
        return this.writable.end()
    }

    // Promise Duplex
    once(event: "close" | "end" | "error" | "finish"): Promise<void>
    once(event: "open"): Promise<number>
    once(event: "pipe" | "unpipe"): Promise<NodeJS.ReadableStream>
    once(event: string): Promise<void | number | NodeJS.ReadableStream> {
        const stream = this.stream

        return new Promise((resolve, reject) => {
            if (this.readable._err) {
                const err = this.readable._err
                this.readable._err = undefined
                return reject(err)
            }

            if (this.writable._err) {
                const err = this.writable._err
                this.writable._err = undefined
                return reject(err)
            }

            if (stream.closed) {
                if (event === "close") {
                    return resolve()
                } else {
                    return reject(new Error(`once ${ event } after close`))
                }
            }

            if (stream.destroyed) {
                if (event === "close" || event === "end" || event === "finish") {
                    return resolve()
                } else {
                    return reject(new Error(`once ${ event } after destroy`))
                }
            }

            const eventHandler =
                event !== "end" && event !== "finish" && event !== "error"
                    ? (argument: any) => {
                        removeListeners()
                        resolve(argument)
                    }
                    : undefined

            const closeHandler = () => {
                removeListeners()
                resolve()
            }

            const endHandler =
                event !== "close"
                    ? () => {
                        removeListeners()
                        resolve()
                    }
                    : undefined

            const errorHandler = (err: Error) => {
                this.readable._err = undefined
                this.writable._err = undefined
                removeListeners()
                reject(err)
            }

            const finishHandler =
                event !== "close"
                    ? () => {
                        removeListeners()
                        resolve()
                    }
                    : undefined

            const removeListeners = () => {
                if (eventHandler) {
                    stream.removeListener(event, eventHandler)
                }
                stream.removeListener("close", closeHandler)
                if (endHandler) {
                    stream.removeListener("end", endHandler)
                }
                stream.removeListener("error", errorHandler)
                if (finishHandler) {
                    stream.removeListener("finish", finishHandler)
                }
            }

            if (eventHandler) {
                stream.on(event, eventHandler)
            }
            stream.on("close", closeHandler)
            if (endHandler) {
                stream.on("end", endHandler)
            }
            if (finishHandler) {
                stream.on("finish", finishHandler)
            }
            stream.on("error", errorHandler)
        })
    }

    destroy(): void {
        if (this.readable) {
            this.readable.destroy()
        }
        if (this.writable) {
            this.writable.destroy()
        }
    }
}

export class TimeoutError extends Error {
    constructor(private duration?: number) {
        super("Timeout" + (duration ? ` in ${ duration }ms` : ''))
    }
}

export class Socket extends Duplex<net.Socket> {
    private timeoutHandler?: () => void

    constructor(readonly socket = new net.Socket()) {
        super(socket)
    }

    connect(port: number, host?: string): Promise<void>
    connect(path: string): Promise<void>
    connect(options: net.SocketConnectOpts): Promise<void>
    connect(arg1: any, arg2?: any): Promise<void> {
        const socket = this.stream

        return new Promise((resolve, reject) => {
            if (this.readable._err) {
                const err = this.readable._err
                this.readable._err = undefined
                reject(err)
            }

            if (this.writable._err) {
                const err = this.writable._err
                this.writable._err = undefined
                reject(err)
            }

            const connectHandler = () => {
                socket.removeListener("error", errorHandler)
                resolve()
            }

            const errorHandler = (err: Error) => {
                this.readable._err = undefined
                this.writable._err = undefined
                socket.removeListener("connect", connectHandler)
                reject(err)
            }

            socket.once("error", errorHandler)
            if (arg2 !== undefined) {
                socket.connect(arg1, arg2, connectHandler)
            } else {
                socket.connect(arg1, connectHandler)
            }
        })
    }

    setTimeout(timeout: number): void {
        const socket = this.stream

        if (timeout === 0) {
            if (this.timeoutHandler) {
                socket.removeListener("timeout", this.timeoutHandler)
                this.timeoutHandler = undefined
            }
        } else {
            if (!this.timeoutHandler) {
                this.timeoutHandler = () => {
                    this.timeoutHandler = undefined
                    socket.destroy(new TimeoutError(timeout))
                }
                socket.once("timeout", this.timeoutHandler)
            }
        }

        socket.setTimeout(timeout)
    }
}
