export function createRegexWorker(){return new Worker(new URL("./regex-worker.ts",import.meta.url),{type:"module",name:"regex-tester"});}
