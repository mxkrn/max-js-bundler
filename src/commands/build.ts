import { Command, flags as flagDefs } from "@oclif/command";
import { ExitCodes } from "../lib/utils";

import { dirname, isAbsolute, join, normalize } from "path";
import { existsSync, promises } from "fs";
import { isFile, ensureDir } from "../lib/utils";

const { writeFile } = promises;
import { MaxJSCompiler } from "../lib/maxJSCompiler";

const parseCLIPath = (input: string): string => isAbsolute(input) ? input : normalize(join(process.cwd(), input));

export default class Build extends Command {

	static description = "Build and bundle a Project for usage within the [js] or the [jsui] object";

	static examples = [
	];

	static flags = {
		help: flagDefs.help({ "char": "h" }),
		force: flagDefs.boolean({
			"char": "f",
			description: "Force overwrite the output file",
			"default": false,
			hidden: false,
			required: false
		}),
		output: flagDefs.string({
			"char": "o",
			description: "Output generated file",
			hidden: false,
			multiple: false,
			parse: parseCLIPath,
			required: false
		})
	};

	static args = [
		{
			name: "file",
			required: true,
			description: "InputFile",
			hidden: false,
			parse: parseCLIPath
		}
	];

	async run(): Promise<void> {
		const { args, flags } = this.parse(Build);

		let code = "";
		try {
			const compiler: MaxJSCompiler = new MaxJSCompiler({ filepath: args.file });

			await compiler.setup();
			code = await compiler.output();
		} catch (err) {
			return void this.error(`Failed to compile JS Code: ${err.message}`, {
				code: err.code,
				exit: ExitCodes.error
			});
		}

		if (!flags.output) return void process.stdout.write(code);

		if (existsSync(flags.output)) {
			// not a file
			if (!(await isFile(flags.output))) {
				return void this.error(`Output file ${flags.output} can't be overwritten as it doesn't seem to be a file.`, {
					exit: ExitCodes.no_file_overwrite
				});
			}

			// no force remove
			if (!flags.force) {
				return void this.error(`Output file ${flags.output} already exists. Please remove it or use the --force option.`, {
					exit: ExitCodes.no_overwrite
				});
			}
		}

		await ensureDir(dirname(flags.output));
		await writeFile(flags.output, code, { encoding: "utf8", flag: "w" });
	}
}
