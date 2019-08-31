export class GrowableBuffer {
    private _size: number
    private _offset: number
    private _buffer: Buffer

    constructor(initalSize: number = 1024) {
        this._size = initalSize
        this._offset = 0
        this._buffer = Buffer.alloc(initalSize)
    }

    /**
     * Add a string to this buffer.
     * @param {string} data 
     */
    addString(data: string, encoding: BufferEncoding = 'utf8') {
        let size = this._offset + Buffer.byteLength(data, encoding)
        if (size > this._size) {
            this._grow(size)
        }
        this._offset += this._buffer.write(data, this._offset, encoding)
    }

    /**
     * Add a uint8 to this buffer.
     * @param {number} data 
     */
    addUInt8(data: number) {
        let size = this._offset + 1
        if (size > this._size) {
            this._grow(size)
        }
        this._offset = this._buffer.writeUInt8(data, this._offset)
    }

    /**
     * Add a buffer to this buffer.
     * @param {Buffer} data 
     */
    addBuffer(data: Buffer) {
        let size = this._offset + data.length
        if (size > this._size) {
            this._grow(size)
        }
        this._offset += data.copy(this._buffer, this._offset, 0)
    }

    private _grow(size: number) {
        let newSize = this._size
        while (newSize < size) newSize *= 2
        if (newSize > this._size) {
            let newBuffer = Buffer.alloc(newSize)
            this._buffer.copy(newBuffer, 0, 0, this._offset)
            this._buffer = newBuffer
            this._size = newBuffer.length
        }
    }

    /**
     * Convert to a string.
     * @param {string} encoding default: 'utf8'
     * @returns {string}
     */
    toString(encoding: string = 'utf8'): string {
        return this._buffer.toString(encoding, 0, this._offset)
    }

    get length() {
        return this._offset
    }

    get buffer() {
        return this._buffer
    }
}