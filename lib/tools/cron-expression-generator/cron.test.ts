import{describe,expect,it}from"vitest";
import{DEFAULT_SETTINGS,buildCrontabLine,describeCron,escapeCrontabPercent,generateCron,nextRuns,settingsFromCron,validateCron,type DescriptionLabels}from"./cron";
const labels:DescriptionLabels={everyMinute:"every minute",everyNMinutes:n=>`every ${n} minutes`,hourlyAt:m=>`hourly ${m}`,everyNHours:(n,m)=>`${n} hours ${m}`,dailyAt:time=>`daily ${time}`,weeklyAt:(days,time)=>`${days} ${time}`,monthlyAt:(dates,time)=>`${dates} ${time}`,specificDate:(months,dates,time)=>`${months} ${dates} ${time}`,custom:"custom",orSuffix:"OR",weekdays:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]};
describe("cron validation",()=>{
 it.each(["* * * * *","*/5 * * * *","0 * * * *","0 9 * * *","30 18 * * *","0 9 * * 1","0 9 * * 1-5","0 0 1 * *","0 0 1 1 *","0 9 1,15 * *","0 9 * 1,6,12 *","*/10 9-18 * * 1-5","1-10/2 * * * *"])("accepts %s",value=>expect(validateCron(value).valid).toBe(true));
 it.each([["60 * * * *","minute"],["0 24 * * *","hour"],["0 0 32 * *","dayOfMonth"],["0 0 1 13 *","month"],["0 0 * * 8","dayOfWeek"]])("rejects range %s",(value,field)=>expect(validateCron(value)).toMatchObject({valid:false,error:{code:"range",field}}));
 it.each(["0 9 * *","0 9 * * * extra"])("rejects wrong field count",value=>expect(validateCron(value)).toMatchObject({valid:false,error:{code:"field-count"}}));
 it("treats empty as neutral and normalizes spaces",()=>{expect(validateCron("   ")).toEqual({valid:false,empty:true});expect(validateCron(" 0   9  * *  * ")).toMatchObject({valid:true,normalized:"0 9 * * *"});});
 it.each(["*/0 * * * *","10-1 * * * *","1,,2 * * * *","? * * * *","L * * * *","@daily","0 0 0 * * *"])("rejects unsupported syntax %s",value=>expect(validateCron(value).valid).toBe(false));
 it("marks DOM and DOW as OR",()=>expect(validateCron("0 9 1 * 1")).toMatchObject({valid:true,domDowOr:true}));
});
describe("generation and next runs",()=>{
 it("round trips a weekly schedule",()=>{const expression=generateCron({...DEFAULT_SETTINGS,mode:"weekly",hour:9,minute:0,days:[1]});expect(expression).toBe("0 9 * * 1");const parsed=validateCron(expression);expect(parsed.valid&&settingsFromCron(parsed)).toMatchObject({mode:"weekly",hour:9,minute:0,days:[1]});});
 it("expands a weekday range for generator synchronization",()=>{const parsed=validateCron("0 9 * * 1-5");expect(parsed.valid&&settingsFromCron(parsed)).toMatchObject({mode:"weekly",days:[1,2,3,4,5]});});
 it("expands weekday ranges in human descriptions",()=>{const parsed=validateCron("0 9 * * 1-5");expect(parsed.valid&&describeCron(parsed,labels)).toBe("Monday, Tuesday, Wednesday, Thursday, Friday 09:00");});
 it("keeps complex expressions custom",()=>expect(validateCron("*/10 9-18 * * 1-5")).toMatchObject({valid:true,mode:"custom"}));
 it("calculates deterministic Asia/Seoul and UTC runs",()=>{const reference=new Date("2026-08-28T23:00:00Z");expect(nextRuns("0 9 * * *","Asia/Seoul",1,reference)[0].toISOString()).toBe("2026-08-29T00:00:00.000Z");expect(nextRuns("0 9 * * *","UTC",1,reference)[0].toISOString()).toBe("2026-08-29T09:00:00.000Z");});
 it("treats weekday 0 and 7 as Sunday",()=>{const reference=new Date("2026-08-29T00:00:00Z");expect(nextRuns("0 9 * * 0","Asia/Seoul",1,reference)[0].toISOString()).toBe(nextRuns("0 9 * * 7","Asia/Seoul",1,reference)[0].toISOString());});
 it("uses OR for DOM and DOW",()=>expect(nextRuns("0 9 1 * 1","Asia/Seoul",3,new Date("2026-08-28T23:00:00Z")).map(d=>d.toISOString())).toEqual(["2026-08-31T00:00:00.000Z","2026-09-01T00:00:00.000Z","2026-09-07T00:00:00.000Z"]));
 it("caps requested runs at 20",()=>expect(nextRuns("* * * * *","UTC",100,new Date("2026-01-01T00:00:00Z"))).toHaveLength(20));
 it("handles a New York DST gap deterministically",()=>expect(nextRuns("30 2 * * *","America/New_York",3,new Date("2026-03-07T06:00:00Z")).map(date=>date.toISOString())).toEqual(["2026-03-07T07:30:00.000Z","2026-03-08T07:30:00.000Z","2026-03-09T06:30:00.000Z"]));
});
describe("crontab line",()=>{
 it("leaves a command without % untouched",()=>expect(escapeCrontabPercent("/usr/bin/backup.sh --day=daily")).toBe("/usr/bin/backup.sh --day=daily"));
 it("escapes a bare % used for strftime formatting",()=>expect(escapeCrontabPercent("/usr/bin/backup.sh $(date +%Y-%m-%d)")).toBe("/usr/bin/backup.sh $(date +\\%Y-\\%m-\\%d)"));
 it("joins expression and escaped command with a single space",()=>expect(buildCrontabLine("0 9 * * *","/usr/bin/backup.sh")).toBe("0 9 * * * /usr/bin/backup.sh"));
 it("escapes % inside the combined crontab line",()=>expect(buildCrontabLine("0 9 * * *","echo 50% done")).toBe("0 9 * * * echo 50\\% done"));
});
