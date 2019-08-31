import { Socket } from './net'
import { GrowableBuffer as GBuffer } from './gbuffer'

export class HttpSocket {
    private _socket: Socket

    private constructor(readonly host: string, readonly port: number, readonly encoding = 'utf8') {
        this._socket = new Socket()
    }

    static async connect(host: string, port: number, timeout: number = 5000) {
        let socket = new HttpSocket(host, port)
        socket._socket.setTimeout(timeout)
        await socket._socket.connect(port, host)
        return socket
    }

    async end() {
        await this._socket.end()
    }

    async read(size: number) {
        const buf = await this._socket.read(size)
        if (buf !== undefined) {
            if (typeof buf === 'string') {
                return Buffer.from(buf, 'utf8')
            } else {
                return buf
            }
        }
        return buf
    }

    async readUInt8() {
        const buf = await this.read(1)
        if (buf !== undefined) {
            return buf[0]
        }
        return undefined
    }

    async readLine() {
        const buf = new GBuffer()
        let c, n
        while (true) {
            c = await this.readUInt8()
            if (c === undefined) {
                return buf.toString(this.encoding)
            } else if (c == 0xd) { // \r
                n = await this.readUInt8()
                if (!n) {
                    buf.addUInt8(c)
                    return buf.toString(this.encoding)
                } else if (n == 0xa) { // \n
                    return buf.toString(this.encoding)
                } else {
                    buf.addUInt8(c)
                    buf.addUInt8(n)
                }
            } else {
                buf.addUInt8(c)
            }
        }
    }

    async readHttpHeader() {
        const header = new HttpHeader()
        while (true) {
            const line = await this.readLine()
            // console.log(`HEADER: ${line}`)
            if (line === '') break
            const i = line.indexOf(':')
            if (i > 0) {
                header.add(line.substring(0, i).trim(), line.substring(i + 1).trim())
            }
        }
        return header
    }

    async readHttpBody(header?: HttpHeader) {
        const buf = new GBuffer()
        const readBuf = async (len: number) => {
            while (len > 0) {
                const data = await this.read(len)
                if (data !== undefined) {
                    buf.addBuffer(data)
                    len -= data.length
                }
            }
        }
        if (header === undefined) {
            header = await this.readHttpHeader()
        }
        if (header.has('Transfer-Encoding', 'chunked')) {
            while (true) {
                const len = Number.parseInt(await this.readLine(), 16)
                if (len <= 0) {
                    await this.readLine()
                    break
                }
                await readBuf(len)
                await this.readLine()
            }
        } else {
            const length = header.get('Content-Length')
            if (length !== undefined) {
                const len = Number.parseInt(length[0], 10)
                await readBuf(len)
            } else {
                throw 'Unsupported transfer mode'
            }
        }
        return buf.toString(this.encoding)
    }

    async write(chunk: string | Buffer, encoding?: string) {
        this._socket.write(chunk, encoding)
    }

    get url() {
        return `${this.host}:${this.port}`
    }

    async fetch(path: string) {
        //         const req = `GET ${path} HTTP/1.1
        // Host: ${this.url}
        // Connection: keep-alive
        // Cache-Control: max-age=0
        // Upgrade-Insecure-Requests: 1
        // User-Agent: Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/// 71.0.3578.98 Safari/537.36
        // Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8
        // Accept-Encoding: gzip, deflate
        // Accept-Language: zh-CN,zh;q=0.9\n\n`;
        //          this.write(req, this.encoding)

        const request = new HttpRequest(path)
        request
            .addHeader('Host', this.url)
            .addHeader('Connection', 'keep-alive')
            .addHeader('Cache-Control', 'max-age=0')
            .addHeader('Upgrade-Insecure-Requests', '1')
            .addHeader('User-Agent', 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/// 71.0.3578.98 Safari/537.36')
            .addHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8')
            .addHeader('Accept-Encoding', 'gzip, deflate')
            .addHeader('Accept-Language', 'zh-CN,zh;q=0.9')
        await this.write(request.toBuffer())
        return await this.readHttpBody()
    }
}

export class HttpHeader {
    private _entries: Map<string, string[]> = new Map();

    add(key: string, value: string) {
        let values = this._entries.get(key)
        if (values === undefined) {
            values = []
        }
        values.push(value)
        this._entries.set(key, values)
    }

    addAll(header: Map<string, string[]>) {
        header.forEach((values, key) => {
            values.forEach(value => this.add(key, value))
        })
    }

    get(key: string) {
        return this._entries.get(key)
    }

    set(key: string, values: string[]) {
        this._entries.set(key, values)
    }

    has(key: string, value?: string) {
        if (value === undefined) {
            return this._entries.has(key)
        }
        const values = this._entries.get(key)
        if (values !== undefined) {
            return values.some((v) => v === value)
        }
        return false
    }

    get entries() {
        return this._entries
    }
}

export class HttpRequest {
    private _header: HttpHeader = new HttpHeader()
    private _body: GBuffer = new GBuffer()

    constructor(readonly path: string, private _method: string = 'GET', private _encoding: 'utf8' = 'utf8', header?: HttpHeader) {
        if (header !== undefined) {
            this._header.addAll(header.entries)
        }
    }

    addHeader(key: string, value: string) {
        this._header.add(key, value)
        return this
    }

    addBody(chunk: string) {
        this._body.addString(chunk)
    }

    toBuffer() {
        const buf = new GBuffer()
        buf.addString(`${this._method} ${this.path} HTTP/1.1\r\n`, this._encoding)
        this._header.entries.forEach((values, key) => {
            values.forEach((value) => {
                buf.addString(`${key}: ${value}\r\n`, this._encoding)
            })
        })
        if (this._body.length > 0) {
            buf.addString(`content-length: ${this._body.length}\r\n`, this._encoding)
        }
        buf.addString('\r\n')
        if (this._body.length > 0) {
            buf.addBuffer(this._body.buffer)
        }
        return buf.buffer
    }
}