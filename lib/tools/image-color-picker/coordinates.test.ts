import { describe, expect, it } from "vitest";
import { clientPointToPixel, isValidPixelCoordinate } from "./coordinates";
describe("coordinates", () => {
  it("maps scaled center to original pixels", () => expect(clientPointToPixel(310, 220, {left:10,top:20,width:600,height:400}, 2400, 1600)).toEqual({x:1200,y:800}));
  it("clamps all edges", () => { expect(clientPointToPixel(-1,-1,{left:0,top:0,width:100,height:100},100,100)).toEqual({x:0,y:0}); expect(clientPointToPixel(100,100,{left:0,top:0,width:100,height:100},100,100)).toEqual({x:99,y:99}); });
  it("rejects invalid dimensions and coordinates", () => { expect(clientPointToPixel(0,0,{left:0,top:0,width:0,height:1},1,1)).toBeNull(); expect(isValidPixelCoordinate(1.2,0,2,2)).toBe(false); expect(isValidPixelCoordinate(1,1,2,2)).toBe(true); });
});
