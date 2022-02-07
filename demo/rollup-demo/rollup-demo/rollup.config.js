export default {
    input: 'src/index.js',
    output: {
        dir: 'dist',
        format: 'es'
    },
    plugins: [
       testPlugin() 
    ]
};

function testPlugin() {
    return {
        name: 'test',
        generateBundle(options, bundle) {
            bundle['abc'] = {
                name: 'abc',
                isAsset: true,
                type: 'asset',
                fileName: 'abc.css',
                source: `.red{color:red;;;;}`
            }
        }
    }
}