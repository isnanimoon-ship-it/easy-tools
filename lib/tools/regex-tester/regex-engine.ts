import {MAX_MATCHES,MAX_PATTERN_LENGTH,MAX_REPLACEMENT_LENGTH,MAX_REPLACEMENT_RESULT_LENGTH,MAX_TEXT_LENGTH,type MatchRecord,type RegexRequest,type RegexResponse} from "./protocol";

export function normalizeFlags(flags:string){return [..."gimsuy"].filter(flag=>flags.includes(flag)).join("");}
export function advanceStringIndex(text:string,index:number,unicode:boolean){if(index>=text.length)return index+1;if(!unicode)return index+1;const first=text.charCodeAt(index);if(first<0xd800||first>0xdbff||index+1>=text.length)return index+1;const second=text.charCodeAt(index+1);return second>=0xdc00&&second<=0xdfff?index+2:index+1;}
export function displayLiteral(pattern:string,flags:string){return`/${pattern.replaceAll("/","\\/")}/${normalizeFlags(flags)}`;}

export function executeRegex(request:RegexRequest):RegexResponse{
 const{requestId,pattern,text,replacement}=request;const flags=normalizeFlags(request.flags);
 if(pattern.length>MAX_PATTERN_LENGTH)return{requestId,status:"limit-error",code:"pattern-too-long"};
 if(text.length>MAX_TEXT_LENGTH)return{requestId,status:"limit-error",code:"text-too-long"};
 if(replacement.length>MAX_REPLACEMENT_LENGTH)return{requestId,status:"limit-error",code:"replacement-too-long"};
 let regex:RegExp;try{regex=new RegExp(pattern,flags);}catch(error){return{requestId,status:"syntax-error",message:error instanceof Error?error.message:"Invalid regular expression"};}
 try{
  const matches:MatchRecord[]=[];let truncated=false;
  while(true){const match=regex.exec(text);if(!match)break;matches.push({value:match[0],start:match.index,end:match.index+match[0].length,captures:match.slice(1).map(value=>value??null),named:Object.fromEntries(Object.entries(match.groups??{}).map(([key,value])=>[key,value??null])),zeroLength:match[0].length===0});if(!regex.global)break;if(matches.length>=MAX_MATCHES){truncated=true;break;}if(match[0]==="")regex.lastIndex=advanceStringIndex(text,regex.lastIndex,regex.unicode);}
  const replaceRegex=new RegExp(pattern,flags);const replaced=text.replace(replaceRegex,replacement);const replacementTooLarge=replaced.length>MAX_REPLACEMENT_RESULT_LENGTH;
  return{requestId,status:"success",matches,truncated,replacement:replacementTooLarge?null:replaced,replacementChanged:replaced!==text,replacementTooLarge};
 }catch(error){return{requestId,status:"runtime-error",message:error instanceof Error?error.message:"Regular expression execution failed"};}
}
