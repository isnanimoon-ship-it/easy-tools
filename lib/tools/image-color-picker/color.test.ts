import { describe, expect, it } from "vitest";
import { formatColorValues } from "./color";
describe("color conversion", () => {
  it.each([
    [{r:255,g:0,b:0,a:255}, ["#FF0000","rgb(255, 0, 0)","hsl(0, 100%, 50%)","hsv(0, 100%, 100%)","cmyk(0%, 100%, 100%, 0%)"]],
    [{r:0,g:255,b:0,a:255}, ["#00FF00","rgb(0, 255, 0)","hsl(120, 100%, 50%)","hsv(120, 100%, 100%)","cmyk(100%, 0%, 100%, 0%)"]],
    [{r:0,g:0,b:255,a:255}, ["#0000FF","rgb(0, 0, 255)","hsl(240, 100%, 50%)","hsv(240, 100%, 100%)","cmyk(100%, 100%, 0%, 0%)"]],
    [{r:0,g:0,b:0,a:255}, ["#000000","rgb(0, 0, 0)","hsl(0, 0%, 0%)","hsv(0, 0%, 0%)","cmyk(0%, 0%, 0%, 100%)"]],
    [{r:255,g:255,b:255,a:255}, ["#FFFFFF","rgb(255, 255, 255)","hsl(0, 0%, 100%)","hsv(0, 0%, 100%)","cmyk(0%, 0%, 0%, 0%)"]],
    [{r:51,g:37,b:36,a:128}, ["#33252480","rgba(51, 37, 36, 0.502)","hsla(4, 17%, 17%, 0.502)","hsva(4, 29%, 20%, 0.502)","cmyk(0%, 27%, 29%, 80%)"]],
  ] as const)("formats known value", (rgba, values) => expect(Object.values(formatColorValues(rgba))).toEqual(values));
});
