export type EncodedCandidate={blob:Blob;quality:number};
export async function searchTarget(encode:(quality:number)=>Promise<Blob>,targetBytes:number,maxIterations=10,onProgress?:(current:number,max:number)=>void):Promise<{candidate:EncodedCandidate|null;iterations:number}> {
  let low=.1,high=1,candidate:EncodedCandidate|null=null,iterations=0;
  while(iterations<maxIterations&&high-low>=.01){const quality=Math.round((low+high)/2*100)/100;iterations++;onProgress?.(iterations,maxIterations);const blob=await encode(quality);if(blob.size<=targetBytes){if(!candidate||quality>candidate.quality||(quality===candidate.quality&&blob.size>candidate.blob.size))candidate={blob,quality};low=quality;}else high=quality;}
  if(!candidate){iterations++;onProgress?.(Math.min(iterations,maxIterations),maxIterations);const blob=await encode(.1);if(blob.size<=targetBytes)candidate={blob,quality:.1};}
  return{candidate,iterations:Math.min(iterations,maxIterations)};
}
