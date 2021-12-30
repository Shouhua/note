1. rollup中chunk的参数：
```js
{
  code: string,                  // the generated JS code
  dynamicImports: string[],      // external modules imported dynamically by the chunk
  exports: string[],             // exported variable names
  facadeModuleId: string | null, // the id of a module that this chunk corresponds to
  fileName: string,              // the chunk file name
  implicitlyLoadedBefore: string[]; // entries that should only be loaded after this chunk
	// external modules imported statically by the chunk
	// 比如模块foo，有2个模块都用了，默认会抽取出来成为单独的chunk，main.js的chunk信息中会出现以下2项
	// imports: ['foo-123.js']
  imports: string[],             
	// imported bindings per dependency 同上面的imports，如果绑定了导出项比如，foo变成了f，就会出现在这里
	// importedBindings: { 'foo-123.js': ['f']}
  importedBindings: {[imported: string]: string[]} 
  isDynamicEntry: boolean,       // is this chunk a dynamic entry point
  isEntry: boolean,              // is this chunk a static entry point
  isImplicitEntry: boolean,      // should this chunk only be loaded after other chunks
  map: string | null,            // sourcemaps if present
	// information about the modules in this chunk
	// 依赖模块，包括自己
  modules: {                     
    [id: string]: {
      renderedExports: string[]; // exported variable names that were included
      removedExports: string[];  // exported variable names that were removed
      renderedLength: number;    // the length of the remaining code in this module
      originalLength: number;    // the original length of the code in this module
      code: string | null;       // remaining code in this module
    };
  },
  name: string                   // the name of this chunk as used in naming patterns
  referencedFiles: string[]      // files referenced via import.meta.ROLLUP_FILE_URL_<id>
  type: 'chunk',                 // signifies that this is a chunk
}
```
2. this.emitFile如果emit chunk，在buildStart中是没有问题的，如果emit asset，整个步骤都可以