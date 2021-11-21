import fs from 'fs';

export default {
    input: 'src/index.js',
    output: {
        dir: 'dist',
        format: 'es'
    },
    plugins: [
        copyAndWatch('index.html', 'index.html')
    ]
};

function copyAndWatch(fileIn, fileOut) {
    return {
        name: 'copy-and-watch',
        async buildStart() {
            this.addWatchFile(fileIn);
        },
        async generateBundle() {
            this.emitFile({
                type: 'asset',
                fileName: fileOut,
                source: fs.readFileSync(fileIn)
            });
        }
    }
}