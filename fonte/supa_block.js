const SB = window.supabase.createClient('__URL__','__KEY__',{auth:{persistSession:true,autoRefreshToken:true}});
function erroSB(e){ const c=String(e&&e.code||''); return {code:(c==='42501'||/row-level security|permission/i.test((e&&e.message)||''))?'invalid_argument':'unavailable', message:e&&e.message}; }
function bancoSupabase(){ return { collection(nome){ return {
  doc(id){ return {
    set: async data=>{ const {error}=await SB.from(nome).upsert({id:String(id),data}); if(error) throw erroSB(error); },
    delete: async()=>{ const {error}=await SB.from(nome).delete().eq('id',String(id)); if(error) throw erroSB(error); } }; },
  onSnapshot(next,erro){ let linhas=new Map(), vivo=true;
    const emitir=()=>{ if(vivo) next({docs:[...linhas.values()].map(r=>({id:r.id,data:()=>r.data})),metadata:{fromCache:false}}); };
    const carregar=async()=>{ let todas=[],de=0; for(;;){ const {data,error}=await SB.from(nome).select('id,data').range(de,de+999); if(error){ erro&&erro(erroSB(error)); return; } todas=todas.concat(data); if(data.length<1000) break; de+=1000; }
      linhas=new Map(todas.map(r=>[r.id,r])); emitir(); };
    const canal=SB.channel('rt-'+nome).on('postgres_changes',{event:'*',schema:'public',table:nome},p=>{
        if(p.eventType==='DELETE'){ if(p.old&&p.old.id!=null) linhas.delete(p.old.id); } else if(p.new){ linhas.set(p.new.id,{id:p.new.id,data:p.new.data}); }
        emitir(); }).subscribe(st=>{ if(st==='SUBSCRIBED') carregar(); });
    carregar();
    return ()=>{ vivo=false; SB.removeChannel(canal); }; } }; } }; }

