# rollup-plugin-hermes
Rollup plugin to compile code using hermesc

### Usage
Just add hermes() to plugins:
```js
export default defineConfig({
    // ...
    plugins: [
        hermes()
    ]
});
```

You need to install a compatible package that contains the official hermesc binary such as `@aliucord/hermesc`.
If you are not using the one mentioned above, you need to pass in the `hermesPath` option to the plugin pointing to the package path on disk.
