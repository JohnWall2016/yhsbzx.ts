import { Socket } from '../../dist/lib/net'
import { HttpRequest, HttpSocket } from '../../dist/lib/http'

async function testSocket() {
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

function testRequest() {
    const request = new HttpRequest('/index.html')
    request
        .addHeader('Host', '124.228.42.248:80')
        .addHeader('Connection', 'keep-alive')
        .addHeader('Cache-Control', 'max-age=0')
        .addHeader('Upgrade-Insecure-Requests', '1')
        .addHeader('User-Agent', 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/// 71.0.3578.98 Safari/537.36')
        .addHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8')
        .addHeader('Accept-Encoding', 'gzip, deflate')
        .addHeader('Accept-Language', 'zh-CN,zh;q=0.9')
    console.log(request.toBuffer().toString())
}

async function testHttp() {
    const http = await HttpSocket.connect('39.156.69.79', 80, /*'gbk'*/) // '124.228.42.248' '104.20.23.46'
    console.log(await http.fetch('/index.html'))
    await http.end()
}

// testSocket()
// testRequest()
testHttp()
