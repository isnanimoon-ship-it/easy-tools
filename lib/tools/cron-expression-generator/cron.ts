import { Cron } from "croner";

export const FIELD_DEFINITIONS = [
  { key: "minute", min: 0, max: 59 },
  { key: "hour", min: 0, max: 23 },
  { key: "dayOfMonth", min: 1, max: 31 },
  { key: "month", min: 1, max: 12 },
  { key: "dayOfWeek", min: 0, max: 7 },
] as const;
export type FieldKey = (typeof FIELD_DEFINITIONS)[number]["key"];
export type GeneratorMode = "every-minute"|"every-n-minutes"|"hourly"|"every-n-hours"|"daily"|"weekly"|"monthly"|"specific-date"|"custom";
export type CronErrorCode = "too-long"|"field-count"|"syntax"|"range"|"range-order"|"step"|"no-next-run";
export type CronError = {code:CronErrorCode;field?:FieldKey;token?:string;min?:number;max?:number};
export type ValidationResult = {valid:true;normalized:string;fields:Record<FieldKey,string>;mode:GeneratorMode;domDowOr:boolean}|{valid:false;empty:boolean;error?:CronError};

function checkNumber(value:string,min:number,max:number):number|undefined {if(!/^\d+$/.test(value))return;const number=Number(value);return number>=min&&number<=max?number:undefined;}
function validateItem(item:string,min:number,max:number):CronError|undefined {
  const [base,...steps]=item.split("/");
  if(steps.length>1||!base)return {code:"syntax",token:item};
  let span=max-min+1;
  if(base!=="*"){
    const range=base.split("-");
    if(range.length>2)return {code:"syntax",token:item};
    const start=checkNumber(range[0],min,max);if(start===undefined)return /^\d+$/.test(range[0])?{code:"range",token:range[0],min,max}:{code:"syntax",token:item};
    if(range.length===2){const end=checkNumber(range[1],min,max);if(end===undefined)return /^\d+$/.test(range[1])?{code:"range",token:range[1],min,max}:{code:"syntax",token:item};if(start>end)return {code:"range-order",token:item};span=end-start+1;}else span=1;
  }
  if(steps.length){const step=checkNumber(steps[0],1,max);if(step===undefined)return {code:"step",token:steps[0],min:1,max};if(base!=="*"&&step>span)return {code:"step",token:steps[0],min:1,max:span};}
  return;
}
function inferMode([minute,hour,dom,month,dow]:string[]):GeneratorMode {
  if([minute,hour,dom,month,dow].join(" ")==="* * * * *")return "every-minute";
  if(/^\*\/\d+$/.test(minute)&&hour==="*"&&dom==="*"&&month==="*"&&dow==="*")return "every-n-minutes";
  if(/^\d+$/.test(minute)&&hour==="*"&&dom==="*"&&month==="*"&&dow==="*")return "hourly";
  if(/^\d+$/.test(minute)&&/^\*\/\d+$/.test(hour)&&dom==="*"&&month==="*"&&dow==="*")return "every-n-hours";
  if(/^\d+$/.test(minute)&&/^\d+$/.test(hour)&&dom==="*"&&month==="*"&&dow==="*")return "daily";
  if(/^\d+$/.test(minute)&&/^\d+$/.test(hour)&&dom==="*"&&month==="*"&&dow!=="*")return "weekly";
  if(/^\d+$/.test(minute)&&/^\d+$/.test(hour)&&dom!=="*"&&month==="*"&&dow==="*")return "monthly";
  if(/^\d+$/.test(minute)&&/^\d+$/.test(hour)&&dom!=="*"&&month!=="*"&&dow==="*")return "specific-date";
  return "custom";
}
export function validateCron(input:string):ValidationResult {
  if(input.length>1000)return {valid:false,empty:false,error:{code:"too-long"}};
  const trimmed=input.trim();if(!trimmed)return {valid:false,empty:true};const parts=trimmed.split(/\s+/);
  if(parts.length!==5)return {valid:false,empty:false,error:{code:"field-count"}};
  for(let index=0;index<parts.length;index++){const definition=FIELD_DEFINITIONS[index];const items=parts[index].split(",");if(items.some(item=>!item))return {valid:false,empty:false,error:{code:"syntax",field:definition.key,token:parts[index]}};for(const item of items){const error=validateItem(item,definition.min,definition.max);if(error)return {valid:false,empty:false,error:{...error,field:definition.key}};}}
  const [minute,hour,dayOfMonth,month,dayOfWeek]=parts;return {valid:true,normalized:parts.join(" "),fields:{minute,hour,dayOfMonth,month,dayOfWeek},mode:inferMode(parts),domDowOr:dayOfMonth!=="*"&&dayOfWeek!=="*"};
}

