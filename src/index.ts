import { Plugin, SourceMap } from "rollup";
import { existsSync, unlinkSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";

export function hermes(options?: { hermesPath: string }): Plugin {
    const { hermesPath } = options ?? { hermesPath: "node_modules/hermes-engine" };

    return {
        name: "hermes",

        writeBundle(options, bundle) {
            if (!existsSync(hermesPath)) {
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
            const tmpmap = `${path}/${map.file}.hermestmp`;
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

            const args = ["--emit-binary", "--out", `${path}/${file}.bundle`, options.file!];
            if (map) {
                args.push("--source-map");
                args.push(tmpmap);
            }

            spawnSync(hermesc, args, { stdio: "inherit" });
            unlinkSync(tmpmap);
        }
    };
}
