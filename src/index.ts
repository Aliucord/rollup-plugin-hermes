import { Plugin, SourceMap } from "rollup";
import { existsSync, unlinkSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";
import { join } from "path";

export function hermes(options?: { hermesPath?: string }): Plugin {
    options ??= {};
    options.hermesPath ??= join(__dirname, "..", "..", "hermes-engine"); // node_modules/rollup-plugin-hermes/dist/../../hermes-engine
    const { hermesPath } = options;

    return {
        name: "hermes",

        writeBundle(options, bundle) {
            if (hermesPath === undefined || !existsSync(hermesPath)) {
                this.warn("hermes-engine not found, skipping hermes plugin");
                return;
            }

            const outFile = options.file?.split("/");
            if (!outFile) return;
            const file = outFile.pop()!;
            const path = outFile.join("/");

            const bundleFile = bundle[file];
            if (!bundleFile) return;

            const map: SourceMap = (bundleFile as any).map;
            const tmpmap = `${path}/${map?.file}.hermestmp`;
            if (map) {
                writeFileSync(tmpmap, map.toString());
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

            const args = ["-Wno-direct-eval", "-Wno-undefined-variable", "--emit-binary", "--out", `${path}/${file}.bundle`, options.file!];
            if (map) {
                args.push("--source-map");
                args.push(tmpmap);
            }

            spawnSync(hermesc, args, { stdio: "inherit" });

            if (map) {
                unlinkSync(tmpmap);
            }
        }
    };
}
