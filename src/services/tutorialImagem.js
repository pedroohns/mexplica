const { limites } = require('../../public/js/tutorial/contrato');

// Lê as dimensões do arquivo real, sem confiar no MIME ou metadados do cliente.
function dimensoes(buffer, tipo) {
    if (tipo === 'image/png' && buffer.length >= 33
        && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        && buffer.toString('ascii', 12, 16) === 'IHDR') {
        return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
    }
    if (tipo === 'image/jpeg' && buffer[0] === 255 && buffer[1] === 216) {
        let pos = 2;
        while (pos + 4 < buffer.length) {
            if (buffer[pos++] !== 255) return null;
            while (buffer[pos] === 255) pos++;
            if (pos + 3 > buffer.length) return null;
            const marcador = buffer[pos++];
            if (marcador === 218 || marcador === 217) break;
            const tamanho = buffer.readUInt16BE(pos);
            if (tamanho < 2 || pos + tamanho > buffer.length) return null;
            if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marcador) && tamanho >= 7) {
                return [buffer.readUInt16BE(pos + 5), buffer.readUInt16BE(pos + 3)];
            }
            pos += tamanho;
        }
    }
    if (tipo === 'image/webp' && buffer.length >= 30
        && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
        const formato = buffer.toString('ascii', 12, 16);
        if (formato === 'VP8X') return [1 + buffer.readUIntLE(24, 3), 1 + buffer.readUIntLE(27, 3)];
        if (formato === 'VP8 ' && buffer[23] === 157 && buffer[24] === 1 && buffer[25] === 42) {
            return [buffer.readUInt16LE(26) & 16383, buffer.readUInt16LE(28) & 16383];
        }
        if (formato === 'VP8L' && buffer[20] === 47) {
            const bits = buffer.readUInt32LE(21);
            return [(bits & 16383) + 1, ((bits >>> 14) & 16383) + 1];
        }
    }
    return null;
}

function validarImagemSerializada(url) {
    const limite = limites.imagem;
    if (typeof url !== 'string' || url.length > Math.ceil(limite.saidaBytes / 3) * 4 + 40) {
        throw new Error('Imagem grande demais: o limite após processamento é 72 KB.');
    }
    const partes = url.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!partes) throw new Error('Formato de imagem não aceito. Use JPEG, PNG ou WebP.');
    const buffer = Buffer.from(partes[2], 'base64');
    if (buffer.toString('base64') !== partes[2]) throw new Error('Não foi possível validar a imagem.');
    if (buffer.length > limite.saidaBytes) throw new Error('Imagem grande demais: o limite após processamento é 72 KB.');
    const tamanho = dimensoes(buffer, partes[1]);
    if (!tamanho) throw new Error('Não foi possível validar a imagem. Escolha outro arquivo JPEG, PNG ou WebP.');
    if (Math.min(...tamanho) < limite.minimo) throw new Error('Imagem pequena demais: use pelo menos 120 × 120 pixels.');
    if (Math.max(...tamanho) > limite.saidaMaxima) throw new Error('Imagem grande demais: reduza para até 1600 pixels por lado.');
    return url;
}

module.exports = { validarImagemSerializada };
