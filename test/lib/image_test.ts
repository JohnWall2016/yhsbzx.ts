import * as image from '../../dist/lib/image'
import * as fs from 'fs'
import * as path from 'path'

function testZoom(dir: string) {
    const outDir = path.join(dir, 'zoom')
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir)
    }
    const files = fs.readdirSync(dir)
    for (const file of files) {
        if (!file.match(/\.(jpg)$/i)) continue
        console.log(file)
        fs.writeFileSync(
            path.join(outDir, file),
            image.zoom(
                'image/jpeg',
                fs.readFileSync(path.join(dir, file)),
                0.5
            )
        )
    }
}

//testImage('D:\\单位事务\\平安建设\\IMG_2438.JPG')
testZoom('D:\\单位事务\\平安建设\\20190830')