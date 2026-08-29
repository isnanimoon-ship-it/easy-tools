import{describe,expect,it}from"vitest";
import{advanceStringIndex,displayLiteral,executeRegex,normalizeFlags}from"./regex-engine";
import{MAX_MATCHES,type RegexSuccess}from"./protocol";
const run=(pattern:string,flags:string,text:string,replacement="")=>executeRegex({requestId:1,pattern,flags,text,replacement}) as RegexSuccess;
describe("regex engine",()=>{
 it("normalizes supported flags and literals",()=>{expect(normalizeFlags("yggixm")).toBe("gimxy".replace("x",""));expect(displayLiteral("a/b","ig")).toBe("/a\\/b/gi");});
 it.each([
  ["hello","g","hello world",["hello"]],
  ["test","g","test test test",["test","test","test"]],
  ["hello","gi","Hello HELLO hello",["Hello","HELLO","hello"]],
  ["^.+$","gm","one\ntwo",["one","two"]],
  ["a.b","gs","a\nb",["a\nb"]],
  ["こんにちは","g","こんにちは 안녕",["こんにちは"]],
  ["😀","gu","x😀y",["😀"]],
 ])("matches native values for %s / %s",(pattern,flags,text,values)=>{const result=run(pattern,flags,text);expect(result.matches.map(item=>item.value)).toEqual(values);const native=[...text.matchAll(new RegExp(pattern,flags.includes("g")?flags:flags+"g"))].map(item=>item[0]);expect(result.matches.map(item=>item.value)).toEqual(native);});
 it("honors non-global and sticky behavior",()=>{expect(run("a","","a a").matches).toHaveLength(1);expect(run("a","gy","aa a").matches.map(item=>item.start)).toEqual([0,1]);expect(run("a","y"," a").matches).toHaveLength(0);});
 it("returns capture, optional and named groups",()=>{const result=run("(?<year>\\d{4})-(\\d{2})(?:-(\\d{2}))?","g","2026-08");expect(result.matches[0]).toMatchObject({value:"2026-08",start:0,end:7,captures:["2026","08",null],named:{year:"2026"}});});
 it.each(["^","$","\\b","(?=a)",""])("advances zero-length global matches for %s",pattern=>{const result=run(pattern,"g","a");expect(result.matches.length).toBeGreaterThan(0);expect(result.matches.length).toBeLessThanOrEqual(2);});
 it("advances Unicode surrogate pairs as code points",()=>{expect(advanceStringIndex("😀",0,false)).toBe(1);expect(advanceStringIndex("😀",0,true)).toBe(2);expect(run("(?:)","gu","😀").matches.map(item=>item.start)).toEqual([0,2]);});
 it.each(["[abc","*","(?<bad"])("returns syntax errors for %s",pattern=>expect(executeRegex({requestId:1,pattern,flags:"g",text:"",replacement:""}).status).toBe("syntax-error"));
 it("uses native replacement tokens and global semantics",()=>{expect(run("(\\d{4})-(\\d{2})-(\\d{2})","g","2026-08-29","$1/$2/$3").replacement).toBe("2026/08/29");expect(run("(?<year>\\d{4})","g","2026","$<year>!").replacement).toBe("2026!");expect(run("a","g","a a","[$&]").replacement).toBe("[a] [a]");expect(run("a","","a a","x").replacement).toBe("x a");});
 it("caps match collection",()=>{const result=run("(?=a)","g","a".repeat(MAX_MATCHES+5));expect(result.matches).toHaveLength(MAX_MATCHES);expect(result.truncated).toBe(true);});
 it("enforces input limits",()=>{expect(executeRegex({requestId:1,pattern:"a".repeat(10001),flags:"g",text:"",replacement:""})).toMatchObject({status:"limit-error",code:"pattern-too-long"});expect(executeRegex({requestId:1,pattern:"",flags:"g",text:"a".repeat(500001),replacement:""})).toMatchObject({status:"limit-error",code:"text-too-long"});});
 it("accepts the exact test text boundary",()=>{expect(run("z","g","a".repeat(500000)).status).toBe("success");});
 it("rejects oversized replacements and suppresses oversized replacement output",()=>{expect(executeRegex({requestId:1,pattern:"a",flags:"g",text:"a",replacement:"x".repeat(100001)})).toMatchObject({status:"limit-error",code:"replacement-too-long"});const result=run("a","g","a".repeat(500000),"12345");expect(result.replacementTooLarge).toBe(true);expect(result.replacement).toBeNull();});
});
