export type JsonTransformError = {
  line?: number;
  column?: number;
};

export type JsonTransformResult =
  | { ok: true; value: string }
  | { ok: false; error: JsonTransformError };

const jsonWhitespace = /[\u0020\u0009\u000a\u000d]/;

export function isBlankJsonInput(input: string) {
  return input.trim().length === 0;
}

function positionFromError(error: SyntaxError, input: string): JsonTransformError {
  const lineColumn = error.message.match(/line\s+(\d+)\s+column\s+(\d+)/i);

  if (lineColumn) {
    return { line: Number(lineColumn[1]), column: Number(lineColumn[2]) };
  }

  const position = error.message.match(/position\s+(\d+)/i);

  if (!position) {
    return {};
  }

  const target = Math.min(Number(position[1]), input.length);
  let line = 1;
  let column = 1;

  for (let index = 0; index < target; index += 1) {
    if (input[index] === "\r" && input[index + 1] === "\n") {
      line += 1;
      column = 1;
      index += 1;
    } else if (input[index] === "\r" || input[index] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
}

function validate(input: string): JsonTransformError | null {
  try {
    JSON.parse(input);
    return null;
  } catch (error) {
    return positionFromError(error as SyntaxError, input);
  }
}

function tokenize(input: string) {
  const tokens: string[] = [];
  let index = 0;

  while (index < input.length) {
    const character = input[index];

    if (jsonWhitespace.test(character)) {
      index += 1;
      continue;
    }

    if (character === '"') {
      const start = index;
      index += 1;

      while (index < input.length) {
        if (input[index] === "\\") {
          index += 2;
        } else if (input[index] === '"') {
          index += 1;
          break;
        } else {
          index += 1;
        }
      }

      tokens.push(input.slice(start, index));
      continue;
    }

    if ("{}[],:".includes(character)) {
      tokens.push(character);
      index += 1;
      continue;
    }

    const start = index;
    while (
      index < input.length &&
      !jsonWhitespace.test(input[index]) &&
      !"{}[],:\"".includes(input[index])
    ) {
      index += 1;
    }
    tokens.push(input.slice(start, index));
  }

  return tokens;
}

function transform(input: string, mode: "format" | "minify"): JsonTransformResult {
  if (isBlankJsonInput(input)) {
    return { ok: true, value: input };
  }

  const error = validate(input);
  if (error) {
    return { ok: false, error };
  }

  const tokens = tokenize(input);
  if (mode === "minify") {
    return { ok: true, value: tokens.join("") };
  }

  let depth = 0;
  let output = "";
  const indent = () => "  ".repeat(depth);

  tokens.forEach((token, index) => {
    const previous = tokens[index - 1];
    const next = tokens[index + 1];

    if (token === "{" || token === "[") {
      output += token;
      if (!((token === "{" && next === "}") || (token === "[" && next === "]"))) {
        depth += 1;
        output += `\n${indent()}`;
      }
    } else if (token === "}" || token === "]") {
      const isEmpty =
        (previous === "{" && token === "}") || (previous === "[" && token === "]");
      if (!isEmpty) {
        depth -= 1;
        output += `\n${indent()}`;
      }
      output += token;
    } else if (token === ",") {
      output += `,\n${indent()}`;
    } else if (token === ":") {
      output += ": ";
    } else {
      output += token;
    }
  });

  return { ok: true, value: output };
}

export function formatJson(input: string) {
  return transform(input, "format");
}

export function minifyJson(input: string) {
  return transform(input, "minify");
}
