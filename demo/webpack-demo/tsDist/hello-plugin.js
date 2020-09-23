"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const id = 'hello-loader-plugin';
const NS = 'hello-loader';
class HelloPlugin {
    apply(compiler) {
        compiler.hooks.compilation.tap(id, compilation => {
            console.log('id: ', id);
            compilation.hooks.normalModuleLoader.tap(id, (loaderContext) => {
                loaderContext[NS] = true;
            });
            compilation.hooks.buildModule.tap(id, (module) => {
                console.log(module.userRequest);
            });
        });
    }
}
exports.default = HelloPlugin;
HelloPlugin.NS = NS;
