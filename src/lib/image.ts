import * as canvas from 'canvas'

type ImageType = 'image/png' | 'image/jpeg'

export function zoom(toBufferType: ImageType, image: Buffer, ratio: number): Buffer
export function zoom(toBufferType: ImageType, image: Buffer, horizontalRatio: number, vertialRatio?: number): Buffer {
    const img = new canvas.Image()
    img.src = image
    const width = img.width * horizontalRatio
    const height = img.height * (vertialRatio || horizontalRatio)
    const pdf = new canvas.Canvas(width, height)
    const ctx = pdf.getContext('2d')
    ctx.drawImage(img, 0, 0, width, height)
    return pdf.toBuffer(toBufferType as any)
}