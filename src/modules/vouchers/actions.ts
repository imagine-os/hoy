import {voucherErrorKey} from './availability';
import {useEffect,useRef,useState} from 'react';
import {useData} from '../../data/DataContext';
import {useSession} from '../../auth/SessionProvider';
import type {VoucherCommand} from '../../data/vouchers';
export function useVoucherActions() {
  const data = useData(); const { user, role } = useSession();
  const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [error, setError] = useState<string|null>(null);
  const live=useRef({data,actorId:user.id,role,mounted:true});
  live.current={data,actorId:user.id,role,mounted:true};
  useEffect(()=>{live.current.mounted=true;return()=>{live.current.mounted=false;};},[]);
  useEffect(()=>{lock.current=false;setBusy(false);setError(null);},[data,user.id,role]);
  const current=()=>live.current.mounted&&live.current.data===data&&live.current.actorId===user.id&&live.current.role===role;
  async function run(command: Omit<VoucherCommand, 'requestId' | 'actorId' | 'role'> | Record<string, unknown>) {
    if (!current() || lock.current) return null;
    lock.current = true; setBusy(true); setError(null);
    try {
      if (!data.voucher) throw new Error('Unavailable');
      const result=await data.voucher({ ...command, requestId: crypto.randomUUID(), actorId: user.id, role } as VoucherCommand);
      return current()?result:null;
    } catch(e) { if(current())setError(voucherErrorKey(e)); return null; }
    finally { if(current()){lock.current = false; setBusy(false);} }
  }
  return { run, busy, error };
}
