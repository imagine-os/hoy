import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({base:'./',cacheDir:'.vite-drawer-keyboard',plugins:[react()],optimizeDeps:{entries:['scripts/drawer-keyboard-harness.html']},server:{host:'127.0.0.1',port:5697,strictPort:true}});
