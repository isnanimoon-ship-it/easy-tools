"use client";

import {Fragment,useCallback,useEffect,useRef,useState} from "react";
import {Check,Clipboard,Play,Plus,RotateCcw,Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {summarizeBatchResponse,type BatchCaseResult} from "@/lib/tools/regex-tester/batch-summary";
import {displayLiteral,normalizeFlags} from "@/lib/tools/regex-tester/regex-engine";
import {MAX_DETAIL_MATCHES,MAX_HIGHLIGHT_MATCHES,MAX_PATTERN_LENGTH,MAX_REPLACEMENT_LENGTH,MAX_TEXT_LENGTH,type MatchRecord,type RegexResponse,type RegexSuccess} from "@/lib/tools/regex-tester/protocol";
import {createRegexWorker} from "@/lib/tools/regex-tester/worker-client";

type BatchCase={id:string;text:string};
function makeId(){return crypto.randomUUID?.()??`${Date.now()}-${Math.random()}`;}
function runCase(pattern:string,flags:string,text:string):Promise<RegexResponse|{status:"timeout"}>{
 return new Promise(resolve=>{
  const worker=createRegexWorker();
  const timeout=setTimeout(()=>{worker.terminate();resolve({status:"timeout"});},1000);
  worker.onmessage=(event:MessageEvent<RegexResponse>)=>{clearTimeout(timeout);worker.terminate();resolve(event.data);};
  worker.onerror=()=>{clearTimeout(timeout);worker.terminate();resolve({requestId:0,status:"runtime-error"});};
  worker.postMessage({requestId:0,pattern,flags:normalizeFlags(flags),text,replacement:""});
 });
}

type Flag="g"|"i"|"m"|"s"|"u"|"y";
type ErrorCode="pattern-too-long"|"text-too-long"|"replacement-too-long"|"replacement-too-large"|"regex-timeout"|"worker-error"|"copy-failed";
export type RegexTesterLabels={
 pattern:string;patternHelp:string;flags:string;flagDescriptions:Record<Flag,string>;test:string;testHelp:string;replacement:string;replacementHelp:string;valid:string;running:string;noMatch:string;matches:string;firstOnly:string;global:string;preview:string;previewEmpty:string;details:string;detailsEmpty:string;value:string;index:string;groups:string;namedGroups:string;unmatched:string;zeroLength:string;truncated:string;detailsTruncated:string;highlightTruncated:string;replacePreview:string;unchanged:string;
 run:string;clear:string;copyPattern:string;copyLiteral:string;copyReplacement:string;copied:string;examples:string;exampleHint:string;exampleLabels:Record<"email"|"number"|"date"|"url"|"phone",string>;errors:Record<ErrorCode,string>;
 batch:{title:string;help:string;addRow:string;removeRow:string;placeholder:string;matched:string;notMatched:string;matchCount:string;captures:string;timeout:string;empty:string};
};
const flagOrder:Flag[]=["g","i","m","s","u","y"];
const examples={email:{pattern:"\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b",flags:"g"},number:{pattern:"\\d+",flags:"g"},date:{pattern:"(\\d{4})-(\\d{2})-(\\d{2})",flags:"g"},url:{pattern:"https?://[^\\s]+",flags:"g"},phone:{pattern:"01[016789]-?\\d{3,4}-?\\d{4}",flags:"g"}} as const;

export function RegexTester({labels}:{labels:RegexTesterLabels}){
 const patternRef=useRef<HTMLInputElement>(null),workerRef=useRef<Worker|null>(null),timeoutRef=useRef<ReturnType<typeof setTimeout>|null>(null),requestId=useRef(0),copyTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [pattern,setPattern]=useState(""),[flags,setFlags]=useState("g"),[text,setText]=useState(""),[replacement,setReplacement]=useState(""),[touched,setTouched]=useState(false),[state,setState]=useState<"idle"|"debouncing"|"running"|"success"|"error"|"timeout">("idle"),[response,setResponse]=useState<RegexResponse|null>(null),[localError,setLocalError]=useState<ErrorCode|null>(null),[copied,setCopied]=useState<string|null>(null);
 const [batchCases,setBatchCases]=useState<BatchCase[]>([]),[batchResults,setBatchResults]=useState<Record<string,BatchCaseResult|"pending">>({});
 const batchGeneration=useRef(0);
 const stopWorker=useCallback(()=>{if(timeoutRef.current){clearTimeout(timeoutRef.current);timeoutRef.current=null;}if(workerRef.current){workerRef.current.terminate();workerRef.current=null;}},[]);
 const invalidate=useCallback(()=>{requestId.current++;stopWorker();setResponse(null);setLocalError(null);setState("debouncing");setTouched(true);},[stopWorker]);
 useEffect(()=>()=>{stopWorker();if(copyTimer.current)clearTimeout(copyTimer.current);},[stopWorker]);
 const run=useCallback((force=false)=>{if(!touched&&!force)return;stopWorker();if(pattern.length>MAX_PATTERN_LENGTH){setLocalError("pattern-too-long");setState("error");return;}if(text.length>MAX_TEXT_LENGTH){setLocalError("text-too-long");setState("error");return;}if(replacement.length>MAX_REPLACEMENT_LENGTH){setLocalError("replacement-too-long");setState("error");return;}const id=++requestId.current;const worker=createRegexWorker();workerRef.current=worker;setState("running");setResponse(null);setLocalError(null);worker.onmessage=(event:MessageEvent<RegexResponse>)=>{if(event.data.requestId!==id)return;if(timeoutRef.current)clearTimeout(timeoutRef.current);timeoutRef.current=null;worker.terminate();workerRef.current=null;setResponse(event.data);setState(event.data.status==="success"?"success":"error");if(event.data.status==="success"&&event.data.replacementTooLarge)setLocalError("replacement-too-large");};worker.onerror=()=>{if(requestId.current!==id)return;stopWorker();setLocalError("worker-error");setState("error");};worker.postMessage({requestId:id,pattern,flags:normalizeFlags(flags),text,replacement});timeoutRef.current=setTimeout(()=>{if(requestId.current!==id)return;worker.terminate();workerRef.current=null;timeoutRef.current=null;setResponse(null);setLocalError("regex-timeout");setState("timeout");},1000);},[flags,pattern,replacement,stopWorker,text,touched]);
 useEffect(()=>{if(!touched)return;const timer=setTimeout(run,300);return()=>clearTimeout(timer);},[flags,pattern,replacement,run,text,touched]);

 const runBatch=useCallback(async()=>{
  const generation=++batchGeneration.current;
  const cases=batchCases;
  if(!cases.length)return;
  setBatchResults(previous=>{const next={...previous};for(const testCase of cases)next[testCase.id]="pending";return next;});
  const results=await Promise.all(cases.map(async testCase=>({id:testCase.id,summary:summarizeBatchResponse(await runCase(pattern,flags,testCase.text))})));
  if(batchGeneration.current!==generation)return;
  setBatchResults(previous=>{const next={...previous};for(const result of results)next[result.id]=result.summary;return next;});
 },[batchCases,flags,pattern]);
 useEffect(()=>{if(!batchCases.length)return;const timer=setTimeout(()=>{void runBatch();},300);return()=>clearTimeout(timer);},[batchCases,flags,pattern,runBatch]);
 function addBatchCase(){setBatchCases(previous=>[...previous,{id:makeId(),text:""}]);}
 function updateBatchCase(id:string,value:string){setBatchCases(previous=>previous.map(testCase=>testCase.id===id?{...testCase,text:value}:testCase));}
 function removeBatchCase(id:string){setBatchCases(previous=>previous.filter(testCase=>testCase.id!==id));setBatchResults(previous=>{const next={...previous};delete next[id];return next;});}
 function change(setter:(value:string)=>void,value:string){invalidate();setter(value);}
 function toggle(flag:Flag){invalidate();setFlags(current=>current.includes(flag)?current.replace(flag,""):normalizeFlags(current+flag));}
 function clear(){requestId.current++;stopWorker();batchGeneration.current++;setPattern("");setFlags("g");setText("");setReplacement("");setTouched(false);setResponse(null);setLocalError(null);setState("idle");setBatchCases([]);setBatchResults({});patternRef.current?.focus();}
 async function copy(kind:string,value:string){try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(value);setCopied(kind);if(copyTimer.current)clearTimeout(copyTimer.current);copyTimer.current=setTimeout(()=>setCopied(null),1500);}catch{setLocalError("copy-failed");}}
 const success=response?.status==="success"?response:null;
 const errorMessage=localError?labels.errors[localError]:response&&response.status!=="success"?(response.status==="syntax-error"?response.message:response.message??labels.errors["worker-error"]):null;
 return <section className="space-y-6">
  <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6"><label htmlFor="regex-pattern" className="text-lg font-bold">{labels.pattern}</label><p id="pattern-help" className="mt-1 text-sm text-[var(--text-muted)]">{labels.patternHelp}</p><div className="mt-3 flex min-w-0 items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] focus-within:ring-4 focus-within:ring-[var(--focus-ring)]"><span aria-hidden="true" className="pl-3 font-mono text-[var(--text-muted)]">/</span><input ref={patternRef} id="regex-pattern" aria-describedby="pattern-help" value={pattern} onChange={e=>change(setPattern,e.target.value)} spellCheck={false} className="min-h-12 min-w-0 flex-1 px-2 font-mono outline-none"/><span aria-hidden="true" className="pr-3 font-mono text-[var(--text-muted)]">/{flags}</span></div>
   <fieldset className="mt-5"><legend className="font-bold">{labels.flags}</legend><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{flagOrder.map(flag=><label key={flag} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] p-3"><input type="checkbox" checked={flags.includes(flag)} onChange={()=>toggle(flag)} className="size-4 accent-blue-600"/><code className="font-bold">{flag}</code><span className="text-sm text-[var(--text-muted)]">{labels.flagDescriptions[flag]}</span></label>)}</div></fieldset>
   <div className="mt-5 flex flex-wrap gap-2"><Button onClick={()=>{setTouched(true);run(true)}}><Play aria-hidden="true" size={17}/>{labels.run}</Button><Button variant="secondary" onClick={clear}><RotateCcw aria-hidden="true" size={17}/>{labels.clear}</Button><CopyButton label={labels.copyPattern} copied={copied==="pattern"} labels={labels} onClick={()=>copy("pattern",pattern)}/><CopyButton label={labels.copyLiteral} copied={copied==="literal"} labels={labels} onClick={()=>copy("literal",displayLiteral(pattern,flags))}/></div>
  </section>
   <div className="grid min-w-0 gap-6 lg:grid-cols-2"><section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><label htmlFor="regex-test" className="text-lg font-bold">{labels.test}</label><p id="test-help" className="mt-1 text-sm text-[var(--text-muted)]">{labels.testHelp}</p><textarea id="regex-test" aria-describedby="test-help" value={text} onChange={e=>change(setText,e.target.value)} spellCheck={false} className="mt-3 min-h-72 w-full resize-y rounded-xl border border-[var(--border)] p-4 font-mono text-sm leading-6 focus:ring-4 focus:ring-[var(--focus-ring)]"/></section><section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><h2 className="text-lg font-bold">{labels.details}</h2><Status state={state} success={success} labels={labels}/>{errorMessage?<p role="alert" className="mt-3 break-words rounded-xl bg-[var(--error-bg)] p-3 text-sm font-semibold text-[var(--error-fg)]">{errorMessage}</p>:null}{success?<MatchDetails result={success} globalMode={flags.includes("g")} labels={labels}/>:null}</section></div>
  <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><h2 className="text-lg font-bold">{labels.preview}</h2>{success?<Highlight text={text} matches={success.matches} labels={labels}/>:<p className="mt-3 text-sm text-[var(--text-muted)]">{labels.previewEmpty}</p>}</section>
  <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><h2 className="text-lg font-bold">{labels.batch.title}</h2><p className="mt-1 text-sm text-[var(--text-muted)]">{labels.batch.help}</p>
   {batchCases.length===0?<p className="mt-3 text-sm text-[var(--text-muted)]">{labels.batch.empty}</p>:<div className="mt-4 space-y-2">{batchCases.map(testCase=><BatchRow key={testCase.id} testCase={testCase} result={batchResults[testCase.id]} onChange={value=>updateBatchCase(testCase.id,value)} onRemove={()=>removeBatchCase(testCase.id)} labels={labels}/>)}</div>}
   <Button variant="secondary" onClick={addBatchCase} className="mt-4"><Plus aria-hidden="true" size={17}/>{labels.batch.addRow}</Button>
  </section>
  <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><label htmlFor="regex-replacement" className="text-lg font-bold">{labels.replacement}</label><p id="replacement-help" className="mt-1 text-sm text-[var(--text-muted)]">{labels.replacementHelp}</p><input id="regex-replacement" value={replacement} onChange={e=>change(setReplacement,e.target.value)} aria-describedby="replacement-help" className="mt-3 min-h-12 w-full rounded-xl border border-[var(--border)] px-3 font-mono focus:ring-4 focus:ring-[var(--focus-ring)]"/><h3 className="mt-5 font-bold">{labels.replacePreview}</h3><pre className="mt-2 max-h-80 min-h-20 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[var(--surface-muted)] p-4 text-sm">{success?.replacement??"—"}</pre>{success?.replacement!==null?<div className="mt-3 flex items-center gap-3"><CopyButton label={labels.copyReplacement} copied={copied==="replacement"} labels={labels} onClick={()=>copy("replacement",success?.replacement??"")}/>{success&&!success.replacementChanged?<span className="text-sm text-[var(--text-muted)]">{labels.unchanged}</span>:null}</div>:null}</section>
  <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><h2 className="text-lg font-bold">{labels.examples}</h2><p className="mt-1 text-sm text-[var(--text-muted)]">{labels.exampleHint}</p><div className="mt-3 flex flex-wrap gap-2">{(Object.keys(examples) as Array<keyof typeof examples>).map(key=><button key={key} type="button" onClick={()=>{invalidate();setPattern(examples[key].pattern);setFlags(examples[key].flags)}} className="min-h-11 rounded-xl border border-[var(--border)] px-3 font-semibold hover:bg-[var(--surface-muted)]">{labels.exampleLabels[key]}</button>)}</div></section>
 </section>;
}
function Status({state,success,labels}:{state:string;success:RegexSuccess|null;labels:RegexTesterLabels}){if(state==="idle")return null;if(state==="debouncing"||state==="running")return <p role="status" className="mt-3 font-semibold text-[var(--info-fg)]">{labels.running}</p>;if(success)return <p role="status" className="mt-3 flex items-center gap-2 font-semibold text-[var(--success-fg)]"><Check aria-hidden="true" size={17}/>{labels.valid} · {success.truncated?"10,000+":success.matches.length} {labels.matches}</p>;return null;}
function MatchDetails({result,globalMode,labels}:{result:RegexSuccess;globalMode:boolean;labels:RegexTesterLabels}){if(!result.matches.length)return <p className="mt-3 text-sm text-[var(--text-muted)]">{labels.noMatch}</p>;return <div className="mt-4 space-y-3"><p className="text-sm text-[var(--text-muted)]">{globalMode?labels.global:labels.firstOnly}</p>{result.truncated?<p className="rounded-xl bg-[var(--warning-bg)] p-3 text-sm text-[var(--warning-fg)]">{labels.truncated}</p>:null}{result.matches.slice(0,MAX_DETAIL_MATCHES).map((match,index)=><article key={`${match.start}-${index}`} className="min-w-0 rounded-xl border border-[var(--border)] p-3"><h3 className="font-bold">Match #{index+1}</h3><dl className="mt-2 grid gap-2 text-sm"><Info name={labels.value} value={match.zeroLength?labels.zeroLength:match.value}/><Info name={labels.index} value={`${match.start} – ${match.end}`}/></dl>{match.captures.length?<GroupList title={labels.groups} entries={match.captures.map((value,i)=>[String(i+1),value])} unmatched={labels.unmatched}/>:null}{Object.keys(match.named).length?<GroupList title={labels.namedGroups} entries={Object.entries(match.named)} unmatched={labels.unmatched}/>:null}</article>)}{result.matches.length>MAX_DETAIL_MATCHES?<p className="text-sm text-[var(--text-muted)]">{labels.detailsTruncated}</p>:null}</div>}
function Highlight({text,matches,labels}:{text:string;matches:MatchRecord[];labels:RegexTesterLabels}){if(!matches.length)return <pre className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-[var(--surface-muted)] p-4 text-sm">{text}</pre>;const shown=matches.slice(0,MAX_HIGHLIGHT_MATCHES);let cursor=0;const nodes:React.ReactNode[]=[];shown.forEach((match,index)=>{if(match.start>cursor)nodes.push(<Fragment key={`t-${index}`}>{text.slice(cursor,match.start)}</Fragment>);nodes.push(match.zeroLength?<span key={`m-${index}`} className="mx-0.5 inline-block rounded bg-amber-200 px-1 text-xs font-bold dark:bg-amber-700 dark:text-white" aria-label={`${labels.zeroLength} ${index+1}`}>#{index+1}</span>:<mark key={`m-${index}`} className="rounded bg-yellow-200 text-slate-950 dark:bg-yellow-700 dark:text-white">{match.value}</mark>);cursor=Math.max(cursor,match.end);});nodes.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);return <><pre className="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[var(--surface-muted)] p-4 text-sm leading-6">{nodes}</pre>{matches.length>MAX_HIGHLIGHT_MATCHES?<p className="mt-2 text-sm text-[var(--text-muted)]">{labels.highlightTruncated}</p>:null}</>}
function GroupList({title,entries,unmatched}:{title:string;entries:Array<[string,string|null]>;unmatched:string}){return <div className="mt-3"><h4 className="text-xs font-bold uppercase text-[var(--text-muted)]">{title}</h4><dl className="mt-1 grid gap-1">{entries.map(([name,value])=><div key={name} className="grid min-w-0 grid-cols-[minmax(3rem,auto)_1fr] gap-2 text-sm"><dt className="font-semibold">{name}</dt><dd className="break-words font-mono">{value??unmatched}</dd></div>)}</dl></div>}
function Info({name,value}:{name:string;value:string}){return <div className="min-w-0"><dt className="text-xs font-bold text-[var(--text-muted)]">{name}</dt><dd className="break-words font-mono">{value}</dd></div>}
function CopyButton({label,copied,labels,onClick}:{label:string;copied:boolean;labels:RegexTesterLabels;onClick:()=>void}){return <Button variant="secondary" onClick={onClick}><Clipboard aria-hidden="true" size={16}/>{copied?labels.copied:label}</Button>}
function BatchRow({testCase,result,onChange,onRemove,labels}:{testCase:{id:string;text:string};result:BatchCaseResult|"pending"|undefined;onChange:(value:string)=>void;onRemove:()=>void;labels:RegexTesterLabels}){
 return <div className="min-w-0 rounded-xl border border-[var(--border)] p-3">
  <div className="flex min-w-0 items-center gap-2">
   <input value={testCase.text} onChange={e=>onChange(e.target.value)} placeholder={labels.batch.placeholder} spellCheck={false} aria-label={labels.batch.placeholder} className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--border)] px-3 font-mono text-sm focus:ring-4 focus:ring-[var(--focus-ring)]"/>
   <button type="button" onClick={onRemove} aria-label={labels.batch.removeRow} className="inline-grid size-11 shrink-0 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--error-bg)] hover:text-[var(--error-fg)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]"><Trash2 aria-hidden="true" size={18}/></button>
  </div>
  <BatchRowStatus result={result} labels={labels}/>
 </div>;
}
function BatchRowStatus({result,labels}:{result:BatchCaseResult|"pending"|undefined;labels:RegexTesterLabels}){
 if(!result)return null;
 if(result==="pending")return <p role="status" className="mt-2 text-sm text-[var(--text-muted)]">{labels.running}</p>;
 if(result.status==="timeout")return <p role="alert" className="mt-2 text-sm font-semibold text-[var(--error-fg)]">{labels.batch.timeout}</p>;
 if(result.status==="error")return <p role="alert" className="mt-2 break-words text-sm font-semibold text-[var(--error-fg)]">{result.message}</p>;
 const namedEntries=Object.entries(result.firstNamed);
 return <div className="mt-2">
  <p className={`flex items-center gap-2 text-sm font-semibold ${result.matched?"text-[var(--success-fg)]":"text-[var(--text-muted)]"}`}>
   {result.matched?<Check aria-hidden="true" size={16}/>:null}
   {result.matched?labels.batch.matched:labels.batch.notMatched}
   {result.matched&&result.matchCount>1?<span className="font-normal text-[var(--text-muted)]"> · {labels.batch.matchCount.replace("__COUNT__",String(result.matchCount))}</span>:null}
  </p>
  {result.matched&&result.firstCaptures.length?<GroupList title={labels.batch.captures} entries={result.firstCaptures.map((value,i)=>[String(i+1),value])} unmatched={labels.unmatched}/>:null}
  {result.matched&&namedEntries.length?<GroupList title={labels.namedGroups} entries={namedEntries} unmatched={labels.unmatched}/>:null}
 </div>;
}
