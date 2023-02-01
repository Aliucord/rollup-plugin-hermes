import { OutputBundle, OutputChunk, OutputOptions, Plugin, SourceMap } from "rollup";
import { access, readFile, unlink, writeFile } from "fs/promises";
import { spawn } from "child_process";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";

export function hermes(options?: { hermesPath?: string }): Plugin {
    options ??= {};
    options.hermesPath ??= join(__dirname, "..", "..", "@aliucord/hermes"); // node_modules/rollup-plugin-hermes/dist/../../@aliucord/hermes
    const { hermesPath } = options;

    return {
        name: "hermes",

        async generateBundle(options: OutputOptions, bundle: OutputBundle) {
            let hermesPathExists;
            try {
                await access(hermesPath);
                hermesPathExists = true;
            } catch {
                hermesPathExists = false;
            }

            if (hermesPath === undefined || !hermesPathExists) {
                this.warn("hermesc not found, skipping hermes plugin");
                return;
            }

            const outFile = options.file?.split("/");
            if (!outFile) return;
            const file = outFile.pop()!;

            const bundleFile = bundle[file] as OutputChunk|undefined;
            if (!bundleFile) return;

            const map: SourceMap = bundleFile.map!;
            const tmpmap = join(tmpdir(), `${randomBytes(8).readUInt32LE(0)}.hermestmp`);
            if (map) {
                await writeFile(tmpmap, map.toString());
            }

            let hermesc = `${hermesPath}/%OS%-bin/hermesc`;
            switch (process.platform) {
                case "win32":
                    hermesc = hermesc.replace("%OS%", "win64");
                    break;
                case "darwin":
                    hermesc = hermesc.replace("%OS%", "osx");
                    break;
                default:
                    hermesc = hermesc.replace("%OS%", "linux64");
            }

            const tempPath = join(tmpdir(), `${randomBytes(8).readUInt32LE(0)}.bundle`)

            const args = ["-Wno-direct-eval", "-Wno-undefined-variable", "--emit-binary", "--out", tempPath];
            if (map) {
                args.push("--source-map");
                args.push(tmpmap);
            }

            await new Promise(
                r => {
                    const process = spawn(hermesc, args, { stdio: "pipe" })
                    process.on("exit", r)
                    
                    process.stdin!.write(bundleFile.code);
                    process.stdin!.end();
                }
            );

            this.emitFile({
                type: "asset",
                fileName: `${file}.bundle`,
                source: await readFile(tempPath)
            })

            if (map) {
                await unlink(tmpmap);
            }
            await unlink(tempPath);
        }
    };
}
