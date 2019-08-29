import { Socket } from '../../dist/lib/net'

async function test() {
    try {
        const crlf = "\r\n"
        const host = '124.228.42.248'
        const port = 80

        const socket = new Socket()
        socket.setTimeout(5000)

        await socket.connect({ host, port })
        await socket.write(
            `GET /index HTTP/1.1` + crlf + `Host: ${host}:${port}` + crlf + "Connection: close" + crlf + crlf,
        )

        const response = (await socket.readAll()) as Buffer

        if (response) {
            console.info(response.toString())
        }

        await socket.end()
    } catch (e) {
        console.error("Connection error:", e)
    }
}

test()