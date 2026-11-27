import {execFile as ef} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

const execute=promisify(ef);
const here='scripts/wompi-sandbox/hosting';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
export const paths=Object.freeze([
  ...['app','docsGate','pageMeta','seo','testGate','wompi-sandbox','wompi-test-pilot'].map(x=>'server/'+x+'.mjs'),
  ...['entry.mjs','host.mjs','static/index.html'].map(x=>here+'/'+x)
]);

export async function bundle({sourceCommit,dest,readSource=path=>readFile(join(repo,path))}){
  if(!/^[a-f0-9]{40}$/.test(sourceCommit??''))throw Error('invalid source identity');
  const buffers=await Promise.all(paths.map(readSource));
  await mkdir(dest);
  for(let i=0;i<paths.length;i++){
    const target=join(dest,paths[i]);
    await mkdir(dirname(target),{recursive:true});
    await writeFile(target,buffers[i],{flag:'wx'});
  }
  await writeFile(join(dest,'package.json'),JSON.stringify({name:'hoy-wompi-isolated-probe',private:true,type:'module',
    engines:{node:'24.22.3'},scripts:{start:'node '+here+'/entry.mjs'}},{},2)+'\n',{flag:'wx'});
  await writeFile(join(dest,here,'static/release.json'),JSON.stringify({version:'wompi-isolated-probe',sourceCommit})+'\n',{flag:'wx'});
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  try{
    const [sourceCommit,out,...rest]=process.argv.slice(2);
    if(rest.length||!out||!/^[a-f0-9]{40}$/.test(sourceCommit??''))throw Error('Usage: node bundle.mjs <full-source-commit> <new-artifact-directory>');
    const git=async(args,encoding='utf8')=>(await execute('git',args,{encoding,cwd:repo,maxBuffer:1024*1024})).stdout;
    if((await git(['rev-parse','--verify','HEAD^{commit}'])).trim()!==sourceCommit)throw Error('requested commit must match the checked out review head');
    const own=await git(['show',sourceCommit+':'+here+'/bundle.mjs'],'buffer');
    if(!own.equals(await readFile(fileURLToPath(import.meta.url))))throw Error('bundle script differs from the reviewed commit');
    await bundle({sourceCommit,dest:resolve(out),readSource:path=>git(['show',sourceCommit+':'+path],'buffer')});
  }catch(err){console.error(err.message);process.exitCode=1;}
}
