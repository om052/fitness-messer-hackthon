const fs=require('fs');
const p='D:/kurukshetra/src/features/store/useAppStore.ts';
let s=fs.readFileSync(p,'utf8');
s=s.replace(/\u2013/g,'-').replace(/\u2014/g,'-').replace(/\u201C/g,'\"').replace(/\u201D/g,'\"').replace(/\u2018/g,\"'\").replace(/\u2019/g,\"'\");
fs.writeFileSync(p,s);
