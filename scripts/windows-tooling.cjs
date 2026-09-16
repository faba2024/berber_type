// tsx uses userInfo only to name its temporary directory. Some sandboxed
// Windows accounts cannot resolve that OS record; preserve the environment.
const os=require('node:os');const original=os.userInfo;
os.userInfo=(...args)=>{try{return original(...args)}catch(error){if(error.code!=='ERR_SYSTEM_ERROR')throw error;return {username:process.env.USERNAME||'barber-tooling',homedir:os.homedir(),uid:-1,gid:-1,shell:null}}};
