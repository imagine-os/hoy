import {build} from './host.mjs';
try{
  const port=Number(process.env.PORT);
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('invalid_port');
  const {server,db,ends}=await build(process.env);
  server.listen(port,'0.0.0.0');
  setTimeout(()=>{server.closeAllConnections();server.close(()=>{db.close();process.exit(0);});},ends-Date.now()).unref();
}catch{console.error('HOY_WOMPI_SANDBOX_CONFIG_REJECTED'); process.exitCode=1;}