export type GeneratorSettings={mode:GeneratorMode;minute:number;hour:number;interval:number;days:number[];months:number[];dates:number[]};
export const DEFAULT_SETTINGS:GeneratorSettings={mode:"every-minute",minute:0,hour:9,interval:5,days:[1],months:[1],dates:[1]};
const list=(values:number[])=>[...new Set(values)].sort((a,b)=>a-b).join(",");
export function generateCron(settings:GeneratorSettings):string {const m=settings.minute,h=settings.hour,n=settings.interval;switch(settings.mode){case"every-minute":return"* * * * *";case"every-n-minutes":return`*/${n} * * * *`;case"hourly":return`${m} * * * *`;case"every-n-hours":return`${m} */${n} * * *`;case"daily":return`${m} ${h} * * *`;case"weekly":return`${m} ${h} * * ${list(settings.days)}`;case"monthly":return`${m} ${h} ${list(settings.dates)} * *`;case"specific-date":return`${m} ${h} ${list(settings.dates)} ${list(settings.months)} *`;default:return"* * * * *";}}
function expandSimpleValues(raw:string):number[]|null {const result:number[]=[];for(const item of raw.split(",")){if(item.includes("/"))return null;const bounds=item.split("-").map(Number);if(bounds.some(Number.isNaN)||bounds.length>2)return null;if(bounds.length===1)result.push(bounds[0]);else for(let value=bounds[0];value<=bounds[1];value++)result.push(value);}return[...new Set(result)];}
export function settingsFromCron(result:Extract<ValidationResult,{valid:true}>):GeneratorSettings|null {const p=result.normalized.split(" ");const base={...DEFAULT_SETTINGS,mode:result.mode};switch(result.mode){case"every-n-minutes":return{...base,interval:Number(p[0].slice(2))};case"hourly":return{...base,minute:Number(p[0])};case"every-n-hours":return{...base,minute:Number(p[0]),interval:Number(p[1].slice(2))};case"daily":return{...base,minute:Number(p[0]),hour:Number(p[1])};case"weekly":{const days=expandSimpleValues(p[4]);return days?{...base,minute:Number(p[0]),hour:Number(p[1]),days}:null;}case"monthly":{const dates=expandSimpleValues(p[2]);return dates?{...base,minute:Number(p[0]),hour:Number(p[1]),dates}:null;}case"specific-date":{const dates=expandSimpleValues(p[2]),months=expandSimpleValues(p[3]);return dates&&months?{...base,minute:Number(p[0]),hour:Number(p[1]),dates,months}:null;}case"every-minute":return base;default:return null;}}

export type DescriptionLabels={everyMinute:string;everyNMinutes:(n:string)=>string;hourlyAt:(m:string)=>string;everyNHours:(n:string,m:string)=>string;dailyAt:(time:string)=>string;weeklyAt:(days:string,time:string)=>string;monthlyAt:(dates:string,time:string)=>string;specificDate:(months:string,dates:string,time:string)=>string;custom:string;orSuffix:string;weekdays:string[]};
const time=(h:string,m:string)=>`${h.padStart(2,"0")}:${m.padStart(2,"0")}`;
export function describeCron(result:Extract<ValidationResult,{valid:true}>,labels:DescriptionLabels):string {const f=result.fields;let value:string;switch(result.mode){case"every-minute":value=labels.everyMinute;break;case"every-n-minutes":value=labels.everyNMinutes(f.minute.slice(2));break;case"hourly":value=labels.hourlyAt(f.minute);break;case"every-n-hours":value=labels.everyNHours(f.hour.slice(2),f.minute);break;case"daily":value=labels.dailyAt(time(f.hour,f.minute));break;case"weekly":{const expanded=expandSimpleValues(f.dayOfWeek);value=expanded?labels.weeklyAt([...new Set(expanded.map(day=>day===7?0:day))].map(day=>labels.weekdays[day]).join(", "),time(f.hour,f.minute)):labels.custom;break;}case"monthly":value=labels.monthlyAt(f.dayOfMonth,time(f.hour,f.minute));break;case"specific-date":value=labels.specificDate(f.month,f.dayOfMonth,time(f.hour,f.minute));break;default:value=labels.custom;}return result.domDowOr?`${value} ${labels.orSuffix}`:value;}

export function isTimeZoneSupported(timeZone:string):boolean {try{new Intl.DateTimeFormat("en",{timeZone}).format();return true;}catch{return false;}}
export function getBrowserTimeZone():string {const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;return zone&&isTimeZoneSupported(zone)?zone:"UTC";}
export function nextRuns(expression:string,timeZone:string,count:number,referenceDate=new Date()):Date[]{const valid=validateCron(expression);if(!valid.valid)throw new Error("INVALID_CRON");if(!isTimeZoneSupported(timeZone))throw new Error("INVALID_TIMEZONE");try{return new Cron(valid.normalized,{paused:true,timezone:timeZone,domAndDow:false}).nextRuns(Math.min(20,Math.max(1,count)),referenceDate);}catch{throw new Error("NO_NEXT_RUN");}}
export function formatRun(date:Date,timeZone:string,locale:string):string{return new Intl.DateTimeFormat(locale,{timeZone,year:"numeric",month:"2-digit",day:"2-digit",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23",timeZoneName:"short"}).format(date);}

export const PRESETS=["* * * * *","*/5 * * * *","*/10 * * * *","*/30 * * * *","0 * * * *","0 0 * * *","0 9 * * *","0 9 * * 1","0 0 1 * *","0 9 * * 1-5"] as const;
