import swiftQuery from "./queries/swift";
import kotlinQuery from "./queries/kotlin";
import goQuery from "./queries/go";
import javascriptQuery from "./queries/javascript";
import typescriptQuery from "./queries/typescript";
import pythonQuery from "./queries/python";
import javaQuery from "./queries/java";
import cSharpQuery from "./queries/c-sharp";
import cQuery from "./queries/c";
import cppQuery from "./queries/cpp";
import phpQuery from "./queries/php";
import rubyQuery from "./queries/ruby";
import rustQuery from "./queries/rust";

export function getLanguageParserQuery(languageId: string): string | undefined {
	switch (languageId) {
		case "swift":
			return swiftQuery;
		case "kotlin":
			return kotlinQuery;
		case "go":
			return goQuery;
		case "javascript":
			return javascriptQuery;
		case "typescript":
			return typescriptQuery;
		case "python":
			return pythonQuery;
		case "java":
			return javaQuery;
		case "csharp":
			return cSharpQuery;
		case "c":
			return cQuery;
		case "cpp":
			return cppQuery;
		case "php":
			return phpQuery;
		case "ruby":
			return rubyQuery;
		case "rust":
			return rustQuery;
		default:
			return undefined;
	}
}