// ---------- login ----------
function mostrarLogin(msg,erro){ $('loginBox').hidden=false; if(msg) $('loginInfo').textContent=msg; $('loginErro').hidden=!erro; $('loginErro').textContent=erro||''; setTimeout(()=>$('loginEmail').focus(),50); }
function traduzAuth(e){ const m=(e&&e.message)||''; if(/Invalid login/i.test(m)) return 'E-mail ou senha incorretos. Se é seu primeiro acesso, clique em "Primeiro acesso".';
  if(/not confirmed/i.test(m)) return 'Este e-mail ainda não foi liberado. Peça ao administrador da calculadora.'; if(/already registered/i.test(m)) return 'Este e-mail já tem senha. Use "Entrar".';
  if(/Password should be/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.'; if(/rate limit/i.test(m)) return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'; return 'Não consegui entrar: '+m; }
$('loginForm').onsubmit=async e=>{ e.preventDefault(); $('btnEntrar').disabled=true;
  const {data,error}=await SB.auth.signInWithPassword({email:$('loginEmail').value.trim().toLowerCase(),password:$('loginSenha').value});
  $('btnEntrar').disabled=false; if(error) return mostrarLogin(null,traduzAuth(error)); iniciarComSessao(data.session); };
$('btnPrimeiro').onclick=async()=>{ const email=$('loginEmail').value.trim().toLowerCase(), senha=$('loginSenha').value;
  if(!email||senha.length<6) return mostrarLogin(null,'Preencha o e-mail liberado e uma senha de pelo menos 6 caracteres.');
  $('btnPrimeiro').disabled=true; const {data,error}=await SB.auth.signUp({email,password:senha}); $('btnPrimeiro').disabled=false;
  if(error) return mostrarLogin(null,traduzAuth(error));
  if(data.session) return iniciarComSessao(data.session);
  const r=await SB.auth.signInWithPassword({email,password:senha}); if(r.data&&r.data.session) return iniciarComSessao(r.data.session);
  mostrarLogin(null,'Senha criada, mas este e-mail ainda não está liberado. Peça ao administrador pra liberar e depois clique em "Entrar".'); };
$('btnSair').onclick=async()=>{ await SB.auth.signOut(); location.reload(); };

let sessaoIniciada=false;
async function iniciarComSessao(session){ if(sessaoIniciada) return;
  const {data:membro,error}=await SB.rpc('is_membro');
  if(error||!membro){ await SB.auth.signOut(); return mostrarLogin(null,'Seu e-mail ainda não está liberado nesta calculadora. Peça acesso ao administrador.'); }
  sessaoIniciada=true; $('loginBox').hidden=true; $('userEmail').textContent=session.user.email;
  const {data:adm}=await SB.rpc('is_admin'); ST.admin=!!adm; $('tabAcessos').hidden=!ST.admin; if(ST.admin) assinarMembros();
  ligarBanco(bancoSupabase()); }

async function conectarBanco(){ ST.modo='db'; setSync('','Conectando…');
  const {data:{session}}=await SB.auth.getSession();
  if(!session) return mostrarLogin(); iniciarComSessao(session); }

function ligarBanco(db){
  ST.db=db; ST.modo='db'; ST.podeEscrever=true;
  produtos=[]; historico=[]; contasExtra=[]; parametros={}; aposDados();
  const pend=new Set(['produtos','simulacoes','contas','parametros']);
  const timer=setTimeout(()=>{ if(pend.size) setSync('warn','O banco ainda não respondeu. Os dados podem estar desatualizados.'); },10000);
  const pronto=(nome,snap)=>{ if(!snap.metadata.fromCache && pend.delete(nome) && !pend.size){ clearTimeout(timer); ST.carregado=true; aposDados(); aplicarMarketingPadrao(); render();
      setSync('ok','Dados compartilhados · sincronizado'); oferecerMigracao(); } };
  const falhou=e=>{ clearTimeout(timer); setSync('bad','Não consegui ler o banco. Recarregue a página.'); };
  db.collection('produtos').onSnapshot(snap=>{ produtos=snap.docs.map(d=>({...d.data()})); produtos.forEach(p=>{ if(!p.cliente) p.cliente='Sem conta'; }); aposDados(); pronto('produtos',snap); },falhou);
  db.collection('simulacoes').onSnapshot(snap=>{ historico=snap.docs.map(d=>({...d.data()})); renderHist(); pronto('simulacoes',snap); },falhou);
  db.collection('contas').onSnapshot(snap=>{ contasExtra=snap.docs.map(d=>d.data().nome).filter(Boolean); aposDados(); pronto('contas',snap); },falhou);
  db.collection('parametros').onSnapshot(snap=>{ const m={}; snap.docs.forEach(d=>{ const v={...d.data()}; const k=v.conta||d.id; delete v.conta; m[k]=v; }); parametros=m; if(document.activeElement?.closest?.('#tab-param')==null) aplicarGlobais(); render(); pronto('parametros',snap); },falhou);
}

// ---------- acessos (admin) ----------
let membros=[];
async function carregarMembros(){ const {data,error}=await SB.from('membros').select('email,admin,criado_em,todas_contas,contas').order('email'); if(!error){ membros=data; renderMembros(); } }
function assinarMembros(){ carregarMembros(); SB.channel('rt-membros').on('postgres_changes',{event:'*',schema:'public',table:'membros'},carregarMembros).subscribe(); }
function contasCell(m){
  if(m.admin) return '<span class="note">Todas (administrador)</span>';
  const sel=new Set(m.contas||[]); const resumo=m.todas_contas?'Todas as contas':(sel.size?`${sel.size} conta(s)`:'Nenhuma conta');
  return `<details class="ckl"><summary class="${!m.todas_contas&&!sel.size?'nenhuma':''}">${resumo}</summary><div class="ckbox">
    <label class="chk"><input type="checkbox" data-mtodas="${esc(m.email)}" ${m.todas_contas?'checked':''}> <b>Todas as contas</b> (inclui as novas)</label>
    ${contas.length?contas.map(c=>`<label class="chk"><input type="checkbox" data-mconta="${esc(m.email)}" value="${esc(c)}" ${sel.has(c)||m.todas_contas?'checked':''} ${m.todas_contas?'disabled':''}> ${esc(c)}</label>`).join(''):'<span class="note">Nenhuma conta cadastrada ainda.</span>'}
  </div></details>`; }
const abertos=new Set();
function renderMembros(){ const eu=$('userEmail').textContent.toLowerCase();
  $('membrosBody').querySelectorAll('details.ckl[open]').forEach(d=>abertos.add(d.dataset.email));
  $('membrosBody').innerHTML=membros.map(m=>`<tr><td>${esc(m.email)}${m.email===eu?' <span class="chip">você</span>':''}</td><td>${m.admin?'<span class="chip ok">Administrador</span>':'<span class="chip">Usuário</span>'}</td><td>${contasCell(m)}</td><td>${new Date(m.criado_em).toLocaleDateString('pt-BR')}</td><td>${m.email===eu?'':`<button class="btn sm" data-madm="${esc(m.email)}">${m.admin?'Tirar admin':'Tornar admin'}</button> <button class="btn sm danger" data-mdel="${esc(m.email)}">Remover acesso</button>`}</td></tr>`).join('');
  $('membrosBody').querySelectorAll('details.ckl').forEach((d,i)=>{ const em=d.querySelector('input')?.dataset.mtodas; d.dataset.email=em||''; if(abertos.has(em)) d.open=true; d.ontoggle=()=>{ if(d.open) abertos.add(em); else abertos.delete(em); }; });
  $('membrosBody').querySelectorAll('[data-mdel]').forEach(b=>b.onclick=async()=>{ if(!b.dataset.confirm){ b.dataset.confirm='1'; b.textContent='Confirmar remoção'; return; }
    const {error}=await SB.from('membros').delete().eq('email',b.dataset.mdel); if(error) notificar('Não consegui remover: '+error.message); else { notificar('Acesso removido.'); carregarMembros(); } });
  $('membrosBody').querySelectorAll('[data-madm]').forEach(b=>b.onclick=async()=>{ const m=membros.find(x=>x.email===b.dataset.madm);
    const {error}=await SB.from('membros').update({admin:!m.admin}).eq('email',m.email); if(error) notificar('Não consegui alterar: '+error.message); else carregarMembros(); });
  $('membrosBody').querySelectorAll('[data-mtodas]').forEach(i=>i.onchange=async()=>{ const {error}=await SB.from('membros').update({todas_contas:i.checked}).eq('email',i.dataset.mtodas); if(error) notificar('Não consegui salvar: '+error.message); else { notificar('Contas atualizadas.'); carregarMembros(); } });
  $('membrosBody').querySelectorAll('[data-mconta]').forEach(i=>i.onchange=async()=>{ const em=i.dataset.mconta; const marcadas=[...$('membrosBody').querySelectorAll(`[data-mconta="${CSS.escape(em)}"]:checked`)].map(x=>x.value);
    const {error}=await SB.from('membros').update({contas:marcadas}).eq('email',em); if(error) notificar('Não consegui salvar: '+error.message); else { notificar('Contas atualizadas.'); carregarMembros(); } }); }
$('formMembro').onsubmit=async e=>{ e.preventDefault(); const email=$('mEmail').value.trim().toLowerCase();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return notificar('Digite um e-mail válido.');
  const {error}=await SB.from('membros').insert({email,admin:$('mAdmin').checked});
  if(error) return notificar(error.code==='23505'?'Esse e-mail já está liberado.':'Não consegui liberar: '+error.message);
  $('mEmail').value=''; $('mAdmin').checked=false; notificar(`Acesso liberado pra ${email}. Agora marque as contas que ela pode ver e avise pra clicar em "Primeiro acesso".`); abertos.add(email); carregarMembros(); };

conectarBanco(); // sessão salva: entra direto se já fez login antes
