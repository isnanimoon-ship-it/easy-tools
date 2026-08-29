/// <reference lib="webworker" />
import {executeRegex} from "./regex-engine";
import type {RegexRequest} from "./protocol";
self.onmessage=(event:MessageEvent<RegexRequest>)=>{self.postMessage(executeRegex(event.data));};
export {};
