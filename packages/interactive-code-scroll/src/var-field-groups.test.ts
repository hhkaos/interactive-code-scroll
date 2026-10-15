import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { mdxToJs, type MdxToJsResult } from "satteri";
import { describe, expect, it } from "vitest";
import { varFieldGroups } from "./var-field-groups.ts";

const dir = "/tutorials/demo";

/** Compiled MDX, whitespace removed, with each group and field reduced to a marker. */
function compile(source: string, file = join(dir, "tutorial.mdx")): string {
  // The plugin is synchronous, so the result is too.
  const { code } = mdxToJs(source, { fileURL: pathToFileURL(file), mdastPlugins: [varFieldGroups([dir])] }) as MdxToJsResult;
  return code
    .replace(/\s+/g, "")
    .replace(/_jsxs?\(_components\.div,\{className:"var-fields",children:/g, "[group ")
    .replace(/_jsx\(VarField,\{name:"(\w+)"/g, "field $1");
}

const order = (code: string) => code.match(/\[group |field \w+|"More"/g)?.join(" ");

describe("varFieldGroups", () => {
  it("wraps each run of consecutive fields in one group", () => {
    const code = compile(
      [
        '<Step id="a">',
        "",
        '<VarField name="a" label="A" />',
        "",
        '<VarField name="b" label="B" />',
        "",
        "More",
        "",
        '<VarField name="c" label="C" />',
        "",
        "</Step>",
      ].join("\n"),
    );
    expect(order(code)).toBe('[group  field a field b "More" [group  field c');
  });

  it("keeps expression attributes of grouped fields", () => {
    const code = compile(
      ['<VarField name="a" label="A" />', "", '<VarField name="b" label="B" type="select" options={["x", { value: 1 }]} persist />'].join("\n"),
    );
    expect(code).toContain('field b,label:"B",type:"select",options:["x",{value:1}],persist:true');
  });

  it("leaves MDX outside the tutorials alone", () => {
    const code = compile('<VarField name="a" label="A" />', "/elsewhere/page.mdx");
    expect(code).not.toContain("[group");
  });
});
