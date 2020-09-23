"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const loader_utils_1 = __importDefault(require("loader-utils"));
function HelloLoader(source) {
    let loaderContext = this;
    const stringifyRequest = (r) => loader_utils_1.default.stringifyRequest(loaderContext, r);
    const { mode, target, sourceMap, rootContext, resourcePath, resourceQuery } = loaderContext;
    console.log('loader NS:', loaderContext['hello-loader']);
    const options = loader_utils_1.default.getOptions(loaderContext) || {};
    return source;
}
exports.default = HelloLoader;
